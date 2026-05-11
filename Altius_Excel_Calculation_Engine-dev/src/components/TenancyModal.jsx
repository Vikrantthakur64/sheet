import React, { useEffect, useRef } from 'react'
import Tenancies from './Tenancies'

/**
 * Full-screen modal — identical layout to ProjectionModal.
 *
 * Props:
 *   open        bool
 *   onClose     fn()
 *   yearLabels  string[]
 *   formData    object  — validated form values from TenancyInputForm
 *   tenure      string
 *   onDownload  fn()
 */
export default function TenancyModal({ open, onClose, yearLabels, formData, tenure, onDownload }) {
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

  if (!open || !formData) return null

  // Quick summary values from form data
  const sc1Label = 'Base Case'
  const sc2Label = 'BP 25 Updated'

  return (
    /* Backdrop — identical to ProjectionModal */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Tenancies Projection"
    >
      {/* Panel — identical classes to ProjectionModal */}
      <div
        ref={panelRef}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[98vw] my-6
                   flex flex-col animate-[fadeSlideIn_0.2s_ease-out]"
        style={{ minHeight: '60vh' }}
      >
        {/* ── Modal header — identical to ProjectionModal ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2045] rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Tenancies Projection</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Tenancy Analysis · {tenure} year projection
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Download button */}
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
              aria-label="Close tenancies projection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Modal body — identical structure to ProjectionModal ── */}
        <div className="flex-1 px-4 md:px-6 py-5 space-y-5 overflow-y-auto">

          {/* Summary cards — tenancy-specific, mirrors SummaryCards style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: `Sc1 New Tenancies YoY`,
                value: `${formData.nt_yoy_1}%`,
                sub: sc1Label,
                color: 'bg-blue-50 border-blue-200',
                text: 'text-blue-700',
              },
              {
                label: `Sc2 New Tenancies YoY`,
                value: `${formData.nt_yoy_2}%`,
                sub: sc2Label,
                color: 'bg-indigo-50 border-indigo-200',
                text: 'text-indigo-700',
              },
              {
                label: `Sc1 Churn YoY`,
                value: `${formData.ch_yoy_1}%`,
                sub: sc1Label,
                color: 'bg-orange-50 border-orange-200',
                text: 'text-orange-700',
              },
              {
                label: `Sc2 Churn YoY`,
                value: `${formData.ch_yoy_2}%`,
                sub: sc2Label,
                color: 'bg-rose-50 border-rose-200',
                text: 'text-rose-700',
              },
            ].map((card) => (
              <div key={card.label}
                className={`border rounded-xl px-4 py-3 shadow-sm ${card.color}`}>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">
                  {card.label}
                </p>
                <p className={`text-2xl font-bold mt-0.5 ${card.text}`}>{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Tenancies projection table */}
          <Tenancies yearLabels={yearLabels} formData={formData} />

          {/* Footer note — identical style to ProjectionModal */}
          <p className="text-center text-xs text-slate-400 pb-2">
            Blue = dataset / form value · Black italic = calculated via prev × (1 + YoY%) ·
            Columns driven by Tenure ({tenure} yrs)
          </p>
        </div>
      </div>
    </div>
  )
}
