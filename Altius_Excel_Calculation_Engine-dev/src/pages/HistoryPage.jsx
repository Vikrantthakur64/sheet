import { useState, useCallback } from 'react'

// ── Field definitions ─────────────────────────────────────────────────────────

const MODEL_INPUT_FIELDS = [
  { key: 'fileName',           label: 'File Name',            unit: '—'      },
  { key: 'yearStart',          label: 'Year Start',           unit: 'Year'   },
  { key: 'tenure',             label: 'Tenure',               unit: 'Years'  },
  { key: 'equityContribution', label: 'Equity Contribution',  unit: 'INR MM' },
]

const REVENUE_FIELDS = [
  { key: 'openingTower',          label: 'Opening Tower Count',          unit: '#'      },
  { key: 'existingTenancies',     label: 'Existing Tenancies',           unit: '#'      },
  { key: 'rateExistingTenancies', label: 'Rate — Existing Tenancies',    unit: 'INR/mo' },
  { key: 'rateNewSites',          label: 'Rate — New Sites',             unit: 'INR/mo' },
  { key: 'energyMargin',          label: 'Energy Margin',                unit: '%'      },
  { key: 'energyOtherFeeRate',    label: 'Energy Other Fee Rate',        unit: 'INR/mo' },
]

const PL_INPUT_FIELDS = [
  { key: 'fileName',               label: 'File Name',                       unit: '—'      },
  { key: 'ipFeeRevenue',           label: 'IP Fee Revenue',                  unit: 'INR MM' },
  { key: 'otherPassRevenue',       label: 'Other Pass Through Revenue',      unit: 'INR MM' },
  { key: 'landLeaseReimbursement', label: 'Land Lease Reimbursement',        unit: 'INR MM' },
  { key: 'repairsMaintenance',     label: '(-) Repairs & Maintenance',       unit: 'INR MM' },
  { key: 'salariesSGA',            label: '(-) Salaries and SG&A',           unit: 'INR MM' },
  { key: 'leaseCost',              label: '(-) Lease Cost',                  unit: 'INR MM' },
  { key: 'writeOffReceivables',    label: '(-) Write-off of Receivables',    unit: 'INR MM' },
  { key: 'energyPassThrough',      label: '(-) Energy Pass Through',         unit: 'INR MM' },
  { key: 'depreciation',           label: '(-) Depreciation',               unit: 'INR MM' },
  { key: 'financeCost',            label: '(-) Finance Cost',               unit: 'INR MM' },
  { key: 'tax',                    label: '(-) Tax',                        unit: 'INR MM' },
  { key: 'bsEquity',               label: 'BS — Equity',                    unit: 'INR MM' },
  { key: 'bsOtherEquity',          label: 'BS — Other Equity',              unit: 'INR MM' },
  { key: 'bsShlDebt',              label: 'BS — SHL Debt',                  unit: 'INR MM' },
  { key: 'bsTradePayables',        label: 'BS — Trade Payables',            unit: 'INR MM' },
  { key: 'bsGrossBlock',           label: 'BS — Gross Block',               unit: 'INR MM' },
  { key: 'bsAccumDep',             label: 'BS — Accumulated Depreciation',  unit: 'INR MM' },
  { key: 'bsTradeReceivables',     label: 'BS — Trade Receivables',         unit: 'INR MM' },
  { key: 'bsDeposits',             label: 'BS — Deposits / Other Assets',   unit: 'INR MM' },
  { key: 'bsCash',                 label: 'BS — Cash & Equivalents',        unit: 'INR MM' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return null
  try {
    return new Date(ts).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

function readLS(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ── Shared table component ────────────────────────────────────────────────────

function DataTable({ title, headerColor = 'bg-[#b8d4ea]', savedAt, fields, data, emptyMsg, onClear }) {
  const thCls = `border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap`
  const tdLbl = `border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600
                 bg-slate-50 whitespace-nowrap`
  const tdUnit = `border border-slate-200 px-3 py-2 text-[10px] italic text-slate-400
                  text-center whitespace-nowrap`
  const tdVal  = `border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800
                  tabular-nums`
  const tdEmpty = `border border-slate-200 px-4 py-2 text-xs italic text-slate-300`

  const hasData = data !== null && typeof data === 'object'

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className={`${headerColor} px-4 py-2.5 flex items-center justify-between border-b border-slate-200`}>
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[10px] text-[#1e3a5f]/60 italic">
              Last saved: {formatDate(savedAt) ?? savedAt}
            </span>
          )}
          {hasData && onClear && (
            <button
              onClick={onClear}
              className="text-[10px] font-semibold text-rose-600 hover:text-rose-800
                         px-2 py-0.5 rounded border border-rose-200 hover:border-rose-400
                         transition-colors focus:outline-none bg-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-slate-400 italic">{emptyMsg}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse w-full text-sm" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th className={`${thCls} text-left sticky left-0 z-10`} style={{ minWidth: 260 }}>Field</th>
                <th className={`${thCls} text-center`} style={{ minWidth: 80 }}>Unit</th>
                <th className={`${thCls} text-left`} style={{ minWidth: 200 }}>Saved Value</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const val = data[f.key]
                const isEmpty = val === '' || val === null || val === undefined
                return (
                  <tr key={f.key} className={i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                    <td className={`${tdLbl} sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {f.label}
                    </td>
                    <td className={tdUnit}>{f.unit}</td>
                    {isEmpty
                      ? <td className={tdEmpty}>—</td>
                      : <td className={tdVal}>{String(val)}</td>
                    }
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Scenario rows table ───────────────────────────────────────────────────────

function ScenarioTable({ title, headerColor, rows, savedAt, onClear }) {
  const thCls = `border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap text-center`
  const tdCls = `border border-slate-200 px-4 py-2 text-xs text-center tabular-nums text-slate-700`
  const tdLbl = `border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 bg-slate-50`

  const hasData = Array.isArray(rows) && rows.length > 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className={`${headerColor} px-4 py-2.5 flex items-center justify-between border-b border-slate-200`}>
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
        <div className="flex items-center gap-3">
          {savedAt && (
            <span className="text-[10px] text-[#1e3a5f]/60 italic">
              Last saved: {formatDate(savedAt) ?? savedAt}
            </span>
          )}
          {hasData && onClear && (
            <button
              onClick={onClear}
              className="text-[10px] font-semibold text-rose-600 hover:text-rose-800
                         px-2 py-0.5 rounded border border-rose-200 hover:border-rose-400
                         transition-colors focus:outline-none bg-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs text-slate-400 italic">No scenario data saved yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse w-full text-sm">
            <thead>
              <tr>
                <th className={`${thCls} text-left`} style={{ minWidth: 40 }}>#</th>
                <th className={`${thCls} text-left`} style={{ minWidth: 160 }}>Description</th>
                <th className={thCls} style={{ minWidth: 100 }}>YoY %</th>
                <th className={thCls} style={{ minWidth: 120 }}>Current FY</th>
                <th className={thCls} style={{ minWidth: 120 }}>Next FY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                  <td className={`${tdLbl} text-center`}>{r.modelScenario ?? i + 1}</td>
                  <td className={tdLbl}>{r.description ?? '—'}</td>
                  <td className={tdCls}>{r.pctIncrease !== '' && r.pctIncrease !== undefined ? `${r.pctIncrease}%` : '—'}</td>
                  <td className={tdCls}>{r.currentFinancialYear !== '' && r.currentFinancialYear !== undefined ? r.currentFinancialYear : '—'}</td>
                  <td className={tdCls}>{r.nextFinancialYear !== '' && r.nextFinancialYear !== undefined ? r.nextFinancialYear : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Comparison table helpers ──────────────────────────────────────────────────

const DROPDOWN_LABELS = {
  towerAdds:    { label: 'New Tower Adds',     1: 'Base Case',   2: 'Updated BP 25' },
  dismantles:   { label: 'Dismantles',          1: 'Base Case',   2: 'Updated BP 25' },
  newTenancies: { label: 'New Tenancies',       1: 'Base Case',   2: 'BP 25 Updated' },
  churn:        { label: 'Churn',               1: 'Base Case',   2: 'BP 25 Updated' },
  ipFeeEsc:     { label: 'IP Fee Escalation',   base: 'Base Case', case2: 'Case 2'   },
  landLease:    { label: 'Land Lease Recovery', base: 'Base Case', bp25: 'BP 25'     },
}

const thCmp  = `border border-slate-300 px-2 py-1.5 text-[10px] font-semibold whitespace-nowrap text-center`
const tdLblC = `border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
const tdLblCB = `border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 whitespace-nowrap sticky left-0 z-10`
const tdM1   = `border border-slate-200 px-2 py-1.5 text-xs text-right tabular-nums font-medium text-blue-700 bg-blue-50/40`
const tdM2   = `border border-slate-200 px-2 py-1.5 text-xs text-right tabular-nums font-medium text-slate-600 bg-slate-50`
const tdM1B  = `border border-slate-200 px-2 py-1.5 text-xs font-bold text-blue-800 bg-blue-100 text-right tabular-nums`
const tdM2B  = `border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 text-right tabular-nums`

function CSep({ cols }) {
  return <tr><td colSpan={cols * 2 + 1} className="border-t-2 border-slate-300 p-0 h-0" /></tr>
}

function CRow({ label, d1, d2, fmt, bold }) {
  const lbl = bold ? tdLblCB : tdLblC
  const c1  = bold ? tdM1B   : tdM1
  const c2  = bold ? tdM2B   : tdM2
  return (
    <tr className={bold ? '' : 'bg-white hover:bg-slate-50'}>
      <td className={lbl}>{label}</td>
      {(d1 || []).map((v, i) => <td key={`m1-${i}`} className={c1}>{fmt(v)}</td>)}
      {(d2 || []).map((v, i) => <td key={`m2-${i}`} className={c2}>{fmt(v)}</td>)}
    </tr>
  )
}

function ComparisonView({ model1, model2 }) {
  const fmt    = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '—')
  const fmtPct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '—')
  const fmtIRR = (n) => (n != null && Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : 'N/A')
  const yrs    = model1.yearLabels || []
  const n      = yrs.length

  return (
    <div className="space-y-4">
      {/* IRR summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-700 rounded-xl px-5 py-3 text-center">
          <p className="text-[10px] text-blue-200 uppercase tracking-wide font-semibold">Model 1 — Equity IRR</p>
          <p className="text-2xl font-bold text-white">{fmtIRR(model1.irr)}</p>
        </div>
        <div className="bg-slate-600 rounded-xl px-5 py-3 text-center">
          <p className="text-[10px] text-slate-300 uppercase tracking-wide font-semibold">Model 2 — Equity IRR</p>
          <p className="text-2xl font-bold text-white">{fmtIRR(model2.irr)}</p>
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Rev Yr1', v1: model1.totalRev?.[0],  v2: model2.totalRev?.[0],  fmt },
          { label: 'EBITDA Yr1',   v1: model1.ebitda?.[0],     v2: model2.ebitda?.[0],     fmt },
          { label: 'EBITDA % Yr1', v1: model1.ebitdaPct?.[0],  v2: model2.ebitdaPct?.[0],  fmt: fmtPct },
          { label: 'PAT Yr1',      v1: model1.pat?.[0],         v2: model2.pat?.[0],         fmt },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">{c.label}</p>
            <div className="flex items-end gap-3">
              <div><p className="text-[9px] text-blue-500 font-bold uppercase">M1</p><p className="text-sm font-bold text-blue-700">{c.fmt(c.v1)}</p></div>
              <div><p className="text-[9px] text-slate-400 font-bold uppercase">M2</p><p className="text-sm font-bold text-slate-600">{c.fmt(c.v2)}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* P&L comparison */}
      {[
        {
          title: 'P&L — Profit & Loss (INR MM)',
          rows: [
            { label: 'IP Fee Revenue',           d1: model1.gbtRev,           d2: model2.gbtRev },
            { label: 'Energy Revenue',           d1: model1.energyRev,        d2: model2.energyRev },
            { label: 'Land Lease Reimbursement', d1: model1.llrRev,           d2: model2.llrRev },
            { label: 'Total Revenue',            d1: model1.totalRev,         d2: model2.totalRev, bold: true },
            null,
            { label: 'Write-offs',               d1: model1.writeoffs?.map((v) => -v), d2: model2.writeoffs?.map((v) => -v) },
            null,
            { label: 'Lease Rent',               d1: model1.leaseRent?.map((v) => -v), d2: model2.leaseRent?.map((v) => -v) },
            { label: 'Energy Expense',           d1: model1.energyExp?.map((v) => -v), d2: model2.energyExp?.map((v) => -v) },
            { label: 'R&M',                      d1: model1.rAndM?.map((v) => -v),     d2: model2.rAndM?.map((v) => -v) },
            { label: 'Admin Cost',               d1: model1.admin?.map((v) => -v),     d2: model2.admin?.map((v) => -v) },
            { label: 'Salary',                   d1: model1.salary?.map((v) => -v),    d2: model2.salary?.map((v) => -v) },
            { label: 'EBITDA',                   d1: model1.ebitda,           d2: model2.ebitda,  bold: true },
            { label: 'EBITDA %',                 d1: model1.ebitdaPct,        d2: model2.ebitdaPct, bold: true, pct: true },
            null,
            { label: 'Depreciation',             d1: model1.depreciation?.map((v) => -v), d2: model2.depreciation?.map((v) => -v) },
            { label: 'SHL Finance Cost',         d1: model1.shlFC?.map((v) => -v),         d2: model2.shlFC?.map((v) => -v) },
            { label: 'Capex Debt Finance Cost',  d1: model1.capexFC?.map((v) => -v),       d2: model2.capexFC?.map((v) => -v) },
            { label: 'PAT',                      d1: model1.pat,              d2: model2.pat,     bold: true },
          ],
        },
        {
          title: 'Cashflow Statement (INR MM)',
          rows: [
            { label: 'CFO',           d1: model1.cfoArr,                       d2: model2.cfoArr, bold: true },
            { label: 'CFI',           d1: model1.cfInvArr,                     d2: model2.cfInvArr },
            { label: 'CFF',           d1: model1.cfFinArr,                     d2: model2.cfFinArr },
            null,
            { label: 'Dividends',     d1: model1.divArr?.map((v) => -v),       d2: model2.divArr?.map((v) => -v) },
            { label: 'Closing Cash',  d1: model1.cashArr,                      d2: model2.cashArr, bold: true },
          ],
        },
        {
          title: 'Balance Sheet (INR MM)',
          rows: [
            { label: 'Net PPE',           d1: model1.ppe,         d2: model2.ppe },
            { label: 'Trade Receivables', d1: model1.bsRec,       d2: model2.bsRec },
            { label: 'Cash',             d1: model1.cashArr,      d2: model2.cashArr },
            { label: 'Total Assets',     d1: model1.totalAssets,  d2: model2.totalAssets, bold: true },
            null,
            { label: 'SHL Debt',         d1: model1.shlDebt,      d2: model2.shlDebt },
            { label: 'Capex Debt',       d1: model1.capexDebt,    d2: model2.capexDebt },
            { label: 'Total Liabilities',d1: model1.totalLiab,    d2: model2.totalLiab, bold: true },
          ],
        },
      ].map(({ title, rows }) => (
        <div key={title} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-[#b8d4ea] px-4 py-2 border-b border-slate-300 flex items-center justify-between">
            <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">M1</span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">M2</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th className={`${thCmp} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 200 }}>Line Item</th>
                  {yrs.map((lbl) => <th key={`${lbl}-m1`} className={`${thCmp} text-blue-700 bg-blue-50`} style={{ minWidth: 75 }}>{lbl} M1</th>)}
                  {yrs.map((lbl) => <th key={`${lbl}-m2`} className={`${thCmp} text-slate-600 bg-slate-100`} style={{ minWidth: 75 }}>{lbl} M2</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) =>
                  row === null
                    ? <CSep key={i} cols={n} />
                    : <CRow key={row.label} label={row.label} d1={row.d1} d2={row.d2}
                            fmt={row.pct ? fmtPct : fmt} bold={row.bold} />
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-slate-400 pb-2">
        All values INR MM · M1 = Model 1 · M2 = Model 2
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage({ model1 = null, model2 = null, onClearModel1 = null, onClearModel2 = null }) {
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  // Read all data on mount / refresh
  const modelInputs   = readLS('fmd_inputs')
  const revenueInputs = readLS('fmd_revenue')
  const scenarioRows  = readLS('fmd_scenario_rows')
  const plInputs      = readLS('fmd_pl_inputs')

  const modelTs    = localStorage.getItem('fmd_inputs_ts')
  const revenueTs  = localStorage.getItem('fmd_revenue_ts')
  const scenarioTs = localStorage.getItem('fmd_scenario_rows_ts')
  const plTs       = localStorage.getItem('fmd_pl_inputs_ts')

  function clearKey(key) {
    localStorage.removeItem(key)
    localStorage.removeItem(`${key}_ts`)
    refresh()
  }

  function handleClearAll() {
    if (!window.confirm('Clear all saved history? This cannot be undone.')) return
    ;['fmd_inputs','fmd_revenue','fmd_scenario_rows','fmd_pl_inputs',
      'fmd_tenancy_form','fmd_cells'].forEach(k => {
      localStorage.removeItem(k)
      localStorage.removeItem(`${k}_ts`)
    })
    refresh()
  }

  const [showCompare, setShowCompare] = useState(false)

  const anySaved = !!(modelInputs || revenueInputs || scenarioRows || plInputs || model1 || model2)

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#0d2045] px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-300" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Saved History
            </h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Input and output calculations saved in this browser session
            </p>
          </div>
          {anySaved && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-300
                         hover:text-white border border-rose-400/40 hover:border-rose-300
                         px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SAVED MODELS
          ══════════════════════════════════════════════════════ */}
      {(model1 || model2) && (
        <section>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
            Saved Models
          </p>

          {/* Model cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { m: model1, num: 1, accent: 'blue',  onClear: onClearModel1 },
              { m: model2, num: 2, accent: 'slate', onClear: onClearModel2 },
            ].map(({ m, num, accent, onClear }) => {
              const borderCls = accent === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
              const titleCls  = accent === 'blue' ? 'text-blue-700' : 'text-slate-600'
              const irrCls    = accent === 'blue' ? 'text-blue-800' : 'text-slate-700'
              const fmtIRR    = (n) => (n != null && Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : 'N/A')
              if (!m) {
                return (
                  <div key={num} className="border border-dashed border-slate-300 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Model {num}</p>
                    <p className="text-xs text-slate-400 italic">Not saved yet — go to View Output, select scenarios, then click Save as Model {num}.</p>
                  </div>
                )
              }
              return (
                <div key={num} className={`border rounded-xl p-4 ${borderCls}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wide ${titleCls}`}>Model {num}</p>
                      {m.savedAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(m.savedAt)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 uppercase">Equity IRR</p>
                        <p className={`text-lg font-bold ${irrCls}`}>{fmtIRR(m.irr)}</p>
                      </div>
                      {onClear && (
                        <button
                          onClick={onClear}
                          className="text-[10px] font-semibold text-rose-500 hover:text-rose-700
                                     border border-rose-200 hover:border-rose-400 px-2 py-0.5
                                     rounded transition-colors bg-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(DROPDOWN_LABELS).map(([key, def]) => {
                      const val = m.config?.[key]
                      const lbl = def[val] ?? String(val)
                      return (
                        <div key={key} className="flex items-baseline gap-1 text-xs min-w-0">
                          <span className="text-slate-400 shrink-0 truncate">{def.label}:</span>
                          <span className="font-semibold text-slate-700 truncate">{lbl}</span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Key metrics */}
                  <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Rev Yr1',    v: m.totalRev?.[0]  },
                      { label: 'EBITDA Yr1', v: m.ebitda?.[0]    },
                      { label: 'PAT Yr1',    v: m.pat?.[0]       },
                    ].map((c) => (
                      <div key={c.label}>
                        <p className="text-[9px] text-slate-400 uppercase">{c.label}</p>
                        <p className={`text-xs font-bold ${irrCls}`}>
                          {Number.isFinite(c.v) ? Math.round(c.v).toLocaleString() : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Compare button */}
          {model1 && model2 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowCompare((v) => !v)}
                className={`flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl
                            transition-colors focus:outline-none focus:ring-2 shadow-sm
                            ${showCompare
                              ? 'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-400'
                              : 'bg-[#1e3a5f] text-white hover:bg-[#2a4f7f] focus:ring-blue-400'
                            }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {showCompare ? 'Hide Comparison' : 'Compare Model 1 vs Model 2'}
              </button>
            </div>
          )}

          {/* Comparison tables */}
          {showCompare && model1 && model2 && (
            <div className="mt-4">
              <ComparisonView model1={model1} model2={model2} />
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          INPUT CALCULATIONS
          ══════════════════════════════════════════════════════ */}
      <section>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
          Input Calculations
        </p>
        <div className="space-y-4" key={`in-${tick}`}>

          {/* Model Inputs */}
          <DataTable
            title="Model Inputs"
            headerColor="bg-[#b8d4ea]"
            savedAt={modelTs}
            fields={MODEL_INPUT_FIELDS}
            data={modelInputs}
            emptyMsg="No model inputs saved yet. Fill the Input Form and click Save & Analyze."
            onClear={() => clearKey('fmd_inputs')}
          />

          {/* Revenue Inputs
          <DataTable
            title="Revenue Inputs"
            headerColor="bg-emerald-100"
            savedAt={revenueTs}
            fields={REVENUE_FIELDS}
            data={revenueInputs}
            emptyMsg="No revenue inputs saved yet."
            onClear={() => clearKey('fmd_revenue')}
          />

          {/* Scenario Rows — Tower Adds */}
          {/* <ScenarioTable
            title="Scenario Rows — Tower Adds"
            headerColor="bg-blue-100"
            rows={scenarioRows}
            savedAt={scenarioTs}
            onClear={() => clearKey('fmd_scenario_rows')}
          />  */}

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          OUTPUT CALCULATIONS
          ══════════════════════════════════════════════════════ */}
      <section>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
          Output Calculations
        </p>
        <div key={`out-${tick}`}>
          <DataTable
            title="P&L Output Inputs (Year 1 Seeds)"
            headerColor="bg-violet-100"
            savedAt={plTs}
            fields={PL_INPUT_FIELDS}
            data={plInputs}
            emptyMsg="No P&L output inputs saved yet. Open Output Calculation and fill the form."
            onClear={() => clearKey('fmd_pl_inputs')}
          />
        </div>
      </section>

      {/* Empty state */}
      {!anySaved && (
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-14
                        flex flex-col items-center gap-3 text-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">No history yet</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Fill in the Input Form and click <strong>Save &amp; Analyze</strong> to start
            building your calculation history.
          </p>
        </div>
      )}
    </div>
  )
}
