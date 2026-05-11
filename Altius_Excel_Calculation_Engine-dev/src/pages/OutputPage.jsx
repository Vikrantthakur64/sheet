import { useState } from 'react'
import {
  computeTowerSchedule, computeTenancySchedule,
  computeRateCard, computeGBTRevenue, computeEnergyRevenue,
  computeLandLeaseReimbursement, computeTotalRevenue, computeWriteoffs,
  computeOpex, computeEBITDA,
  computeCapexSchedule, computePPESchedule,
  computeTradeReceivables, computeTradePayables, computeWorkingCapitalChange,
  computeIRR, buildChurnSeries,
} from '../utils/calculation'
import { buildNewTenanciesSeries } from './RevenuePage'

const DROPDOWN_DEFS = [
  { key: 'towerAdds',    label: 'New Tower Adds',     options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'Updated BP 25' }] },
  { key: 'dismantles',   label: 'Dismantles',          options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'Updated BP 25' }] },
  { key: 'newTenancies', label: 'New Tenancies',       options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'BP 25 Updated' }] },
  { key: 'churn',        label: 'Churn',               options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'BP 25 Updated' }] },
  { key: 'ipFeeEsc',     label: 'IP Fee Escalation',   options: [{ value: 'base', label: 'Base Case' }, { value: 'case2', label: 'Case 2' }] },
  { key: 'landLease',    label: 'Land Lease Recovery', options: [{ value: 'base', label: 'Base Case' }, { value: 'bp25', label: 'BP 25' }] },
]

const DEFAULT_SELECTIONS = {
  towerAdds: 1, dismantles: 1, newTenancies: 1, churn: 1,
  ipFeeEsc: 'base', landLease: 'base',
}

function extractSavedMetrics(out, yearLabels, config) {
  return {
    config,
    savedAt: new Date().toISOString(),
    yearLabels,
    irr:          out.equityIRR,
    totalRev:     out.totalRev,
    ebitda:       out.ebitdaResult.map((e) => e.ebitda),
    ebitdaPct:    out.ebitdaResult.map((e) => e.ebitdaPct),
    pat:          out.patArr,
    cashArr:      out.cashArr,
    gbtRev:       out.gbtRev.map((r) => r.totalRev),
    energyRev:    out.energyRev.map((r) => r.energyRevenue),
    llrRev:       out.llrRev,
    writeoffs:    out.writeoffs.map((w) => w.totalWriteoff),
    leaseRent:    out.opexResult.map((r) => r.leaseRent),
    energyExp:    out.opexResult.map((r) => r.energyExpense),
    rAndM:        out.opexResult.map((r) => r.rAndM),
    admin:        out.opexResult.map((r) => r.admin),
    salary:       out.opexResult.map((r) => r.salary),
    depreciation: out.ppeSched.map((r) => r.depreciation),
    shlFC:        out.shlSched.map((r) => r.financeCost),
    capexFC:      out.capexDebtSched.map((r) => r.financeCost),
    cfoArr:       out.cfoArr,
    cfInvArr:     out.cfInvArr,
    cfFinArr:     out.cfFinArr,
    divArr:       out.divArr,
    ppe:          out.bsArr.map((r) => r.ppe),
    bsRec:        out.bsArr.map((r) => r.receivables),
    totalAssets:  out.bsArr.map((r) => r.totalAssets),
    shlDebt:      out.bsArr.map((r) => r.shlDebt),
    capexDebt:    out.bsArr.map((r) => r.capexDebt),
    totalLiab:    out.bsArr.map((r) => r.totalLiabilities),
  }
}

function buildSeries(base, yoyPct, count) {
  const b = Number(base) || 0
  const r = (Number(yoyPct) || 0) / 100
  const arr = []
  let v = b
  for (let i = 0; i < count; i++) { arr.push(v); v *= (1 + r) }
  return arr
}

function padTo(arr, n) {
  const out  = [...(arr || [])]
  const last = out[out.length - 1] || 0
  while (out.length < n) out.push(last)
  return out.slice(0, n)
}

function computeFullOutput({
  savedRevenueForm, savedOpexForm, savedCapexForm,
  savedSHLForm, savedDebtINVIT, savedOtherAssump,
  yearLabels, count,
  allSeries, tenancyForm, revenueInputs, equityContribution,
  modelConfig = null,
}) {
  // ── Resolve tower / dismantle source based on model config ───────────────────
  const towerSrc = modelConfig
    ? (modelConfig.towerAdds === 2 ? allSeries.bp25_tower : allSeries.base_tower)
    : allSeries.sel_tower
  const dmSrc = modelConfig
    ? (modelConfig.dismantles === 2 ? allSeries.bp25_dm : allSeries.base_dm)
    : allSeries.sel_dm
  const towerAdds  = padTo(towerSrc, count)
  const dismantles = padTo(dmSrc,    count)

  const openingTowers   = Number(revenueInputs.openingTower)      || 0
  const openingExisting = Number(revenueInputs.existingTenancies) || 0

  // ── New tenancies — scenario aware ──────────────────────────────────────────
  let newTenancies
  if (modelConfig && tenancyForm) {
    const s   = modelConfig.newTenancies
    const cur = parseFloat(tenancyForm[`nt_curFY_${s}`]) || 0
    const nxt = parseFloat(tenancyForm[`nt_nextFY_${s}`]) || 0
    const yoy = (parseFloat(tenancyForm[`nt_yoy_${s}`]) || 0) / 100
    newTenancies = count <= 1 ? [cur] : [cur, nxt]
    for (let i = 2; i < count; i++) newTenancies.push(Math.round(newTenancies[i - 1] * (1 + yoy)))
  } else {
    newTenancies = buildNewTenanciesSeries(tenancyForm, count)
  }

  // ── Churn — scenario aware ──────────────────────────────────────────────────
  let churnRates
  if (modelConfig && tenancyForm) {
    const s = modelConfig.churn
    churnRates = buildChurnSeries(
      parseFloat(tenancyForm[`ch_curFY_${s}`]) || 0,
      parseFloat(tenancyForm[`ch_nextFY_${s}`]) || 0,
      parseFloat(tenancyForm[`ch_yoy_${s}`])    || 0,
      count,
    )
  } else {
    churnRates = tenancyForm
      ? buildChurnSeries(
          parseFloat(tenancyForm.ch_curFY_1) || 0,
          parseFloat(tenancyForm.ch_nextFY_1) || 0,
          parseFloat(tenancyForm.ch_yoy_1)    || 0,
          count,
        )
      : Array(count).fill(0)
  }

  const towerSched   = computeTowerSchedule(openingTowers, towerAdds, dismantles)
  const avgTowers    = towerSched.map((r) => r.average)
  const tenancySched = computeTenancySchedule(openingExisting, newTenancies, churnRates)
  const avgTenancies = tenancySched.map((r) => r.average)

  // ── IP Fee Escalation — scenario aware ──────────────────────────────────────
  let ipFeeEscArr
  if (modelConfig && tenancyForm) {
    const sc    = modelConfig.ipFeeEsc
    const curFY = (Number(tenancyForm[`ip_curFY_${sc}`])  || 0) / 100
    const nxtFY = (Number(tenancyForm[`ip_nextFY_${sc}`]) || 0) / 100
    ipFeeEscArr = [curFY, ...Array(Math.max(0, count - 1)).fill(nxtFY)]
  } else {
    ipFeeEscArr = Array(count).fill((Number(savedRevenueForm.ipFeeEscPct) || 0) / 100)
  }

  // ── Land Lease Recovery — scenario aware ────────────────────────────────────
  let landLeaseRecov
  if (modelConfig && tenancyForm) {
    const sc = modelConfig.landLease
    landLeaseRecov = Array.from({ length: count }, (_, i) =>
      (Number(tenancyForm[`ll_${sc}_${i}`]) || 0) / 100
    )
  } else {
    landLeaseRecov = Array(count).fill((Number(savedRevenueForm.landLeaseRecoveryPct) || 0) / 100)
  }

  // Revenue
  const energyMargins = Array(count).fill((Number(savedRevenueForm.energyMarginPct)   || 0) / 100)
  const ipWriteoff    = Array(count).fill((Number(savedRevenueForm.ipFeeWriteoffPct)  || 0) / 100)
  const enWriteoff    = Array(count).fill((Number(savedRevenueForm.energyWriteoffPct) || 0) / 100)

  const rateCard    = computeRateCard(Number(savedRevenueForm.baseRateExisting) || 0, Number(savedRevenueForm.baseRateNew) || 0, ipFeeEscArr)
  const gbtRev      = computeGBTRevenue(tenancySched, rateCard)
  const energyCosts = buildSeries(savedOpexForm.energyBase, savedOpexForm.energyYoy, count)
  const energyRev   = computeEnergyRevenue(avgTenancies, energyCosts, energyMargins)
  const leaseRentArr = buildSeries(savedOpexForm.leaseRentBase, savedOpexForm.leaseRentYoy, count)
  const llrRev      = computeLandLeaseReimbursement(avgTowers, leaseRentArr, landLeaseRecov)
  const totalRev    = computeTotalRevenue(gbtRev, energyRev, llrRev)
  const writeoffs   = computeWriteoffs(gbtRev, energyRev, ipWriteoff, enWriteoff)

  // Opex
  const rAndMArr       = buildSeries(savedOpexForm.rAndMBase,     savedOpexForm.rAndMYoy,     count)
  const adminCostArr   = buildSeries(savedOpexForm.adminBase,     savedOpexForm.adminYoy,     count)
  const onRollArr      = buildSeries(savedOpexForm.onRollTotal,   savedOpexForm.onRollYoy,    count)
  const offRollArr     = buildSeries(savedOpexForm.offRollTotal,  savedOpexForm.offRollYoy,   count)
  const totalSalaryArr = onRollArr.map((v, i) => v + offRollArr[i])

  const opexResult  = computeOpex(avgTowers, avgTenancies, {
    leaseRentPerSite: leaseRentArr, energyChargesPerTenant: energyCosts,
    rAndMPerSite: rAndMArr, adminCost: adminCostArr, totalSalaryCost: totalSalaryArr,
  })
  const ebitdaResult = computeEBITDA(totalRev, opexResult, writeoffs)

  // Capex & PPE
  const capexPerSiteArr = buildSeries(savedCapexForm.capexBase,       savedCapexForm.capexYoy,       count)
  const maintArr        = buildSeries(savedCapexForm.maintenanceBase,  savedCapexForm.maintenanceYoy, count)
  const depRate         = (Number(savedCapexForm.depRate) || 0) / 100
  const capexSched      = computeCapexSchedule(towerAdds, capexPerSiteArr, maintArr, avgTowers)
  const ppeSched        = computePPESchedule(
    Number(savedCapexForm.openingGB)       || 0,
    Number(savedCapexForm.openingAccumDep) || 0,
    capexSched.map((c) => c.totalCapex),
    depRate,
  )

  // Working Capital
  const recDays  = Number(savedOtherAssump.receivableDays)    || 0
  const payDays  = Number(savedOtherAssump.payableDays)       || 0
  const openRec  = Number(savedOtherAssump.openingReceivables) || 0
  const openPay  = Number(savedOtherAssump.openingPayables)   || 0
  const receivables = computeTradeReceivables(totalRev, recDays)
  const payables    = computeTradePayables(opexResult, payDays)
  const wcChange    = computeWorkingCapitalChange(receivables, payables, openRec, openPay)

  // CFO (no debt involved here)
  const cfoArr = ebitdaResult.map((e, i) => e.ebitda + (wcChange[i] || 0))

  // Debt constants
  const shlRate          = (Number(savedSHLForm.intRate)          || 0) / 100
  const shlAdditionsArr  = buildSeries(savedSHLForm.additionBase, savedSHLForm.additionYoy, count)
  const shlRepYr1        = Number(savedSHLForm.repaymentYr1)      || 0
  const capexDebtRate    = (Number(savedDebtINVIT.capexIntRate)   || 0) / 100
  const capexRepayPct    = (Number(savedDebtINVIT.repaymentPct)   || 0) / 100

  let shlOpening      = Number(savedSHLForm.openingBalance)    || 0
  let capexDebtOpenBal = Number(savedDebtINVIT.capexDebtOpening) || 0
  const minCash       = Number(savedOtherAssump.minCash)        || 0
  let cash            = Number(savedOtherAssump.openingCash)    || 0
  const shareCapital  = Number(savedOtherAssump.shareCapital)   || 0
  const deposits      = Number(savedOtherAssump.deposits)       || 0
  let bsRetained      = Number(savedOtherAssump.openingRetained) || 0

  const shlSched      = []
  const capexDebtSched = []
  const patArr        = []
  const cashArr       = []
  const divArr        = []
  const cfOpsArr      = []
  const cfInvArr      = []
  const cfFinArr      = []
  const bsArr         = []

  for (let i = 0; i < count; i++) {
    // ── Capex Debt ────────────────────────────────────────────────────────────
    const capexAdd  = capexSched[i].totalCapex
    const capexRep  = capexDebtOpenBal * capexRepayPct + capexAdd * capexRepayPct * 0.5
    const capexClose = Math.max(0, capexDebtOpenBal + capexAdd - capexRep)
    const capexFC   = (capexDebtOpenBal + capexClose) / 2 * capexDebtRate
    capexDebtSched.push({ opening: capexDebtOpenBal, additions: capexAdd, repayments: capexRep, closing: capexClose, financeCost: capexFC })
    capexDebtOpenBal = capexClose

    // ── SHL Repayment ─────────────────────────────────────────────────────────
    let shlRep
    if (i === 0) {
      shlRep = shlRepYr1
    } else {
      const prevCash    = cashArr[i - 1]
      const excessCash  = Math.max(0, prevCash - minCash)
      const prevPAT     = patArr[i - 1]
      const dividend    = Math.max(0, prevPAT)
      shlRep = Math.max(0, cfoArr[i] - dividend + excessCash)
    }

    // ── SHL Schedule ──────────────────────────────────────────────────────────
    const shlAdd   = shlAdditionsArr[i] || 0
    const shlClose = Math.max(0, shlOpening + shlAdd - shlRep)
    const shlFC    = (shlOpening + shlClose) / 2 * shlRate
    shlSched.push({ opening: shlOpening, additions: shlAdd, repayments: shlRep, closing: shlClose, financeCost: shlFC })
    shlOpening = shlClose

    // ── P&L ───────────────────────────────────────────────────────────────────
    const pbt = ebitdaResult[i].ebitda - ppeSched[i].depreciation - shlFC - capexFC
    const pat = pbt  // tax = 0
    patArr.push(pat)

    // ── Cash Flow ─────────────────────────────────────────────────────────────
    const dividend = i === 0 ? 0 : Math.max(0, patArr[i - 1])
    divArr.push(dividend)
    const cfOps = cfoArr[i]
    const cfInv = -capexSched[i].totalCapex
    const cfFin = shlAdd - shlRep - shlFC + capexAdd - capexRep - capexFC
    cfOpsArr.push(cfOps)
    cfInvArr.push(cfInv)
    cfFinArr.push(cfFin)

    const netCF = cfOps + cfInv + cfFin
    cash = Math.max(minCash, cash + netCF - dividend)
    cashArr.push(cash)

    // ── Balance Sheet ─────────────────────────────────────────────────────────
    bsRetained += pat
    const ppe        = ppeSched[i].netBlock
    const rec        = receivables[i]
    const pay        = payables[i]
    const totalAssets = ppe + rec + deposits + cash
    const totalLiab  = shareCapital + bsRetained + shlClose + capexClose + pay
    bsArr.push({ ppe, receivables: rec, deposits, cash, totalAssets, shareCapital, retainedEarnings: bsRetained, shlDebt: shlClose, capexDebt: capexClose, payables: pay, totalLiabilities: totalLiab, check: totalAssets - totalLiab })
  }

  // ── Equity IRR ────────────────────────────────────────────────────────────
  const equityCFs = shlSched.map((shl, i) =>
    shl.financeCost + shl.repayments + divArr[i]
    - capexDebtSched[i].financeCost - capexDebtSched[i].repayments
  )
  const irrCFs   = [-(Number(equityContribution) || 0), ...equityCFs]
  const equityIRR = computeIRR(irrCFs)

  return {
    towerSched, tenancySched,
    gbtRev, energyRev, llrRev, totalRev, writeoffs,
    opexResult, ebitdaResult,
    capexSched, ppeSched,
    receivables, payables, wcChange,
    cfoArr, cfInvArr, cfFinArr,
    shlSched, capexDebtSched,
    patArr, cashArr, divArr,
    bsArr,
    equityCFs, equityIRR,
  }
}

// ─── Shared table helpers ────────────────────────────────────────────────────

const thCls     = `border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap text-center`
const tdLbl     = `border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
const tdLblSub  = `border border-slate-200 px-3 py-1.5 text-xs font-normal text-slate-400 italic bg-slate-50 whitespace-nowrap sticky left-0 z-10 pl-6`
const tdLblBold = `border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 whitespace-nowrap sticky left-0 z-10`
const tdNum     = `border border-slate-200 px-3 py-1.5 text-xs text-right tabular-nums font-medium text-slate-700`
const tdNumBold = `border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 text-right tabular-nums`
const tdNumGreen = `border border-slate-200 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 text-right tabular-nums`

function SepRow({ cols }) {
  return <tr><td colSpan={cols + 1} className="border-t-2 border-slate-300 p-0 h-0" /></tr>
}


function TableBlock({ title, headerColor = 'bg-[#b8d4ea]', yearLabels, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className={`${headerColor} px-4 py-2 border-b border-slate-300`}>
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
          <thead>
            <tr>
              <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 240 }}>Line Item</th>
              {yearLabels.map((lbl) => <th key={lbl} className={thCls} style={{ minWidth: 110 }}>{lbl}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ label, data, fmt, bold, sub, green }) {
  const cls = green ? tdNumGreen : bold ? tdNumBold : tdNum
  const lblCls = sub ? tdLblSub : bold ? tdLblBold : tdLbl
  return (
    <tr className={bold || green ? '' : 'bg-white hover:bg-slate-50'}>
      <td className={lblCls}>{label}</td>
      {data.map((v, i) => <td key={i} className={cls}>{fmt(v)}</td>)}
    </tr>
  )
}

export default function OutputPage({
  savedRevenueForm, savedOpexForm, savedCapexForm,
  savedSHLForm, savedDebtINVIT, savedOtherAssump,
  yearLabels, count, allSeries, tenancyForm, revenueInputs,
  equityContribution,
  onSaveModel1 = null, onSaveModel2 = null,
}) {
  const [selections, setSelections] = useState({ ...DEFAULT_SELECTIONS })
  const [lastSaved,  setLastSaved]  = useState(null)

  function handleChange(key, rawValue) {
    const value = (rawValue === '1' || rawValue === '2') ? Number(rawValue) : rawValue
    setSelections((prev) => ({ ...prev, [key]: value }))
  }

  const allReady = savedRevenueForm && savedOpexForm && savedCapexForm &&
                   savedSHLForm && savedDebtINVIT && savedOtherAssump

  if (!allReady) {
    const missing = []
    if (!savedRevenueForm) missing.push('Revenue (click Show Projection)')
    if (!savedOpexForm)    missing.push('Opex (click Show Opex Projection)')
    if (!savedCapexForm)   missing.push('Capex & PPE (click Show Capex & PPE Projection)')
    if (!savedSHLForm)     missing.push('Debt — SHL (click Show Debt SHL Projection)')
    if (!savedDebtINVIT)   missing.push('Debt — INVIT (click Show Debt INVIT Projection)')
    if (!savedOtherAssump) missing.push('Other Assumptions (click Save Assumptions)')

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center space-y-4">
        <div className="text-4xl">📊</div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Complete All Sections First</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The Output page requires all sections to be filled and submitted. The following are still pending:
        </p>
        <ul className="text-xs text-red-600 space-y-1 text-left inline-block">
          {missing.map((m) => <li key={m} className="flex items-center gap-2"><span className="text-red-400">•</span>{m}</li>)}
        </ul>
      </div>
    )
  }

  const fmt    = (n) => Number.isFinite(n) ? Math.round(n).toLocaleString() : '—'
  const fmtPct = (n) => Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '—'
  const fmtIRR = (n) => n != null && Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : 'N/A'
  const n = yearLabels.length

  function handleSave(modelNum) {
    const data = extractSavedMetrics(out, yearLabels, selections)
    if (modelNum === 1 && onSaveModel1) onSaveModel1(data)
    if (modelNum === 2 && onSaveModel2) onSaveModel2(data)
    setLastSaved(modelNum)
    setTimeout(() => setLastSaved(null), 2500)
  }

  const out = computeFullOutput({
    savedRevenueForm, savedOpexForm, savedCapexForm,
    savedSHLForm, savedDebtINVIT, savedOtherAssump,
    yearLabels, count, allSeries, tenancyForm, revenueInputs, equityContribution,
    modelConfig: selections,
  })

  return (
    <div className="space-y-6">

      {/* ── Scenario selector ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#b8d4ea] px-4 py-2 border-b border-slate-300 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
            Scenario Selection
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(1)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg
                          transition-colors focus:outline-none focus:ring-2 shadow-sm
                          ${lastSaved === 1
                            ? 'bg-emerald-600 text-white focus:ring-emerald-400'
                            : 'bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white focus:ring-blue-400'
                          }`}
            >
              {lastSaved === 1 ? '✓ Saved M1' : 'Save as Model 1'}
            </button>
            <button
              onClick={() => handleSave(2)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg
                          transition-colors focus:outline-none focus:ring-2 shadow-sm
                          ${lastSaved === 2
                            ? 'bg-emerald-600 text-white focus:ring-emerald-400'
                            : 'bg-slate-600 hover:bg-slate-700 text-white focus:ring-slate-400'
                          }`}
            >
              {lastSaved === 2 ? '✓ Saved M2' : 'Save as Model 2'}
            </button>
          </div>
        </div>
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {DROPDOWN_DEFS.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                {d.label}
              </label>
              <div className="relative">
                <select
                  value={selections[d.key]}
                  onChange={(e) => handleChange(d.key, e.target.value)}
                  className="w-full appearance-none px-2 py-1.5 pr-6 text-[11px] font-semibold rounded-lg
                             border border-blue-300 bg-[#dbeeff] text-blue-800
                             focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {d.options.map((o) => (
                    <option key={String(o.value)} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-blue-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Header ── */}
      <div className="bg-[#0d2045] rounded-xl px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-widest">Full Model Output</h2>
          <p className="text-blue-300 text-xs mt-0.5">P&amp;L · Balance Sheet · Cashflow · Equity IRR</p>
        </div>
        <div className="bg-emerald-600 rounded-lg px-4 py-2 text-center">
          <p className="text-[10px] text-emerald-200 uppercase tracking-wide font-semibold">Equity IRR</p>
          <p className="text-xl font-bold text-white">{fmtIRR(out.equityIRR)}</p>
        </div>
      </div>

      {/* ── P&L ── */}
      <TableBlock title="P&L — Profit & Loss (INR MM)" yearLabels={yearLabels}>
        <Row label="IP Fee Revenue"             data={out.gbtRev.map((r) => r.totalRev)}         fmt={fmt} />
        <Row label="Energy Revenue"             data={out.energyRev.map((r) => r.energyRevenue)} fmt={fmt} />
        <Row label="Land Lease Reimbursement"   data={out.llrRev}                                fmt={fmt} />
        <Row label="Total Revenue"              data={out.totalRev}                              fmt={fmt} bold />
        <SepRow cols={n} />
        <Row label="Write-offs"                 data={out.writeoffs.map((w) => -w.totalWriteoff)} fmt={fmt} />
        <SepRow cols={n} />
        <Row label="Lease Rent"                 data={out.opexResult.map((r) => -r.leaseRent)}   fmt={fmt} />
        <Row label="Energy Expense"             data={out.opexResult.map((r) => -r.energyExpense)} fmt={fmt} />
        <Row label="R&M"                        data={out.opexResult.map((r) => -r.rAndM)}       fmt={fmt} />
        <Row label="Admin Cost"                 data={out.opexResult.map((r) => -r.admin)}       fmt={fmt} />
        <Row label="Salary"                     data={out.opexResult.map((r) => -r.salary)}      fmt={fmt} />
        <Row label="EBITDA"                     data={out.ebitdaResult.map((e) => e.ebitda)}     fmt={fmt} bold />
        <Row label="EBITDA %"                   data={out.ebitdaResult.map((e) => e.ebitdaPct)}  fmt={fmtPct} bold />
        <SepRow cols={n} />
        <Row label="Depreciation"               data={out.ppeSched.map((r) => -r.depreciation)}  fmt={fmt} />
        <Row label="SHL Finance Cost"           data={out.shlSched.map((r) => -r.financeCost)}   fmt={fmt} />
        <Row label="Capex Debt Finance Cost"    data={out.capexDebtSched.map((r) => -r.financeCost)} fmt={fmt} />
        <Row label="PBT"                        data={out.patArr}                                fmt={fmt} bold />
        <Row label="PAT (Tax = 0)"              data={out.patArr}                                fmt={fmt} bold green />
      </TableBlock>

      {/* ── Cashflow ── */}
      <TableBlock title="Cashflow Statement (INR MM)" yearLabels={yearLabels} headerColor="bg-slate-200">
        <Row label="CFO — From Operations"      data={out.cfoArr}                                fmt={fmt} bold />
        <Row label="CFI — From Investing"       data={out.cfInvArr}                              fmt={fmt} />
        <Row label="CFF — From Financing"       data={out.cfFinArr}                              fmt={fmt} />
        <SepRow cols={n} />
        <Row label="Dividends Paid"             data={out.divArr.map((d) => -d)}                 fmt={fmt} />
        <Row label="Closing Cash"               data={out.cashArr}                               fmt={fmt} bold green />
      </TableBlock>

      {/* ── Debt Schedules ── */}
      <TableBlock title="SHL Debt Schedule (INR MM)" yearLabels={yearLabels} headerColor="bg-blue-100">
        <Row label="Opening"    data={out.shlSched.map((r) => r.opening)}     fmt={fmt} />
        <Row label="Addition"   data={out.shlSched.map((r) => r.additions)}   fmt={fmt} />
        <Row label="Repayment"  data={out.shlSched.map((r) => r.repayments)}  fmt={fmt} />
        <Row label="Closing"    data={out.shlSched.map((r) => r.closing)}     fmt={fmt} bold />
        <SepRow cols={n} />
        <Row label="Finance Cost" data={out.shlSched.map((r) => r.financeCost)} fmt={fmt} bold />
      </TableBlock>

      <TableBlock title="Capex Debt Schedule (INR MM)" yearLabels={yearLabels} headerColor="bg-orange-100">
        <Row label="Opening"    data={out.capexDebtSched.map((r) => r.opening)}     fmt={fmt} />
        <Row label="Addition"   data={out.capexDebtSched.map((r) => r.additions)}   fmt={fmt} />
        <Row label="Repayment"  data={out.capexDebtSched.map((r) => r.repayments)}  fmt={fmt} />
        <Row label="Closing"    data={out.capexDebtSched.map((r) => r.closing)}     fmt={fmt} bold />
        <SepRow cols={n} />
        <Row label="Finance Cost" data={out.capexDebtSched.map((r) => r.financeCost)} fmt={fmt} bold />
      </TableBlock>

      {/* ── Balance Sheet ── */}
      <TableBlock title="Balance Sheet (INR MM)" yearLabels={yearLabels} headerColor="bg-emerald-100">
        <Row label="Net PPE"              data={out.bsArr.map((r) => r.ppe)}              fmt={fmt} />
        <Row label="Trade Receivables"    data={out.bsArr.map((r) => r.receivables)}      fmt={fmt} />
        <Row label="Deposits"             data={out.bsArr.map((r) => r.deposits)}         fmt={fmt} />
        <Row label="Cash"                 data={out.bsArr.map((r) => r.cash)}             fmt={fmt} />
        <Row label="Total Assets"         data={out.bsArr.map((r) => r.totalAssets)}      fmt={fmt} bold />
        <SepRow cols={n} />
        <Row label="Share Capital"        data={out.bsArr.map((r) => r.shareCapital)}     fmt={fmt} />
        <Row label="Retained Earnings"    data={out.bsArr.map((r) => r.retainedEarnings)} fmt={fmt} />
        <Row label="SHL Debt"             data={out.bsArr.map((r) => r.shlDebt)}          fmt={fmt} />
        <Row label="Capex Debt"           data={out.bsArr.map((r) => r.capexDebt)}        fmt={fmt} />
        <Row label="Trade Payables"       data={out.bsArr.map((r) => r.payables)}         fmt={fmt} />
        <Row label="Total Liabilities"    data={out.bsArr.map((r) => r.totalLiabilities)} fmt={fmt} bold />
        <SepRow cols={n} />
        <Row label="Balance Check (=0)"   data={out.bsArr.map((r) => r.check)}            fmt={fmt} />
      </TableBlock>

      {/* ── Equity IRR ── */}
      <TableBlock title="Equity Cashflows & IRR" yearLabels={yearLabels} headerColor="bg-purple-100">
        <Row label="Equity Cashflows (to INVIT)" data={out.equityCFs}  fmt={fmt} bold green />
      </TableBlock>

      <div className="text-center text-xs text-slate-400 pb-4">
        All values in INR MM · Tax Rate = 0% · SHL repayments Yr 2+ derived from operating cashflows
      </div>
    </div>
  )
}
