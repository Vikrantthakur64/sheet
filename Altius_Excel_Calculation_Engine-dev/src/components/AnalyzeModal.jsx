import React, { useState, useEffect, useRef, useMemo } from 'react'
import SummaryCards  from './SummaryCards'
import DataTable     from './DataTable'
import Tenancies     from './Tenancies'
import PLScreen      from './Output/PLScreen'
import { buildNewTenanciesSeries } from '../pages/RevenuePage'
import {
  computeTowerSchedule, computeTenancySchedule, buildChurnSeries, computeOpex,
  computeCapexSchedule, computePPESchedule, computeSHLDebtSchedule, computeCapexDebtSchedule,
} from '../utils/calculation'

function buildSeries(baseVal, yoyPct, count) {
  const base = Number(baseVal) || 0
  const rate = (Number(yoyPct) || 0) / 100
  const arr  = []
  let v = base
  for (let i = 0; i < count; i++) { arr.push(v); v *= (1 + rate) }
  return arr
}

function padTo(arr, n) {
  const out  = [...(arr || [])]
  const last = out[out.length - 1] || 0
  while (out.length < n) out.push(last)
  return out.slice(0, n)
}

/**
 * AnalyzeModal — full-screen popup with two tabs:
 *
 *  Tab 1 — All Projections:
 *    1. GBT projection (SummaryCards + DataTable)
 *    2. Tenancies projection (Tenancies component)
 *    3. Revenue projection (inline tables)
 *    4. Opex projection (inline tables)
 *    5. Capex & PPE projection
 *    6. Other Assumptions summary
 *    7. Debt — SHL projection
 *    8. Debt — INVIT projection
 *
 *  Tab 2 — Output Calculation:
 *    P&L + Balance Sheet input form → Calculate → output tables
 */
export default function AnalyzeModal({
  open, onClose,
  // GBT
  inputs, scenarioRows, dismantleRows,
  onTowerChange, onDismantleChange, onShowProjection,
  scenarioId, onScenarioChange,
  growthPct, cells, onCellChange, allSeries,
  // Revenue / Tenancy
  yearLabels, count,
  avgTowers, avgTenancies,
  revenueInputs, tenancyForm,
  // Opex result (passed in after user fills opex form)
  opexResult,
  // Saved form data for other sections
  savedCapexForm,
  savedSHLForm,
  savedDebtINVIT,
  savedOtherAssump,
  capexAdditionsForDebt,
  // PL
  plInputs, onPLInputChange,
}) {
  const [tab, setTab]               = useState('projections')
  const [showPLForm, setShowPLForm]   = useState(false)
  const [selectedCase, setSelectedCase] = useState('base')
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const tenure = inputs?.tenure || '9'
  const resolvedCount = count || yearLabels?.length || 0

  // ── Inline Revenue projection data (computed unconditionally — hooks rules) ─
  const newTenanciesSeries = buildNewTenanciesSeries(tenancyForm, resolvedCount)
  const openingTower       = Number(revenueInputs?.openingTower) || 0
  const existingTenancies  = Number(revenueInputs?.existingTenancies) || 0

  const towerRows = useMemo(() => {
    const rows = []
    let prev = openingTower
    for (let i = 0; i < resolvedCount; i++) {
      const opening = i === 0 ? openingTower : prev
      const adds    = Number(allSeries?.sel_tower?.[i]) || 0
      const dm      = Number(allSeries?.sel_dm?.[i])    || 0
      const closing = opening + adds + dm
      rows.push({ opening, adds, dm, closing, average: closing })
      prev = closing
    }
    return rows
  }, [openingTower, allSeries?.sel_tower, allSeries?.sel_dm, resolvedCount])

  const tenancyRows = useMemo(() => {
    const rows = []
    let prev = existingTenancies
    for (let i = 0; i < resolvedCount; i++) {
      const existing = i === 0 ? existingTenancies : prev
      const newT     = Math.round(Number(newTenanciesSeries[i]) || 0)
      const closing  = existing + newT
      rows.push({ existing, newT, closing, average: closing })
      prev = closing
    }
    return rows
  }, [existingTenancies, newTenanciesSeries, resolvedCount])

  // ── Capex & PPE projection ─────────────────────────────────────────────────
  const capexProjection = useMemo(() => {
    if (!savedCapexForm) return null
    const n = resolvedCount || 1
    const capexPerSite = buildSeries(savedCapexForm.capexBase, savedCapexForm.capexYoy, n)
    const maintPerSite = buildSeries(savedCapexForm.maintenanceBase, savedCapexForm.maintenanceYoy, n)
    const depRate      = (Number(savedCapexForm.depRate) || 0) / 100
    const adds         = padTo(allSeries?.sel_tower || [], n)
    const towers       = avgTowers?.length ? padTo(avgTowers, n) : Array(n).fill(0)
    const capexSchedule = computeCapexSchedule(adds, capexPerSite, maintPerSite, towers)
    const ppeSchedule   = computePPESchedule(
      Number(savedCapexForm.openingGB)       || 0,
      Number(savedCapexForm.openingAccumDep) || 0,
      capexSchedule.map((r) => r.totalCapex),
      depRate,
    )
    return { capexSchedule, ppeSchedule }
  }, [savedCapexForm, resolvedCount, allSeries?.sel_tower, avgTowers])

  // ── Debt SHL projection ────────────────────────────────────────────────────
  const shlProjection = useMemo(() => {
    if (!savedSHLForm) return null
    const n = resolvedCount || 1
    const additions  = buildSeries(savedSHLForm.additionBase, savedSHLForm.additionYoy, n)
    const repayments = Array(n).fill(0)
    repayments[0]    = Number(savedSHLForm.repaymentYr1) || 0
    const intRate    = (Number(savedSHLForm.intRate) || 0) / 100
    return computeSHLDebtSchedule(
      Number(savedSHLForm.openingBalance) || 0,
      additions,
      repayments,
      intRate,
    )
  }, [savedSHLForm, resolvedCount])

  // ── Debt INVIT projection ──────────────────────────────────────────────────
  const invitProjection = useMemo(() => {
    if (!savedDebtINVIT) return null
    const n = resolvedCount || 1

    // SPV Refinancing Debt
    const spvAdditions = Array(n).fill(0)
    spvAdditions[0]    = Number(savedDebtINVIT.spvAddition) || 0
    const spvRepayPct  = (Number(savedDebtINVIT.spvRepaymentPct) || 0) / 100
    const spvRate      = (Number(savedDebtINVIT.spvIntRate) || 0) / 100
    let   spvOpenBal   = Number(savedDebtINVIT.spvOpening) || 0
    const spvDebt      = []
    for (let i = 0; i < n; i++) {
      const add   = spvAdditions[i]
      const rep   = spvOpenBal * spvRepayPct + add * spvRepayPct * 0.5
      const close = Math.max(0, spvOpenBal + add - rep)
      const fc    = (spvOpenBal + close) / 2 * spvRate
      spvDebt.push({ opening: spvOpenBal, additions: add, repayments: rep, closing: close, financeCost: fc, repayPct: spvRepayPct })
      spvOpenBal = close
    }

    // Capex Debt
    const additions = capexAdditionsForDebt?.length ? padTo(capexAdditionsForDebt, n) : Array(n).fill(0)
    const repayPct  = (Number(savedDebtINVIT.repaymentPct) || 0) / 100
    const capexRate = (Number(savedDebtINVIT.capexIntRate)  || 0) / 100
    const capexDebt = computeCapexDebtSchedule(
      Number(savedDebtINVIT.capexDebtOpening) || 0,
      additions,
      repayPct,
      capexRate,
    )
    return { spvDebt, capexDebt, capexRepayPct: repayPct }
  }, [savedDebtINVIT, resolvedCount, capexAdditionsForDebt])

  // All hooks are above this line — safe to early-return now
  if (!open) return null
  const thCls     = `border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap text-center`
  const tdLbl     = `border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
  const tdLblBold = `border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
  const tdNum     = `border border-slate-200 px-3 py-2 text-xs text-right tabular-nums font-medium text-slate-700`
  const fmt       = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString() : '—'
  const fmtMM     = (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—'

  function SectionTable({ title, headerColor = 'bg-[#b8d4ea]', children }) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className={`${headerColor} px-4 py-2 border-b border-slate-300`}>
          <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 220 }}>Row</th>
                {yearLabels.map((lbl) => <th key={lbl} className={thCls} style={{ minWidth: 100 }}>{lbl}</th>)}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    )
  }

  function SepRow() {
    return <tr><td colSpan={yearLabels.length + 1} className="border-t-2 border-slate-300 p-0 h-0" /></tr>
  }

  function SectionLabel({ num, label, color = 'bg-blue-600' }) {
    return (
      <div className="flex items-center gap-3 mb-3">
        <span className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0 ${color}`}>
          {num}
        </span>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{label}</h3>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog" aria-modal="true" aria-label="Analyze"
    >
      <div
        ref={panelRef}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[98vw] my-4 flex flex-col"
        style={{ minHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2045] rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Financial Model — Analysis</h2>
            <p className="text-blue-300 text-xs mt-0.5">All projections and output calculations</p>
          </div>
          <button onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200 bg-white shrink-0 px-6">
          {[
            { id: 'projections', label: 'All Projections',    icon: '📋' },
            { id: 'outputs',     label: 'Output Calculation', icon: '📊' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors focus:outline-none
                ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Case Selection Sidebar — only shown on Projections tab ── */}
          {tab === 'projections' && (
          <div className="w-44 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4 px-3 gap-1 overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Case Selection</p>
            {[
              { id: 'base',   label: 'Base Case',        icon: '📊' },
              { id: 'bp25',   label: 'Updated BP 25',    icon: '📈' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c.id)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${selectedCase === c.id
                    ? 'bg-[#1e3a5f] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <span className="text-sm">{c.icon}</span>
                <span className="leading-tight">{c.label}</span>
                {selectedCase === c.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                )}
              </button>
            ))}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[9px] text-slate-400 px-2 leading-relaxed">
                Select a case to filter all projection tables and outputs.
              </p>
            </div>
          </div>
          )}

          {/* ── Main Content ── */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-10">

          {/* Active case badge — only on projections tab */}
          {tab === 'projections' && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#1e3a5f] text-white text-[10px] font-bold px-3 py-1 rounded-full">
              <span>{selectedCase === 'base' ? '📊' : '📈'}</span>
              {selectedCase === 'base' ? 'Base Case' : 'Updated BP 25 Case'}
            </span>
            <span className="text-[10px] text-slate-400">— all tables filtered to this case</span>
          </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 1 — ALL PROJECTIONS
              ══════════════════════════════════════════════════════ */}
          {tab === 'projections' && (
            <>
              {/* ── 1. GBT Projection ── */}
              <section>
                <SectionLabel num="1" label="Ground-Based Towers Projection" color="bg-blue-600" />
                <div className="space-y-4">
                  <SummaryCards
                    towerAdds={selectedCase === 'bp25' ? (allSeries.bp25_tower || []) : (allSeries.base_tower || allSeries.sel_tower || [])}
                    dismantle={selectedCase === 'bp25' ? (allSeries.bp25_dm    || []) : (allSeries.base_dm    || allSeries.sel_dm    || [])}
                  />
                  <DataTable
                    yearLabels={yearLabels}
                    scenarioId={scenarioId}
                    onScenarioChange={onScenarioChange}
                    growthPct={growthPct}
                    cells={cells}
                    onCellChange={onCellChange}
                    allSeries={allSeries}
                    scenarioRows={scenarioRows}
                    dismantleRows={dismantleRows}
                    selectedCase={selectedCase}
                  />
                </div>
              </section>

              {/* ── 2. Tenancies Projection ── */}
              <section>
                <SectionLabel num="2" label="Tenancies Projection" color="bg-indigo-600" />
                {tenancyForm ? (
                  <Tenancies yearLabels={yearLabels} formData={tenancyForm} selectedCase={selectedCase} />
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    No tenancy data saved yet. Fill the Tenancies section and save first.
                  </div>
                )}
              </section>

              {/* ── 3. Revenue Projection ── */}
              <section>
                <SectionLabel num="3" label="Revenue Projection" color="bg-emerald-600" />
                {openingTower > 0 ? (
                  <div className="space-y-4">
                    {/* Ground Tower table */}
                    <SectionTable title="Ground Based Tower Revenue — Year-by-Year">
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>Opening Tower</td>
                        {towerRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>New Tower Adds <span className="text-[10px] font-normal text-slate-400 italic ml-1">(from scenario)</span></td>
                        {towerRows.map((r, i) => <td key={i} className={`${tdNum} text-emerald-700`}>{fmt(r.adds)}</td>)}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>Dismantle Sites <span className="text-[10px] font-normal text-slate-400 italic ml-1">(from scenario)</span></td>
                        {towerRows.map((r, i) => <td key={i} className={`${tdNum} text-rose-600`}>{fmt(r.dm)}</td>)}
                      </tr>
                      <SepRow />
                      <tr className="bg-slate-50">
                        <td className={tdLblBold}>Closing Tower <span className="text-[10px] font-normal text-slate-400 italic ml-1">= Opening + Adds + Dismantles</span></td>
                        {towerRows.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>)}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>Average Tower</td>
                        {towerRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.average)}</td>)}
                      </tr>
                    </SectionTable>

                    {/* Tenancy table */}
                    <SectionTable title="Tenancies — Year-by-Year" headerColor="bg-indigo-100">
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>Existing Tenancies <span className="text-[10px] font-normal text-slate-400 italic ml-1">(yr 1 = input · yr 2+ = prev closing)</span></td>
                        {tenancyRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.existing)}</td>)}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>New Tenancies <span className="text-[10px] font-normal text-slate-400 italic ml-1">(from Tenancies section)</span></td>
                        {tenancyRows.map((r, i) => <td key={i} className={`${tdNum} text-indigo-700`}>{fmt(r.newT)}</td>)}
                      </tr>
                      <SepRow />
                      <tr className="bg-slate-50">
                        <td className={tdLblBold}>Closing <span className="text-[10px] font-normal text-slate-400 italic ml-1">= Existing + New</span></td>
                        {tenancyRows.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>)}
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className={tdLbl}>Average</td>
                        {tenancyRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.average)}</td>)}
                      </tr>
                    </SectionTable>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Enter Opening Tower count in the Revenue section first.
                  </div>
                )}
              </section>

              {/* ── 4. Opex Projection ── */}
              <section>
                <SectionLabel num="4" label="Opex Projection" color="bg-orange-500" />
                {opexResult ? (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Lease Rent (Yr 1)',  value: fmtMM(opexResult.rows[0]?.leaseRent),    color: 'bg-blue-50 border-blue-200 text-blue-700'    },
                        { label: 'Energy Opex (Yr 1)', value: fmtMM(opexResult.rows[0]?.energyExpense), color: 'bg-orange-50 border-orange-200 text-orange-700' },
                        { label: 'R&M Cost (Yr 1)',    value: fmtMM(opexResult.rows[0]?.rAndM),        color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                        { label: 'Total Opex (Yr 1)',  value: fmtMM(opexResult.rows[0]?.totalOpex),    color: 'bg-indigo-50 border-indigo-200 text-indigo-700'  },
                      ].map((c) => {
                        const [bg, border, txt] = c.color.split(' ')
                        return (
                          <div key={c.label} className={`border rounded-xl px-4 py-3 shadow-sm ${bg} ${border}`}>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{c.label}</p>
                            <p className={`text-xl font-bold mt-0.5 ${txt}`}>{c.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">INR MM</p>
                          </div>
                        )
                      })}
                    </div>

                    <SectionTable title="Operating Expenditure — Year-by-Year (INR MM)">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Lease Rent</td>{opexResult.rows.map((r, i) => <td key={i} className={tdNum}>{fmtMM(r.leaseRent)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Energy Opex</td>{opexResult.rows.map((r, i) => <td key={i} className={`${tdNum} text-orange-700`}>{fmtMM(r.energyExpense)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repairs &amp; Maintenance</td>{opexResult.rows.map((r, i) => <td key={i} className={tdNum}>{fmtMM(r.rAndM)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Admin Cost</td>{opexResult.rows.map((r, i) => <td key={i} className={tdNum}>{fmtMM(r.admin)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Total Salary</td>{opexResult.rows.map((r, i) => <td key={i} className={tdNum}>{fmtMM(r.salary)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50">
                        <td className={tdLblBold}>Total Opex</td>
                        {opexResult.rows.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmtMM(r.totalOpex)}</td>)}
                      </tr>
                    </SectionTable>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Fill the Opex section and click "Show Opex Projection" first to see results here.
                  </div>
                )}
              </section>

              {/* ── 5. Capex & PPE Projection ── */}
              <section>
                <SectionLabel num="5" label="Capex &amp; PPE Projection" color="bg-yellow-600" />
                {capexProjection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'New Tower Capex (Yr 1)',   value: fmt(capexProjection.capexSchedule[0]?.newTowerCapex),    color: 'bg-blue-50 border-blue-200 text-blue-700'     },
                        { label: 'Maintenance Capex (Yr 1)', value: fmt(capexProjection.capexSchedule[0]?.maintenanceCapex), color: 'bg-orange-50 border-orange-200 text-orange-700' },
                        { label: 'Total Capex (Yr 1)',       value: fmt(capexProjection.capexSchedule[0]?.totalCapex),       color: 'bg-indigo-50 border-indigo-200 text-indigo-700'  },
                        { label: 'Depreciation (Yr 1)',      value: fmt(capexProjection.ppeSchedule[0]?.depreciation),      color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                      ].map((c) => {
                        const [bg, border, txt] = c.color.split(' ')
                        return (
                          <div key={c.label} className={`border rounded-xl px-4 py-3 shadow-sm ${bg} ${border}`}>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{c.label}</p>
                            <p className={`text-xl font-bold mt-0.5 ${txt}`}>{c.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">INR MM</p>
                          </div>
                        )
                      })}
                    </div>
                    <SectionTable title="Capital Expenditure — Year-by-Year (INR MM)" headerColor="bg-yellow-100">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>New Tower Capex</td>{capexProjection.capexSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.newTowerCapex)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Maintenance Capex</td>{capexProjection.capexSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.maintenanceCapex)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Total Capex</td>{capexProjection.capexSchedule.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.totalCapex)}</td>)}</tr>
                    </SectionTable>
                    <SectionTable title="Gross Block — PPE (INR MM)" headerColor="bg-slate-200">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Opening Gross Block</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.openingGB)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Addition</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.additions)}</td>)}</tr>
                      <tr className="bg-slate-50"><td className={tdLblBold}>Closing Gross Block</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closingGB)}</td>)}</tr>
                      <SepRow />
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Depreciation for the Year</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.depreciation)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Accumulated Depreciation</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.accumulatedDep)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Net Block (PPE)</td>{capexProjection.ppeSchedule.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.netBlock)}</td>)}</tr>
                    </SectionTable>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Fill the Capex &amp; PPE section and click "Show Capex &amp; PPE Projection" first to see results here.
                  </div>
                )}
              </section>

              {/* ── 6. Other Assumptions ── */}
              <section>
                <SectionLabel num="6" label="Other Assumptions" color="bg-slate-600" />
                {savedOtherAssump ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Receivable Days',        value: savedOtherAssump.receivableDays,    unit: 'days' },
                      { label: 'Payable Days',           value: savedOtherAssump.payableDays,       unit: 'days' },
                      { label: 'Min Cash Balance',       value: savedOtherAssump.minCash,           unit: 'INR MM' },
                      { label: 'Opening Cash',           value: savedOtherAssump.openingCash,       unit: 'INR MM' },
                      { label: 'Deposits / Other Assets',value: savedOtherAssump.deposits,          unit: 'INR MM' },
                      { label: 'Opening Receivables',    value: savedOtherAssump.openingReceivables,unit: 'INR MM' },
                      { label: 'Opening Payables',       value: savedOtherAssump.openingPayables,   unit: 'INR MM' },
                      { label: 'Share Capital',          value: savedOtherAssump.shareCapital,      unit: 'INR MM' },
                      { label: 'Opening Retained Earnings', value: savedOtherAssump.openingRetained, unit: 'INR MM' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{item.label}</p>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">{Number(item.value).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.unit}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Fill the Other Assumptions section and click "Save Assumptions" first to see results here.
                  </div>
                )}
              </section>

              {/* ── 7. Debt — SHL Projection ── */}
              <section>
                <SectionLabel num="7" label="Debt — SHL Projection" color="bg-red-600" />
                {shlProjection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: 'Opening Balance (Yr 1)', value: fmt(shlProjection[0]?.opening),     color: 'bg-blue-50 border-blue-200 text-blue-700'     },
                        { label: 'Closing Balance (Yr 1)', value: fmt(shlProjection[0]?.closing),     color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                        { label: 'Finance Cost (Yr 1)',    value: fmt(shlProjection[0]?.financeCost), color: 'bg-orange-50 border-orange-200 text-orange-700' },
                      ].map((c) => {
                        const [bg, border, txt] = c.color.split(' ')
                        return (
                          <div key={c.label} className={`border rounded-xl px-4 py-3 shadow-sm ${bg} ${border}`}>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{c.label}</p>
                            <p className={`text-xl font-bold mt-0.5 ${txt}`}>{c.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">INR MM</p>
                          </div>
                        )
                      })}
                    </div>
                    <SectionTable title="Debt SHL Schedule — Year-by-Year (INR MM)" headerColor="bg-red-100">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Opening</td>{shlProjection.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Addition</td>{shlProjection.map((r, i) => <td key={i} className={tdNum}>{fmt(r.additions)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repayment</td>{shlProjection.map((r, i) => <td key={i} className={tdNum}>{fmt(r.repayments)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Closing</td>{shlProjection.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Finance Cost</td>{shlProjection.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.financeCost)}</td>)}</tr>
                    </SectionTable>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Fill the Debt — SHL section and click "Show Debt SHL Projection" first to see results here.
                  </div>
                )}
              </section>

              {/* ── 8. Debt — INVIT Projection ── */}
              <section>
                <SectionLabel num="8" label="Debt — INVIT Projection" color="bg-purple-600" />
                {invitProjection ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { label: 'Capex Debt Opening (Yr 1)', value: fmt(invitProjection.capexDebt[0]?.opening),     color: 'bg-blue-50 border-blue-200 text-blue-700'     },
                        { label: 'Capex Debt Closing (Yr 1)', value: fmt(invitProjection.capexDebt[0]?.closing),     color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                        { label: 'Finance Cost (Yr 1)',        value: fmt(invitProjection.capexDebt[0]?.financeCost), color: 'bg-orange-50 border-orange-200 text-orange-700' },
                      ].map((c) => {
                        const [bg, border, txt] = c.color.split(' ')
                        return (
                          <div key={c.label} className={`border rounded-xl px-4 py-3 shadow-sm ${bg} ${border}`}>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{c.label}</p>
                            <p className={`text-xl font-bold mt-0.5 ${txt}`}>{c.value}</p>
                            <p className="text-xs text-slate-400 mt-0.5">INR MM</p>
                          </div>
                        )
                      })}
                    </div>
                    <SectionTable title="SPV Refinancing Debt — Year-by-Year (INR MM)" headerColor="bg-purple-100">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Opening</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Addition</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.additions)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repayment</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.repayments)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Closing</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>)}</tr>
                      <SepRow />
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repayment Schedule</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={tdNum}>{(r.repayPct * 100).toFixed(0)}%</td>)}</tr>
                      <tr className="bg-slate-50"><td className={tdLblBold}>Interest Expense</td>{invitProjection.spvDebt.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.financeCost)}</td>)}</tr>
                    </SectionTable>

                    <SectionTable title="Capex Debt Schedule — Year-by-Year (INR MM)" headerColor="bg-purple-100">
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Opening</td>{invitProjection.capexDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Addition</td>{invitProjection.capexDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.additions)}</td>)}</tr>
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repayment</td>{invitProjection.capexDebt.map((r, i) => <td key={i} className={tdNum}>{fmt(r.repayments)}</td>)}</tr>
                      <SepRow />
                      <tr className="bg-slate-50"><td className={tdLblBold}>Closing</td>{invitProjection.capexDebt.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>)}</tr>
                      <SepRow />
                      <tr className="hover:bg-slate-50"><td className={tdLbl}>Repayment Schedule</td>{invitProjection.capexDebt.map((_, i) => <td key={i} className={tdNum}>{(invitProjection.capexRepayPct * 100).toFixed(0)}%</td>)}</tr>
                      <tr className="bg-slate-50"><td className={tdLblBold}>Finance Cost</td>{invitProjection.capexDebt.map((r, i) => <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.financeCost)}</td>)}</tr>
                    </SectionTable>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                    Fill the Debt — INVIT section and click "Show Debt INVIT Projection" first to see results here.
                  </div>
                )}
              </section>

              {/* Go to Output button */}
              <div className="flex justify-end pb-4">
                <button onClick={() => setTab('outputs')}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white
                             text-sm font-semibold px-6 py-3 rounded-xl transition-colors
                             focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Go to Output Calculation →
                </button>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 2 — OUTPUT CALCULATION
              ══════════════════════════════════════════════════════ */}
          {tab === 'outputs' && (
            <div className="space-y-6">
              {!showPLForm ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">P&amp;L &amp; Balance Sheet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Enter Year 1 seed values for all output rows, then click Calculate to generate the full projection.
                    </p>
                  </div>
                  <button onClick={() => setShowPLForm(true)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Open Output Calculation
                  </button>
                </div>
              ) : (
                <PLScreen
                  yearLabels={yearLabels}
                  revenueInputs={revenueInputs}
                  tenancyForm={tenancyForm}
                  allSeries={allSeries}
                  plInputs={plInputs}
                  onPLInputChange={onPLInputChange}
                  calculateLabel="Calculate"
                />
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
