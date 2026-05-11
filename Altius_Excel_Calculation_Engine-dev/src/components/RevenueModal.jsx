import React, { useEffect, useRef } from 'react'

/**
 * Revenue Projection Modal
 *
 * Section 1 — Ground Based Tower Revenue (column-wise):
 *   Opening Tower  = user input (yr 1) | prev Closing (yr 2+)
 *   New Tower Adds = towerAdds[i]
 *   Dismantles     = dismantles[i]
 *   Closing Tower  = Opening + Adds + Dismantles
 *   Average Tower  = Closing Tower
 *
 * Section 2 — Tenancies (column-wise):
 *   Existing Tenancies = user input (yr 1) | prev Closing (yr 2+)
 *   New Tenancies      = newTenanciesSeries[i]  (from saved Tenancies form)
 *   Closing            = Existing + New
 *   Average            = Closing
 */
export default function RevenueModal({ open, onClose, yearLabels, tenure, revenueData }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open || !revenueData) return null

  const {
    openingTower,
    towerAdds,
    dismantles,
    existingTenancies,
    newTenanciesSeries = [],
    rateExistingTenancies = '',
    rateNewSites          = '',
    energyMargin          = '',
    energyOtherFeeRate    = '',
  } = revenueData

  const count = yearLabels.length

  // ── Section 1: Ground Tower calculation ──────────────────────────────────
  const towerRows = []
  let prevTowerClosing = Math.round(Number(openingTower) || 0)
  for (let i = 0; i < count; i++) {
    const opening = i === 0 ? Math.round(Number(openingTower) || 0) : prevTowerClosing
    const adds    = Math.round(Number(towerAdds[i])  || 0)
    const dm      = Math.round(Number(dismantles[i]) || 0)
    const closing = opening + adds + dm
    towerRows.push({ opening, adds, dm, closing, average: closing })
    prevTowerClosing = closing
  }

  // ── Section 2: Tenancies calculation ─────────────────────────────────────
  const tenancyRows = []
  let prevTenancyClosing = Math.round(Number(existingTenancies) || 0)
  for (let i = 0; i < count; i++) {
    const existing = i === 0 ? Math.round(Number(existingTenancies) || 0) : prevTenancyClosing
    const newT     = Math.round(Number(newTenanciesSeries[i]) || 0)
    const closing  = existing + newT
    tenancyRows.push({ existing, newT, closing, average: closing })
    prevTenancyClosing = closing
  }

  // ── Section 3: Rate Card — Apr-26 blank, Apr-27 = input, Apr-28+ = prev × 1.05
  function buildRateSeries(seedVal) {
    const seed = Number(seedVal) || 0
    // index 0 = Apr-26 → blank (null)
    // index 1 = Apr-27 → seed (user input)
    // index 2+ = prev × 1.05
    const result = [null, seed]
    for (let i = 2; i < count; i++) {
      result.push(Math.round(result[i - 1] * 1.05 * 100) / 100)
    }
    // Trim or pad to exactly `count` entries
    return result.slice(0, count)
  }
  const rateExistingSeries = buildRateSeries(rateExistingTenancies)
  const rateNewSitesSeries = buildRateSeries(rateNewSites)
  const energyMarginSeries    = buildRateSeries(energyMargin)
  const energyFeeRateSeries   = buildRateSeries(energyOtherFeeRate)

  // ── Section 4: Revenue ───────────────────────────────────────────────────
  // Existing Tenancies revenue per year:
  //   avg = (tenancyRows[i].existing + tenancyRows[i].closing) / 2
  // ── Section 4: Revenue ───────────────────────────────────────────────────
  // Formula per column i:
  //   avgTenancy = AVERAGE(tenancyRows[i].average, tenancyRows[i+1].average)
  //   avgRate    = AVERAGE(rateExistingSeries[i],  rateExistingSeries[i+1])
  //   revenue    = (avgTenancy × avgRate × 12) / 1,000,000
  //
  // Last column (no i+1): use single values.
  // Apr-26 (i=0): rate is null → '—'

  function calcRevenue(avgCur, avgNext, rateCur, rateNext) {
    if (rateCur === null) return null
    const avgTenancy = (rateNext !== null && avgNext !== undefined)
      ? (avgCur + avgNext) / 2
      : avgCur
    const avgRate = (rateNext !== null)
      ? (rateCur + rateNext) / 2
      : rateCur
    return (avgTenancy * avgRate * 12) / 1_000_000
  }

  const revenueExistingSeries = tenancyRows.map((row, i) => {
    const nextRow  = tenancyRows[i + 1]
    const rateCur  = rateExistingSeries[i]
    const rateNext = rateExistingSeries[i + 1] ?? null
    return calcRevenue(row.average, nextRow?.average, rateCur, rateNext)
  })

  const revenueNewSitesSeries = tenancyRows.map((row, i) => {
    const nextRow  = tenancyRows[i + 1]
    const rateCur  = rateNewSitesSeries[i]
    const rateNext = rateNewSitesSeries[i + 1] ?? null
    return calcRevenue(row.average, nextRow?.average, rateCur, rateNext)
  })

  const fmtRev = (n) => (n === null || !Number.isFinite(n)) ? '—' : n.toFixed(4)

  const fmt     = (n) => Number.isFinite(n) ? n.toLocaleString() : '—'
  const fmtRate = (n) => Number.isFinite(n) ? n.toFixed(2) : '—'

  // ── Shared styles ─────────────────────────────────────────────────────────
  const thCls = `border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap text-center`
  const tdNum = `border border-slate-200 px-3 py-2 text-xs text-right tabular-nums font-medium text-slate-700`
  const tdLbl = `border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
  const tdLblBold = `border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800
                     bg-slate-50 whitespace-nowrap sticky left-0 z-10`

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
                <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 220 }}>
                  Row
                </th>
                {yearLabels.map((lbl) => (
                  <th key={lbl} className={thCls} style={{ minWidth: 100 }}>{lbl}</th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    )
  }

  function SepRow() {
    return (
      <tr>
        <td colSpan={yearLabels.length + 1} className="border-t-2 border-slate-300 p-0 h-0" />
      </tr>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Revenue Projection"
    >
      <div
        ref={panelRef}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[98vw] my-6
                   flex flex-col animate-[fadeSlideIn_0.2s_ease-out]"
        style={{ minHeight: '60vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2045] rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Revenue Projection</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Ground Based Tower Revenue &amp; Tenancies · {tenure} year projection
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full
                       bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close revenue projection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-4 md:px-6 py-5 space-y-6 overflow-y-auto">

          {/* ════════════════════════════════════════════════════════
              SECTION 1 — Ground Based Tower Revenue
              ════════════════════════════════════════════════════════ */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-blue-600 text-white text-[10px] font-bold">1</span>
              Ground Based Tower Revenue
            </h3>

            <SectionTable title="Ground Based Tower Revenue — Year-by-Year Projection">
              {/* Opening Tower */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>Opening Tower</td>
                {towerRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}
              </tr>

              {/* New Tower Adds */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  New Tower Adds
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">(from scenario)</span>
                </td>
                {towerRows.map((r, i) => (
                  <td key={i} className={`${tdNum} text-emerald-700`}>{fmt(r.adds)}</td>
                ))}
              </tr>

              {/* Dismantles */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Dismantle Sites
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">(from scenario)</span>
                </td>
                {towerRows.map((r, i) => (
                  <td key={i} className={`${tdNum} text-rose-600`}>{fmt(r.dm)}</td>
                ))}
              </tr>

              <SepRow />

              {/* Closing Tower */}
              <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                <td className={tdLblBold}>
                  Closing Tower
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    = Opening + Adds + Dismantles
                  </span>
                </td>
                {towerRows.map((r, i) => (
                  <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>
                ))}
              </tr>

              {/* Average Tower */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Average Tower
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">= Closing Tower</span>
                </td>
                {towerRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.average)}</td>)}
              </tr>
            </SectionTable>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 2 — Tenancies
              ════════════════════════════════════════════════════════ */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-indigo-600 text-white text-[10px] font-bold">2</span>
              Tenancies
            </h3>

            <SectionTable title="Tenancies — Year-by-Year Projection" headerColor="bg-indigo-100">
              {/* Existing Tenancies */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Existing Tenancies
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    (yr 1 = input · yr 2+ = prev closing)
                  </span>
                </td>
                {tenancyRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.existing)}</td>)}
              </tr>

              {/* New Tenancies */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  New Tenancies
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">(from Tenancies section)</span>
                </td>
                {tenancyRows.map((r, i) => (
                  <td key={i} className={`${tdNum} text-indigo-700`}>{fmt(r.newT)}</td>
                ))}
              </tr>

              <SepRow />

              {/* Closing */}
              <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                <td className={tdLblBold}>
                  Closing
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    = Existing + New Tenancies
                  </span>
                </td>
                {tenancyRows.map((r, i) => (
                  <td key={i} className={`${tdNum} font-bold text-slate-800`}>{fmt(r.closing)}</td>
                ))}
              </tr>

              {/* Average */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Average
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">= Closing</span>
                </td>
                {tenancyRows.map((r, i) => <td key={i} className={tdNum}>{fmt(r.average)}</td>)}
              </tr>
            </SectionTable>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — Rate Card
              ════════════════════════════════════════════════════════ */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-emerald-600 text-white text-[10px] font-bold">3</span>
              Rate Card
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                Apr-27 = input · Apr-28 onwards = prev × (1 + 5%)
              </span>
            </h3>

            <SectionTable title="Rate Card — Year-by-Year Projection" headerColor="bg-emerald-100">
              {/* Existing Tenancies rate */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Existing Tenancies
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    (Apr-27 = input · grows 5% p.a.)
                  </span>
                </td>
                {rateExistingSeries.map((v, i) => (
                  <td key={i} className={
                    v === null        ? `${tdNum} text-slate-300`
                    : i === 1         ? `${tdNum} text-blue-700 font-bold`
                    :                   `${tdNum} italic text-slate-600`
                  }>
                    {v === null ? '—' : fmtRate(v)}
                  </td>
                ))}
              </tr>

              {/* Tenancies on new sites rate */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Tenancies on New Sites
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    (Apr-27 = input · grows 5% p.a.)
                  </span>
                </td>
                {rateNewSitesSeries.map((v, i) => (
                  <td key={i} className={
                    v === null        ? `${tdNum} text-slate-300`
                    : i === 1         ? `${tdNum} text-blue-700 font-bold`
                    :                   `${tdNum} italic text-slate-600`
                  }>
                    {v === null ? '—' : fmtRate(v)}
                  </td>
                ))}
              </tr>
            </SectionTable>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 4 — Revenue
              Formula:
                Existing Tenancies: ((avg(existing, closing) × rate × 12) / 1,000,000)
                New Tenancies:      ((newT × rateNewSites × 12) / 1,000,000)
              Apr-26 column = '—' (rate card starts Apr-27)
              ════════════════════════════════════════════════════════ */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-violet-600 text-white text-[10px] font-bold">4</span>
              Revenue
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                (avg tenancies × rate × 12) ÷ 1,000,000 · INR MM
              </span>
            </h3>

            <SectionTable title="Revenue — Year-by-Year (INR MM)" headerColor="bg-violet-100">
              {/* Existing Tenancies revenue */}
              <tr className="bg-violet-50 hover:bg-violet-100 transition-colors">
                <td className={`${tdLbl} text-violet-800 font-bold bg-violet-50`}>
                  Existing Tenancies
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    = avg(tenancy avg[i,i+1]) × avg(rate[i,i+1]) × 12 ÷ 10⁶
                  </span>
                </td>
                {revenueExistingSeries.map((v, i) => (
                  <td key={i} className={`border border-slate-200 px-3 py-2 text-xs text-right
                                          tabular-nums font-bold
                                          ${v === null ? 'text-slate-300' : 'text-violet-700'}`}>
                    {fmtRev(v)}
                  </td>
                ))}
              </tr>

              {/* New Tenancies revenue */}
              <tr className="bg-violet-50 hover:bg-violet-100 transition-colors">
                <td className={`${tdLbl} text-violet-800 font-bold bg-violet-50`}>
                  New Tenancies
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    = avg(tenancy avg[i,i+1]) × avg(rate new[i,i+1]) × 12 ÷ 10⁶
                  </span>
                </td>
                {revenueNewSitesSeries.map((v, i) => (
                  <td key={i} className={`border border-slate-200 px-3 py-2 text-xs text-right
                                          tabular-nums font-bold
                                          ${v === null ? 'text-slate-300' : 'text-violet-700'}`}>
                    {fmtRev(v)}
                  </td>
                ))}
              </tr>
            </SectionTable>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 5 — Energy and Other Revenue
              Apr-26 = blank · Apr-27 = input · Apr-28+ = prev × 1.05
              ════════════════════════════════════════════════════════ */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                               bg-orange-500 text-white text-[10px] font-bold">5</span>
              Energy and Other Revenue
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                Apr-27 = input · Apr-28 onwards = prev × (1 + 5%)
              </span>
            </h3>

            <SectionTable title="Energy and Other Revenue — Year-by-Year Projection" headerColor="bg-orange-100">
              {/* Energy Margin */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Energy Margin
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    (Apr-27 = input · grows 5% p.a.)
                  </span>
                </td>
                {energyMarginSeries.map((v, i) => (
                  <td key={i} className={
                    v === null ? `${tdNum} text-slate-300`
                    : i === 1  ? `${tdNum} text-blue-700 font-bold`
                    :            `${tdNum} italic text-slate-600`
                  }>
                    {v === null ? '—' : fmtRate(v)}
                  </td>
                ))}
              </tr>

              {/* Energy and Other Fee Rate */}
              <tr className="bg-white hover:bg-slate-50 transition-colors">
                <td className={tdLbl}>
                  Energy and Other Fee Rate
                  <span className="ml-1 text-[10px] font-normal text-slate-400 italic">
                    (Apr-27 = input · grows 5% p.a.)
                  </span>
                </td>
                {energyFeeRateSeries.map((v, i) => (
                  <td key={i} className={
                    v === null ? `${tdNum} text-slate-300`
                    : i === 1  ? `${tdNum} text-blue-700 font-bold`
                    :            `${tdNum} italic text-slate-600`
                  }>
                    {v === null ? '—' : fmtRate(v)}
                  </td>
                ))}
              </tr>
            </SectionTable>
          </div>

          <p className="text-center text-xs text-slate-400 pb-2">
            Each year: Closing = inputs for that year · Next year's opening = prev Closing ·
            Columns driven by Tenure ({tenure} yrs)
          </p>
        </div>
      </div>
    </div>
  )
}
