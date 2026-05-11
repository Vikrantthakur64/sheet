import React, { useState, useMemo } from 'react'
import { buildNewTenanciesSeries } from '../../pages/RevenuePage'
import {
  computeTowerSchedule,
  computeTenancySchedule,
  buildChurnSeries,
} from '../../utils/calculation'

const TENANCY_RATIO_STATIC = [
  '1.34x', '1.34x', '1.34x', '1.34x',
  '1.35x', '1.35x', '1.35x', '1.36x',
]

const REVENUE_FIELDS = [
  { key: 'ipFeeRevenue',           label: 'IP Fee Revenue',             placeholder: 'e.g. 32.329' },
  { key: 'otherPassRevenue',       label: 'Other Pass Through Revenue', placeholder: 'e.g. 15.360' },
  { key: 'landLeaseReimbursement', label: 'Land Lease Reimbursement',   placeholder: 'e.g. 8.500'  },
]

const EXPENSE_FIELDS = [
  { key: 'repairsMaintenance',  label: '(-) Repairs & Maintenance',        placeholder: 'e.g. 5.200' },
  { key: 'salariesSGA',         label: '(-) Salaries and SG&A',            placeholder: 'e.g. 4.800' },
  { key: 'leaseCost',           label: '(-) Lease Cost',                   placeholder: 'e.g. 3.100' },
  { key: 'writeOffReceivables', label: '(-) Write-off of Receivables',     placeholder: 'e.g. 1.200' },
  { key: 'energyPassThrough',   label: '(-) Energy Pass Through Expenses', placeholder: 'e.g. 6.500' },
]

// Finance Cost removed from required validation — optional
const PBT_FIELDS = [
  { key: 'depreciation', label: '(-) Depreciation', placeholder: 'e.g. 3.500' },
  { key: 'financeCost',  label: '(-) Finance Cost',  placeholder: 'e.g. 2.100', optional: true },
]

const PAT_FIELDS = [
  { key: 'tax', label: '(-) Tax', placeholder: 'e.g. 1.800' },
]

const BS_FIELDS = [
  { key: 'bsEquity',        label: 'Equity',                        placeholder: 'e.g. 79.000' },
  { key: 'bsOtherEquity',   label: 'Other Equity',                  placeholder: 'e.g. 12.000' },
  { key: 'bsShlDebt',       label: 'SHL - Debt',                    placeholder: 'e.g. 45.000' },
  { key: 'bsTradePayables', label: 'Trade Payables',                placeholder: 'e.g. 8.500'  },
]

const BS_PPE_FIELDS = [
  { key: 'bsGrossBlock',       label: 'Gross Block',                  placeholder: 'e.g. 120.000' },
  { key: 'bsAccumDep',         label: '(-) Accumulated Depreciation', placeholder: 'e.g. 18.000'  },
]

const BS_ASSET_FIELDS = [
  { key: 'bsTradeReceivables', label: 'Trade Receivables',            placeholder: 'e.g. 14.000' },
  { key: 'bsDeposits',         label: 'Other Assets - Deposits',      placeholder: 'e.g. 5.000'  },
  { key: 'bsCash',             label: 'Cash & Cash Equivalents',      placeholder: 'e.g. 9.000'  },
]

const DEFAULT_PL = {
  ipFeeRevenue: '', otherPassRevenue: '', landLeaseReimbursement: '',
  repairsMaintenance: '', salariesSGA: '', leaseCost: '',
  writeOffReceivables: '', energyPassThrough: '',
  depreciation: '', financeCost: '', tax: '',
  bsEquity: '', bsOtherEquity: '', bsShlDebt: '', bsTradePayables: '',
  bsGrossBlock: '', bsAccumDep: '',
  bsTradeReceivables: '', bsDeposits: '', bsCash: '',
}

export default function PLScreen({
  yearLabels      = [],
  revenueInputs   = {},
  tenancyForm     = null,
  allSeries       = {},
  plInputs        = DEFAULT_PL,
  onPLInputChange = () => {},
  calculateLabel  = 'Show P&L',
}) {
  const count = yearLabels.length
  const [showTable,  setShowTable]  = useState(false)
  const [showOutput, setShowOutput] = useState(false)   // true = output page, false = input page
  const [errors,     setErrors]     = useState({})

  // ── Schedules ─────────────────────────────────────────────────────────────
  const tenancySchedule = useMemo(() => {
    const existing = Number(revenueInputs.existingTenancies) || 0
    if (!existing || !tenancyForm) return []
    const newT       = buildNewTenanciesSeries(tenancyForm, count)
    const churnRates = buildChurnSeries(
      parseFloat(tenancyForm.ch_curFY_1)  || 0,
      parseFloat(tenancyForm.ch_nextFY_1) || 0,
      parseFloat(tenancyForm.ch_yoy_1)    || 0,
      count,
    )
    return computeTenancySchedule(existing, newT, churnRates)
  }, [revenueInputs.existingTenancies, tenancyForm, count])

  const towerSchedule = useMemo(() => {
    const opening = Number(revenueInputs.openingTower) || 0
    const adds    = allSeries.sel_tower || []
    const dms     = allSeries.sel_dm    || []
    if (!opening || !adds.length) return []
    return computeTowerSchedule(opening, adds, dms)
  }, [revenueInputs.openingTower, allSeries.sel_tower, allSeries.sel_dm])

  // ── Grow seed along a schedule ────────────────────────────────────────────
  function growFromSeed(seed, schedule) {
    return yearLabels.map((_, i) => {
      if (i === 0) return seed
      let val = seed
      for (let j = 1; j <= i; j++) {
        const prev = schedule[j - 1]?.average || 0
        const curr = schedule[j]?.average     || 0
        if (!prev) return null
        val = val * (curr / prev)
      }
      return val
    })
  }

  // ── Revenue ───────────────────────────────────────────────────────────────
  const tenancyRatioData = yearLabels.map((_, i) => TENANCY_RATIO_STATIC[i] ?? '—')

  const ipFeeRevenueData = useMemo(() => {
    const s = parseFloat(plInputs.ipFeeRevenue)
    return isNaN(s) ? yearLabels.map(() => null) : growFromSeed(s, tenancySchedule)
  }, [yearLabels, plInputs.ipFeeRevenue, tenancySchedule])

  const otherPassRevenueData = useMemo(() => {
    const s = parseFloat(plInputs.otherPassRevenue)
    return isNaN(s) ? yearLabels.map(() => null) : growFromSeed(s, tenancySchedule)
  }, [yearLabels, plInputs.otherPassRevenue, tenancySchedule])

  const landLeaseData = useMemo(() => {
    const s = parseFloat(plInputs.landLeaseReimbursement)
    return isNaN(s) ? yearLabels.map(() => null) : growFromSeed(s, towerSchedule)
  }, [yearLabels, plInputs.landLeaseReimbursement, towerSchedule])

  const totalRevenueData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(ipFeeRevenueData[i]) || 0) +
      (Number(otherPassRevenueData[i]) || 0) -
      (Number(landLeaseData[i]) || 0)
    ),
  [yearLabels, ipFeeRevenueData, otherPassRevenueData, landLeaseData])

  // ── Expenses ──────────────────────────────────────────────────────────────
  function useExpenseSeries(key) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useMemo(() => {
      const s = parseFloat(plInputs[key])
      return isNaN(s) ? yearLabels.map(() => null) : growFromSeed(s, tenancySchedule)
    }, [plInputs[key], tenancySchedule, yearLabels])
  }

  const repairsData    = useExpenseSeries('repairsMaintenance')
  const salariesData   = useExpenseSeries('salariesSGA')
  const leaseCostData  = useExpenseSeries('leaseCost')
  const writeOffData   = useExpenseSeries('writeOffReceivables')
  const energyPassData = useExpenseSeries('energyPassThrough')

  // ── EBITDA ────────────────────────────────────────────────────────────────
  const ebitdaData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(totalRevenueData[i]) || 0) -
      (Number(repairsData[i])      || 0) -
      (Number(salariesData[i])     || 0) -
      (Number(leaseCostData[i])    || 0) -
      (Number(writeOffData[i])     || 0) -
      (Number(energyPassData[i])   || 0)
    ),
  [yearLabels, totalRevenueData, repairsData, salariesData, leaseCostData, writeOffData, energyPassData])

  const ebitdaPctData = useMemo(() =>
    yearLabels.map((_, i) => {
      const rev = Number(totalRevenueData[i]) || 0
      if (!rev) return null
      return (Number(ebitdaData[i]) / rev) * 100
    }),
  [yearLabels, ebitdaData, totalRevenueData])

  // ── PBT ───────────────────────────────────────────────────────────────────
  const depreciationData = useExpenseSeries('depreciation')
  const financeCostData  = useExpenseSeries('financeCost')

  const pbtData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(ebitdaData[i])       || 0) -
      (Number(depreciationData[i]) || 0) -
      (Number(financeCostData[i])  || 0)
    ),
  [yearLabels, ebitdaData, depreciationData, financeCostData])

  // ── PAT ───────────────────────────────────────────────────────────────────
  const taxData = useExpenseSeries('tax')

  const patData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(pbtData[i]) || 0) - (Number(taxData[i]) || 0)
    ),
  [yearLabels, pbtData, taxData])

  // Cash EBITDA % = PAT / Total Revenue × 100
  const cashEbitdaPctData = useMemo(() =>
    yearLabels.map((_, i) => {
      const rev = Number(totalRevenueData[i]) || 0
      if (!rev) return null
      return (Number(patData[i]) / rev) * 100
    }),
  [yearLabels, patData, totalRevenueData])

  // ── Balance Sheet series (each grows with tenancy schedule) ───────────────
  const bsEquityData        = useExpenseSeries('bsEquity')
  const bsOtherEquityData   = useExpenseSeries('bsOtherEquity')
  const bsShlDebtData       = useExpenseSeries('bsShlDebt')
  const bsTradePayablesData = useExpenseSeries('bsTradePayables')

  const totalEquityDebtData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(bsEquityData[i])        || 0) +
      (Number(bsOtherEquityData[i])   || 0) +
      (Number(bsShlDebtData[i])       || 0) +
      (Number(bsTradePayablesData[i]) || 0)
    ),
  [yearLabels, bsEquityData, bsOtherEquityData, bsShlDebtData, bsTradePayablesData])

  // PPE = Gross Block - Accumulated Depreciation
  const bsGrossBlockData = useExpenseSeries('bsGrossBlock')
  const bsAccumDepData   = useExpenseSeries('bsAccumDep')
  const ppeData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(bsGrossBlockData[i]) || 0) - (Number(bsAccumDepData[i]) || 0)
    ),
  [yearLabels, bsGrossBlockData, bsAccumDepData])

  // Asset rows
  const bsTradeRecData = useExpenseSeries('bsTradeReceivables')
  const bsDepositsData = useExpenseSeries('bsDeposits')
  const bsCashData     = useExpenseSeries('bsCash')

  // Total Assets = PPE + Trade Receivables + Deposits + Cash
  const totalAssetsData = useMemo(() =>
    yearLabels.map((_, i) =>
      (Number(ppeData[i])          || 0) +
      (Number(bsTradeRecData[i])   || 0) +
      (Number(bsDepositsData[i])   || 0) +
      (Number(bsCashData[i])       || 0)
    ),
  [yearLabels, ppeData, bsTradeRecData, bsDepositsData, bsCashData])

  // ── Validation (finance cost is optional) ────────────────────────────────
  const REQUIRED_KEYS = [
    ...REVENUE_FIELDS.map((f) => f.key),
    ...EXPENSE_FIELDS.map((f) => f.key),
    'depreciation', 'tax',
    ...BS_FIELDS.map((f) => f.key),
    ...BS_PPE_FIELDS.map((f) => f.key),
    ...BS_ASSET_FIELDS.map((f) => f.key),
    // financeCost intentionally excluded
  ]

  function handleShow() {
    const errs = {}
    REQUIRED_KEYS.forEach((k) => {
      if (!plInputs[k] || isNaN(Number(plInputs[k]))) errs[k] = true
    })
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setShowTable(true)
    setShowOutput(true)
  }

  function handleBack() {
    setShowOutput(false)
  }

  function handleChange(field, val) {
    onPLInputChange(field, val)
    if (errors[field]) setErrors((p) => { const n = { ...p }; delete n[field]; return n })
    setShowTable(false)
    setShowOutput(false)
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputCls = (err) =>
    `border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 w-full font-semibold
     ${err
       ? 'bg-red-50 border-red-400 text-red-900 focus:ring-red-400'
       : 'bg-[#dbeeff] border-blue-300 text-blue-900 focus:ring-blue-500'
     }`

  const thCls   = `border border-slate-300 px-3 py-2.5 text-xs font-semibold text-slate-600
                   bg-slate-50 whitespace-nowrap text-center`
  const tdLbl   = `border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700
                   bg-slate-50 whitespace-nowrap sticky left-0 z-10`
  const tdUnit  = `border border-slate-200 px-3 py-2.5 text-[10px] italic text-slate-400
                   bg-slate-50 whitespace-nowrap text-center`
  const tdNum   = `border border-slate-200 px-3 py-2.5 text-xs text-right tabular-nums font-medium`
  const tdRatio = `border border-slate-200 px-3 py-2.5 text-xs text-center tabular-nums font-semibold text-slate-700`

  function fmtNum(v) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
    return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  function fmtPct(v) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return '—'
    return `${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  }

  // ── Sub-components ────────────────────────────────────────────────────────
  function SectionDivRow({ num, label, color }) {
    return (
      <tr>
        <td colSpan={yearLabels.length + 2} className={`${color} px-4 py-1.5 border-y border-slate-200`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">{num} · {label}</span>
        </td>
      </tr>
    )
  }

  function SummaryRow({ label, data, accent = 'text-white', unit = 'INR MM' }) {
    return (
      <tr className="bg-[#0d2045]">
        <td className="border border-slate-600 px-4 py-2.5 text-xs font-bold text-white
                       whitespace-nowrap sticky left-0 z-10 bg-[#0d2045]">{label}</td>
        <td className="border border-slate-600 px-3 py-2.5 text-[10px] italic text-blue-300
                       text-center whitespace-nowrap bg-[#0d2045]">{unit}</td>
        {yearLabels.map((_, i) => (
          <td key={i} className={`border border-slate-600 px-3 py-2.5 text-xs text-right
                                  tabular-nums font-bold bg-[#0d2045] ${accent}`}>
            {fmtNum(data[i])}
          </td>
        ))}
      </tr>
    )
  }

  function PctRow({ label, data, color = 'text-emerald-600' }) {
    return (
      <tr className="hover:bg-slate-50 transition-colors">
        <td className={`${tdLbl} italic`}>{label}</td>
        <td className={tdUnit}>%</td>
        {yearLabels.map((_, i) => (
          <td key={i} className={`${tdNum} ${color} font-semibold italic`}>{fmtPct(data[i])}</td>
        ))}
      </tr>
    )
  }

  function ExpenseRow({ label, data }) {
    return (
      <tr className="hover:bg-slate-50 transition-colors">
        <td className={tdLbl}>{label}</td>
        <td className={tdUnit}>INR MM</td>
        {yearLabels.map((_, i) => (
          <td key={i} className={`${tdNum} text-rose-600 font-semibold`}>{fmtNum(data[i])}</td>
        ))}
      </tr>
    )
  }

  // ── Input field renderer ──────────────────────────────────────────────────
  function InputField({ fieldKey, label, placeholder, optional = false }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-600 font-medium">
          {label}
          <span className="text-slate-400 font-normal ml-1">(INR MM)</span>
          {optional
            ? <span className="text-slate-400 font-normal ml-1 text-[10px]">(optional)</span>
            : <span className="text-red-500 ml-0.5">*</span>
          }
        </label>
        <input
          type="number"
          value={plInputs[fieldKey] ?? ''}
          placeholder={placeholder}
          onChange={(e) => handleChange(fieldKey, e.target.value)}
          className={inputCls(errors[fieldKey])}
          aria-invalid={!!errors[fieldKey]}
        />
        {errors[fieldKey] && <span className="text-[10px] text-red-500">Required</span>}
      </div>
    )
  }

  // ── Output page JSX (extracted to avoid duplication) ─────────────────────
  const outputPage = (
    <>
      {/* Back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600
                     hover:text-[#1e3a5f] transition-colors focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Inputs
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-400">P&amp;L &amp; Balance Sheet — {count} yr projection</span>
      </div>

      {/* P&L Output table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#b8d4ea] px-4 py-2.5 border-b border-slate-200">
          <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">P&amp;L Output</span>
          <span className="ml-3 text-[10px] text-[#1e3a5f]/60 italic">INR MM</span>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 280 }}>Row Name</th>
                <th className={thCls} style={{ minWidth: 72 }}>Unit</th>
                {yearLabels.map((lbl) => <th key={lbl} className={thCls} style={{ minWidth: 100 }}>{lbl}</th>)}
              </tr>
            </thead>
            <tbody>
              <SectionDivRow num="1" label="Tenancy Ratio" color="bg-[#e8f0f8] text-[#1e3a5f]" />
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Tenancy Ratio</td><td className={tdUnit}>x</td>
                {yearLabels.map((_, i) => <td key={i} className={tdRatio}>{tenancyRatioData[i] ?? '—'}</td>)}
              </tr>
              <SectionDivRow num="2" label="IP Fee Revenue" color="bg-[#eef0fb] text-indigo-700" />
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>IP Fee Revenue</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-blue-700 font-semibold`}>{fmtNum(ipFeeRevenueData[i])}</td>)}
              </tr>
              <SectionDivRow num="3" label="Other Pass Through Revenue" color="bg-[#edfaf4] text-emerald-700" />
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Other Pass Through Revenue</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-emerald-700 font-semibold`}>{fmtNum(otherPassRevenueData[i])}</td>)}
              </tr>
              <SectionDivRow num="4" label="Land Lease Reimbursement" color="bg-[#fef9ec] text-amber-700" />
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Land Lease Reimbursement</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-amber-700 font-semibold`}>{fmtNum(landLeaseData[i])}</td>)}
              </tr>
              <SummaryRow label="Total Revenue" data={totalRevenueData} />
              <SectionDivRow num="5" label="Expenses" color="bg-rose-50 text-rose-700" />
              <ExpenseRow label="(-) Repairs & Maintenance"        data={repairsData}    />
              <ExpenseRow label="(-) Salaries and SG&A"            data={salariesData}   />
              <ExpenseRow label="(-) Lease Cost"                   data={leaseCostData}  />
              <ExpenseRow label="(-) Write-off of Receivables"     data={writeOffData}   />
              <ExpenseRow label="(-) Energy Pass Through Expenses" data={energyPassData} />
              <SummaryRow label="EBITDA" data={ebitdaData} accent="text-emerald-300" />
              <PctRow label="EBITDA %" data={ebitdaPctData} color="text-emerald-600" />
              <SectionDivRow num="6" label="Depreciation &amp; Finance Cost" color="bg-slate-100 text-slate-600" />
              <ExpenseRow label="(-) Depreciation" data={depreciationData} />
              <ExpenseRow label="(-) Finance Cost"  data={financeCostData}  />
              <SummaryRow label="PBT" data={pbtData} accent="text-yellow-300" />
              <SectionDivRow num="7" label="Tax" color="bg-slate-100 text-slate-600" />
              <ExpenseRow label="(-) Tax" data={taxData} />
              <SummaryRow label="PAT" data={patData} accent="text-sky-300" />
              <PctRow label="Cash EBITDA %" data={cashEbitdaPctData} color="text-sky-600" />
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Balance Sheet</h2>
            <p className="text-blue-300 text-xs mt-0.5">Assets, Liabilities &amp; Equity — year-by-year</p>
          </div>
          <span className="text-xs text-blue-300">{count} yr projection</span>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 280 }}>Row Name</th>
                <th className={thCls} style={{ minWidth: 72 }}>Unit</th>
                {yearLabels.map((lbl) => <th key={lbl} className={thCls} style={{ minWidth: 100 }}>{lbl}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={yearLabels.length + 2} className="bg-[#e8f0f8] px-4 py-1.5 border-y border-slate-200">
                  <span className="text-[10px] font-bold text-[#1e3a5f] uppercase tracking-widest">Equity &amp; Liabilities</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Equity</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-indigo-700 font-semibold`}>{fmtNum(bsEquityData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Other Equity</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-indigo-700 font-semibold`}>{fmtNum(bsOtherEquityData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>SHL - Debt</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-violet-700 font-semibold`}>{fmtNum(bsShlDebtData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Trade Payables</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-amber-700 font-semibold`}>{fmtNum(bsTradePayablesData[i])}</td>)}
              </tr>
              <SummaryRow label="Total Equity & Debt" data={totalEquityDebtData} accent="text-white" />
              <tr>
                <td colSpan={yearLabels.length + 2} className="bg-[#eef0fb] px-4 py-1.5 border-y border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Assets</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Gross Block</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-slate-700 font-semibold`}>{fmtNum(bsGrossBlockData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>(-) Accumulated Depreciation</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-rose-600 font-semibold`}>{fmtNum(bsAccumDepData[i])}</td>)}
              </tr>
              <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                <td className={`${tdLbl} font-bold text-slate-800`}>
                  PPE <span className="ml-1.5 text-[10px] font-normal text-slate-400 italic">= Gross Block − Accum. Dep.</span>
                </td>
                <td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-slate-800 font-bold`}>{fmtNum(ppeData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Trade Receivables</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-blue-700 font-semibold`}>{fmtNum(bsTradeRecData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Other Assets - Deposits</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-blue-700 font-semibold`}>{fmtNum(bsDepositsData[i])}</td>)}
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Cash &amp; Cash Equivalents</td><td className={tdUnit}>INR MM</td>
                {yearLabels.map((_, i) => <td key={i} className={`${tdNum} text-emerald-700 font-semibold`}>{fmtNum(bsCashData[i])}</td>)}
              </tr>
              <SummaryRow label="Total Assets" data={totalAssetsData} accent="text-sky-300" />
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  // ── Input page JSX ────────────────────────────────────────────────────────
  const inputPage = (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            P&amp;L — Profit &amp; Loss
          </h2>
          <p className="text-blue-300 text-xs mt-0.5">
            Enter Year 1 seed values for all rows, then click {calculateLabel}
          </p>
        </div>
        <span className="text-xs text-blue-300">{count} yr projection</span>
      </div>
      <div className="p-5 space-y-5">
        {/* File Name */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">File Name</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600 font-medium">
                File Name
                <span className="text-slate-400 font-normal ml-1">(identifier)</span>
              </label>
              <input
                type="text"
                value={plInputs.fileName ?? ''}
                placeholder="e.g. Output_FY26_BaseCase"
                onChange={(e) => handleChange('fileName', e.target.value)}
                className={inputCls(false).replace('text-sm', 'text-sm')}
              />
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Revenue Inputs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REVENUE_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Expense Inputs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPENSE_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Depreciation &amp; Finance Cost
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PBT_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tax</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAT_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Balance Sheet Inputs
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BS_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            PPE — Property, Plant &amp; Equipment
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BS_PPE_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="border-t border-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Asset Inputs</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BS_ASSET_FIELDS.map((f) => <InputField key={f.key} fieldKey={f.key} {...f} />)}
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleShow}
            className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white
                       text-xs font-semibold px-6 py-2.5 rounded-lg transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0
                   0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0
                   0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {calculateLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {showOutput && showTable ? outputPage : inputPage}
    </div>
  )
}

// ── Remove old duplicate output section that was below ──────────────────────
