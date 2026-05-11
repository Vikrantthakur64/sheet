import React from 'react'
import PLRow from './PLRow'

/**
 * PLTable — renders a titled section with a horizontal year-column table.
 *
 * Props:
 *   sectionNum    number    — section badge number
 *   sectionTitle  string    — section heading
 *   headerColor   string    — Tailwind bg class for the header strip
 *   yearLabels    string[]  — column headers
 *   rows          PLRowDef[]
 *   note          string?   — optional footnote
 *
 * PLRowDef:
 *   label    string
 *   sublabel string?
 *   values   (number | string)[]
 *   format   'number' | 'string'
 *   bold     boolean?
 *   color    string?   — Tailwind text class for value cells
 */
export default function PLTable({
  sectionNum,
  sectionTitle,
  headerColor = 'bg-[#b8d4ea]',
  yearLabels  = [],
  rows        = [],
  note,
}) {
  const thCls = `border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap text-center`

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className={`${headerColor} px-4 py-2.5 flex items-center gap-3 border-b border-slate-200`}>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
                         bg-[#1e3a5f] text-white text-[10px] font-bold shrink-0">
          {sectionNum}
        </span>
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
          {sectionTitle}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-sm w-full"
          style={{ tableLayout: 'auto', minWidth: '100%' }}
        >
          <thead>
            <tr>
              <th
                className={`${thCls} text-left sticky left-0 z-20 bg-slate-50`}
                style={{ minWidth: 240 }}
              >
                Row Name
              </th>
              {yearLabels.map((lbl) => (
                <th key={lbl} className={thCls} style={{ minWidth: 100 }}>
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <PLRow
                key={i}
                label={row.label}
                sublabel={row.sublabel}
                values={row.values}
                format={row.format}
                bold={row.bold}
                color={row.color}
                yearCount={yearLabels.length}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional footnote */}
      {note && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] text-slate-400 italic">{note}</p>
        </div>
      )}
    </div>
  )
}
