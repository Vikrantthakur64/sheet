import React from 'react'

/**
 * PLRow — a single data row in a PLTable.
 *
 * Props:
 *   label      string
 *   sublabel   string?
 *   values     (number | string)[]
 *   format     'number' | 'string'
 *   bold       boolean?
 *   color      string?   — Tailwind text class for value cells
 *   yearCount  number
 */
export default function PLRow({
  label,
  sublabel,
  values    = [],
  format    = 'number',
  bold      = false,
  color     = '',
  yearCount = 0,
}) {
  const tdLbl = `border border-slate-200 px-3 py-2.5 text-xs bg-slate-50
                 whitespace-nowrap sticky left-0 z-10
                 ${bold ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`

  const tdVal = `border border-slate-200 px-3 py-2.5 text-xs text-right tabular-nums
                 ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}
                 ${color || ''}`

  function formatValue(v) {
    if (v === '—' || v === null || v === undefined) return '—'
    if (format === 'string') return String(v)
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    // Format as INR MM with 2 decimal places
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <tr className="bg-white hover:bg-slate-50 transition-colors">
      <td className={tdLbl}>
        {label}
        {sublabel && (
          <span className="ml-1.5 text-[10px] font-normal text-slate-400 italic">
            ({sublabel})
          </span>
        )}
      </td>
      {Array.from({ length: yearCount }, (_, i) => (
        <td key={i} className={tdVal}>
          {formatValue(values[i])}
        </td>
      ))}
    </tr>
  )
}
