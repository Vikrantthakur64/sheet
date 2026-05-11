import React from 'react'

/**
 * Model Inputs panel.
 *
 * Fields:
 *   Year Start          — fixed read-only, displayed as DD/MM/YYYY (01/04/2026)
 *   Tenure              — editable blue input (Yrs)
 *   Equity Contribution — editable blue input (INR MM)
 *
 * YoY Growth % has been removed — it is now per-scenario in the Ground-Based Towers table.
 */
export default function InputSection({ inputs, onChange, errors }) {
  const inputBlue = `w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2
    focus:ring-blue-500 bg-[#dbeeff] border-blue-300 text-blue-900 font-semibold`
  const inputErr  = `w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2
    focus:ring-red-400 bg-red-50 border-red-400 text-red-900 font-semibold`

  // Format the stored yearStart (e.g. "2026") as "01/04/2026"
  function formatYearStart(val) {
    const yr = parseInt(val, 10)
    if (isNaN(yr)) return '01/04/2026'
    return `01/04/${yr}`
  }

  const editableFields = [
    { id: 'tenure',             label: 'Tenure',                          unit: 'Yrs',    placeholder: '9'      },
    { id: 'equityContribution', label: 'Equity contribution by investor', unit: 'INR MM', placeholder: '79.000' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section title bar */}
      <div className="bg-[#0d2045] px-5 py-2.5">
        <h2 className="text-xs font-bold text-white uppercase tracking-widest">Model Inputs</h2>
      </div>

      <div className="divide-y divide-slate-100">

        {/* File Name — editable */}
        <div className="grid grid-cols-[1fr_80px_200px] items-center px-5 py-2 gap-4">
          <label htmlFor="fileName" className="text-sm text-slate-700 font-medium">
            File Name
          </label>
          <span className="text-xs text-slate-400 italic text-right">—</span>
          <input
            id="fileName"
            type="text"
            value={inputs.fileName ?? ''}
            placeholder="e.g. Model_FY26"
            onChange={(e) => onChange('fileName', e.target.value)}
            className={inputBlue}
          />
        </div>

        {/* Year Start — fixed read-only */}
        <div className="grid grid-cols-[1fr_80px_200px] items-center px-5 py-2 gap-4">
          <span className="text-sm text-slate-700 font-medium">Year Start</span>
          <span className="text-xs text-slate-400 italic text-right">Date</span>
          <div
            className="w-full border rounded px-2 py-1.5 text-sm bg-slate-100
                       border-slate-300 text-slate-600 font-semibold select-none"
            title="Fixed start date — 1st April of the year start"
          >
            {formatYearStart(inputs.yearStart)}
          </div>
        </div>

        {/* Editable fields */}
        {editableFields.map((f) => {
          const hasErr = !!errors[f.id]
          return (
            <div key={f.id} className="grid grid-cols-[1fr_80px_200px] items-center px-5 py-2 gap-4">
              <label htmlFor={f.id} className="text-sm text-slate-700 font-medium">
                {f.label}
              </label>
              <span className="text-xs text-slate-400 italic text-right">{f.unit}</span>
              <div>
                <input
                  id={f.id}
                  type="number"
                  value={inputs[f.id]}
                  placeholder={f.placeholder}
                  onChange={(e) => onChange(f.id, e.target.value)}
                  className={hasErr ? inputErr : inputBlue}
                  aria-describedby={hasErr ? `${f.id}-err` : undefined}
                  aria-invalid={hasErr}
                />
                {hasErr && (
                  <p id={`${f.id}-err`} role="alert" className="text-xs text-red-600 mt-0.5">
                    {errors[f.id]}
                  </p>
                )}
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
