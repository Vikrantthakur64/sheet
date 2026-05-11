import React, { useEffect, useRef } from 'react'
import DataTable    from './DataTable'
import SummaryCards from './SummaryCards'

/**
 * Full-screen modal overlay that contains the projection table.
 * Closes on Escape key or clicking the backdrop / × button.
 *
 * Props:
 *   open            bool
 *   onClose         fn()
 *   yearLabels      string[]
 *   scenarioId      number
 *   onScenarioChange fn(id)
 *   growthPct       number
 *   cells           object
 *   onCellChange    fn(key, value)
 *   allSeries       object
 *   scenarioRows    array
 *   dismantleRows   array
 *   tenure          string  — for footer note
 *   onDownload      fn()
 */
export default function ProjectionModal({
  open,
  onClose,
  yearLabels,
  scenarioId,
  onScenarioChange,
  growthPct,
  cells,
  onCellChange,
  allSeries,
  scenarioRows,
  dismantleRows,
  tenure,
  onDownload,
}) {
  const panelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Projection Table"
    >
      {/* Panel */}
      <div
        ref={panelRef}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[98vw] my-6
                   flex flex-col animate-[fadeSlideIn_0.2s_ease-out]"
        style={{ minHeight: '60vh' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2045] rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Projection Table</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Ground-Based Towers · {tenure} year projection
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Download button inside modal */}
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500
                         text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download Excel
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full
                         bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close projection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 px-4 md:px-6 py-5 space-y-5 overflow-y-auto">
          {/* Summary cards */}
          <SummaryCards
            towerAdds={allSeries.sel_tower}
            dismantle={allSeries.sel_dm}
          />

          {/* Projection table */}
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
          />

          <p className="text-center text-xs text-slate-400 pb-2">
            Blue = editable (Apr-26 = Current FY · Apr-27 = Next FY) ·
            Black italic = calculated via prev × (1 + YoY%) ·
            Columns driven by Tenure ({tenure} yrs)
          </p>
        </div>
      </div>
    </div>
  )
}
