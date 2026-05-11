import React from 'react'

/**
 * Balance Sheet — placeholder component.
 * Full implementation to follow based on model inputs.
 */
export default function BalanceSheet({ yearLabels = [] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Balance Sheet
          </h2>
          <p className="text-blue-300 text-xs mt-0.5">
            Assets, Liabilities &amp; Equity — year-by-year
          </p>
        </div>
        <span className="text-xs text-blue-300">{yearLabels.length} yr projection</span>
      </div>

      <div className="px-6 py-12 flex flex-col items-center justify-center gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
               a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-semibold text-slate-500">Balance Sheet</p>
        <p className="text-xs text-slate-400 max-w-xs">
          This section is under construction. It will display Assets, Liabilities and Equity
          derived from the P&amp;L and other model inputs.
        </p>
      </div>
    </div>
  )
}
