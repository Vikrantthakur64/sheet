import React, { useState } from 'react'

/**
 * Ground-Based Towers — two input tables (New Tower Adds + Dismantle Sites).
 *
 * Columns:
 *   Model Scenario  — read-only (1 / 2)
 *   Description     — read-only (Base Case / Updated BP 25)
 *   % Increase      — editable blue input  ← required
 *   Tenure          — read-only, mirrors inputs.tenure from Model Inputs
 *   Current FY (Month) — editable blue input  ← required
 *   Next FY (Month)    — editable blue input  ← required
 *
 * Validation: blocks "Show Projection" if any required field is empty.
 */

const COLUMNS = [
  { key: 'modelScenario',        label: 'Model Scenario',       width: 60,  type: 'number', align: 'center', readonly: true,  required: false },
  { key: 'description',          label: 'Description',          width: 140, type: 'text',   align: 'left',   readonly: true,  required: false },
  { key: 'pctIncrease',          label: '% Increase',           width: 90,  type: 'number', align: 'center', readonly: false, required: true  },
  { key: 'tenure',               label: 'Tenure',               width: 80,  type: 'number', align: 'center', readonly: true,  required: false },
  { key: 'currentFinancialYear', label: 'Current FY (Month)',   width: 120, type: 'number', align: 'center', readonly: false, required: true  },
  { key: 'nextFinancialYear',    label: 'Next FY (Month)',      width: 120, type: 'number', align: 'center', readonly: false, required: true  },
]

/** Returns nested errors: errors[rowIdx][fieldKey] = true */
function validateRows(rows) {
  const errors = {}
  rows.forEach((row, idx) => {
    COLUMNS.forEach((col) => {
      if (!col.required || col.readonly) return
      const val = row[col.key]
      if (val === '' || val === null || val === undefined) {
        if (!errors[idx]) errors[idx] = {}
        errors[idx][col.key] = true
      }
    })
  })
  return errors
}

/** Inject the global tenure value into each row for display */
function rowsWithTenure(rows, tenure) {
  return rows.map((r) => ({ ...r, tenure }))
}

function SectionTable({ title, rows, onChange, errors = {}, tenure }) {
  const thCls = `border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-600
                 bg-slate-50 whitespace-nowrap text-center`

  const displayRows = rowsWithTenure(rows, tenure)

  return (
    <div>
      {/* Sub-section label */}
      <div className="px-4 py-1.5 bg-white border-b border-slate-200">
        <span className="text-xs font-bold text-slate-700 underline">{title}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className={thCls} style={{ minWidth: col.width }}>
                  {col.label}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayRows.map((row, idx) => (
              <tr key={idx} className="bg-white">
                {COLUMNS.map((col) => {
                  const val      = row[col.key] ?? ''
                  const hasError = errors[idx]?.[col.key]

                  return (
                    <td
                      key={col.key}
                      className="border border-slate-300 p-0"
                      style={{ minWidth: col.width }}
                    >
                      {col.readonly ? (
                        /* Read-only cell — grey background, always visible */
                        <div
                          className="px-2 py-[6px] text-xs font-semibold text-slate-700 bg-slate-100"
                          style={{ textAlign: col.align }}
                        >
                          {val}
                        </div>
                      ) : (
                        /* Editable blue input */
                        <div className="relative">
                          <input
                            type={col.type}
                            value={val}
                            placeholder={hasError ? 'Required' : ''}
                            onChange={(e) => onChange(idx, col.key, e.target.value)}
                            style={{ textAlign: col.align }}
                            className={`w-full px-2 py-[6px] text-xs font-semibold border-0
                                        outline-none focus:ring-2 focus:ring-inset tabular-nums
                                        ${hasError
                                          ? 'bg-red-50 text-red-700 placeholder-red-400 focus:ring-red-400'
                                          : 'bg-[#dbeeff] text-blue-800 focus:ring-blue-500'
                                        }`}
                            aria-label={`${col.label} for scenario ${row.modelScenario}`}
                            aria-invalid={hasError}
                          />
                          {hasError && (
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2
                                             text-red-500 text-[10px] font-bold pointer-events-none">
                              !
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ScenarioInputTable({
  towerRows,
  dismantleRows,
  onTowerChange,
  onDismantleChange,
  onShow,
  tenure,           // from inputs.tenure in App — displayed read-only in Tenure column
}) {
  const [towerErrors,     setTowerErrors]     = useState({})
  const [dismantleErrors, setDismantleErrors] = useState({})
  const [attempted,       setAttempted]       = useState(false)

  function handleShow() {
    setAttempted(true)
    const te = validateRows(towerRows)
    const de = validateRows(dismantleRows)
    setTowerErrors(te)
    setDismantleErrors(de)
    if (Object.keys(te).length > 0 || Object.keys(de).length > 0) return
    onShow()
  }

  function clearError(setFn, idx, field) {
    setFn((prev) => {
      const next = { ...prev }
      if (next[idx]) {
        delete next[idx][field]
        if (!Object.keys(next[idx]).length) delete next[idx]
      }
      return next
    })
  }

  function handleTowerChange(idx, field, value) {
    onTowerChange(idx, field, value)
    if (towerErrors[idx]?.[field]) clearError(setTowerErrors, idx, field)
  }

  function handleDismantleChange(idx, field, value) {
    onDismantleChange(idx, field, value)
    if (dismantleErrors[idx]?.[field]) clearError(setDismantleErrors, idx, field)
  }

  const hasAnyError = attempted && (
    Object.keys(towerErrors).length > 0 || Object.keys(dismantleErrors).length > 0
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="bg-[#b8d4ea] px-4 py-2 border-b border-slate-300 flex items-center justify-between">
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
          Ground-Based Towers
        </span>
        <span className="text-xs text-[#1e3a5f]/70">
          Fields marked <span className="text-red-500 font-bold">*</span> are required
        </span>
      </div>

      {/* New Tower Adds */}
      <SectionTable
        title="New Tower Adds"
        rows={towerRows}
        onChange={handleTowerChange}
        errors={towerErrors}
        tenure={tenure}
      />

      <div className="border-t border-slate-200" />

      {/* Dismantle Sites */}
      <SectionTable
        title="Dismantle Sites"
        rows={dismantleRows}
        onChange={handleDismantleChange}
        errors={dismantleErrors}
        tenure={tenure}
      />

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-400">
          All fields marked <span className="text-red-500 font-bold">*</span> are required.
          Projections are shown when you click <strong>Save &amp; Analyze</strong>.
        </p>
      </div>
    </div>
  )
}
