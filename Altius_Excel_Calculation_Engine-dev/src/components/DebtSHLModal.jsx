import { useEffect, useRef } from 'react'

export default function DebtSHLModal({ open, onClose, yearLabels, tenure, schedule }) {
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

  if (!open || !schedule) return null

  const fmt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString() : '—')

  const thCls     = `border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap text-center`
  const tdLbl     = `border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 whitespace-nowrap sticky left-0 z-10`
  const tdLblBold = `border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 whitespace-nowrap sticky left-0 z-10`
  const tdNum     = `border border-slate-200 px-3 py-2 text-xs text-right tabular-nums font-medium text-slate-700`
  const tdNumBold = `border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 text-right tabular-nums`

  function SepRow() {
    return <tr><td colSpan={yearLabels.length + 1} className="border-t-2 border-slate-300 p-0 h-0" /></tr>
  }

  const yr1 = schedule[0] || {}

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Debt SHL Projection"
    >
      <div
        ref={panelRef}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-full max-w-[98vw] my-6
                   flex flex-col animate-[fadeSlideIn_0.2s_ease-out]"
        style={{ minHeight: '60vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2045] rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Debt — SHL Projection</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Shareholder Loan Schedule · {tenure} year projection
            </p>
          </div>
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

        {/* Body */}
        <div className="flex-1 px-4 md:px-6 py-5 space-y-6 overflow-y-auto">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Opening Balance (Yr 1)', value: fmt(yr1.opening),     color: 'bg-blue-50   border-blue-200   text-blue-700'   },
              { label: 'Closing Balance (Yr 1)', value: fmt(yr1.closing),     color: 'bg-indigo-50  border-indigo-200  text-indigo-700'  },
              { label: 'Finance Cost (Yr 1)',    value: fmt(yr1.financeCost), color: 'bg-orange-50  border-orange-200  text-orange-700'  },
            ].map((card) => {
              const [bg, border, txt] = card.color.split(' ')
              return (
                <div key={card.label} className={`border rounded-xl px-4 py-3 shadow-sm ${bg} ${border}`}>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate">{card.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${txt}`}>{card.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">INR MM</p>
                </div>
              )
            })}
          </div>

          {/* Schedule table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-[#b8d4ea] px-4 py-2 border-b border-slate-300">
              <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
                Debt SHL Schedule — Year-by-Year (INR MM)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm" style={{ tableLayout: 'auto', minWidth: '100%' }}>
                <thead>
                  <tr>
                    <th className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`} style={{ minWidth: 200 }}>
                      Line Item
                    </th>
                    {yearLabels.map((lbl) => (
                      <th key={lbl} className={thCls} style={{ minWidth: 110 }}>{lbl}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className={tdLbl}>Opening</td>
                    {schedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.opening)}</td>)}
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className={tdLbl}>Addition</td>
                    {schedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.additions)}</td>)}
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className={tdLbl}>Repayment</td>
                    {schedule.map((r, i) => <td key={i} className={tdNum}>{fmt(r.repayments)}</td>)}
                  </tr>
                  <tr>
                    <td className={tdLblBold}>Closing</td>
                    {schedule.map((r, i) => <td key={i} className={tdNumBold}>{fmt(r.closing)}</td>)}
                  </tr>
                  <SepRow />
                  <tr>
                    <td className={tdLblBold}>Finance Cost</td>
                    {schedule.map((r, i) => <td key={i} className={tdNumBold}>{fmt(r.financeCost)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 pb-2">
            All values in INR MM · Finance Cost = avg(Opening, Closing) × Interest Rate · Tenure ({tenure} yrs)
          </p>
        </div>
      </div>
    </div>
  )
}
