import { useState, useEffect, useRef } from 'react'
import { TENANCY_SCENARIOS } from '../data/scenarios'

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, id, value, onChange, hasError, unit, placeholder = '', required = true }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={id} className="text-xs text-slate-600 font-medium">
        {label}
        {unit && <span className="text-slate-400 font-normal ml-1">({unit})</span>}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        placeholder={hasError ? 'Required' : placeholder}
        onChange={(e) => onChange(id, e.target.value)}
        style={{ textAlign: 'center' }}
        className={`w-full px-2 py-1.5 text-xs font-semibold rounded border outline-none
                    focus:ring-2 focus:ring-inset tabular-nums
                    ${hasError
                      ? 'bg-red-50 border-red-400 text-red-700 placeholder-red-400 focus:ring-red-400'
                      : 'bg-[#dbeeff] border-blue-300 text-blue-800 focus:ring-blue-500'
                    }`}
        aria-invalid={hasError}
      />
      {hasError && <span className="text-red-500 text-[10px]">Required</span>}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-[#b8d4ea] px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">{title}</span>
        {subtitle && <span className="text-[10px] text-[#1e3a5f]/70 italic">{subtitle}</span>}
      </div>
      <div className="p-4 bg-white space-y-4">{children}</div>
    </div>
  )
}

// ── Scenario label row ────────────────────────────────────────────────────────
function ScenarioLabel({ num, label }) {
  return (
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
                       bg-[#1e3a5f] text-white text-[9px] font-bold shrink-0">
        {num}
      </span>
      {label}
    </p>
  )
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(form, tenure) {
  const e = {}
  const count = Math.max(1, parseInt(tenure, 10) || 9)

  // New Tenancies
  ;[1, 2].forEach((s) => {
    if (!form[`nt_yoy_${s}`])    e[`nt_yoy_${s}`]    = true
    if (!form[`nt_curFY_${s}`])  e[`nt_curFY_${s}`]  = true
    if (!form[`nt_nextFY_${s}`]) e[`nt_nextFY_${s}`] = true
  })

  // Churn
  ;[1, 2].forEach((s) => {
    if (!form[`ch_yoy_${s}`])    e[`ch_yoy_${s}`]    = true
    if (!form[`ch_curFY_${s}`])  e[`ch_curFY_${s}`]  = true
    if (!form[`ch_nextFY_${s}`]) e[`ch_nextFY_${s}`] = true
  })

  // IP Fee Escalation — Base Case + Case 2: curFY + nextFY
  ;['base', 'case2'].forEach((sc) => {
    if (!form[`ip_curFY_${sc}`])  e[`ip_curFY_${sc}`]  = true
    if (!form[`ip_nextFY_${sc}`]) e[`ip_nextFY_${sc}`] = true
  })

  // Land Lease Recovery — Base Case + BP 25: all year columns
  ;['base', 'bp25'].forEach((sc) => {
    for (let i = 0; i < count; i++) {
      if (!form[`ll_${sc}_${i}`]) e[`ll_${sc}_${i}`] = true
    }
  })

  // Write-Off — single value per row
  ;['ipFees', 'energyRev', 'others'].forEach((k) => {
    if (!form[`wo_${k}`]) e[`wo_${k}`] = true
  })

  return e
}

// ── Build empty form ──────────────────────────────────────────────────────────
function buildEmptyForm(tenure) {
  const count = Math.max(1, parseInt(tenure, 10) || 9)
  const form = {
    // New Tenancies
    nt_yoy_1: '', nt_curFY_1: '', nt_nextFY_1: '',
    nt_yoy_2: '', nt_curFY_2: '', nt_nextFY_2: '',
    // Churn
    ch_yoy_1: '', ch_curFY_1: '', ch_nextFY_1: '',
    ch_yoy_2: '', ch_curFY_2: '', ch_nextFY_2: '',
    // IP Fee Escalation
    ip_curFY_base: '', ip_nextFY_base: '',
    ip_curFY_case2: '', ip_nextFY_case2: '',
    // Write-Off
    wo_ipFees: '', wo_energyRev: '', wo_others: '',
  }
  // Land Lease — per-year per-scenario
  ;['base', 'bp25'].forEach((sc) => {
    for (let i = 0; i < count; i++) {
      form[`ll_${sc}_${i}`] = ''
    }
  })
  return form
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TenancyInputForm({ onShow, tenure, initialForm = null, triggerAutoSave = 0 }) {
  const count = Math.max(1, parseInt(tenure, 10) || 9)

  const [form,      setForm]      = useState(() => buildEmptyForm(tenure))
  const [errors,    setErrors]    = useState({})
  const [attempted, setAttempted] = useState(false)

  const _restoreRef = useRef(false)
  useEffect(() => {
    if (initialForm && !_restoreRef.current) {
      setForm(initialForm)
      _restoreRef.current = true
    }
  }, [initialForm])

  // Auto-save when parent triggers it (Save & Analyze)
  useEffect(() => {
    if (triggerAutoSave > 0) onShow(form)
  }, [triggerAutoSave]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(id, value) {
    setForm((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleShow() {
    setAttempted(true)
    const errs = validate(form, tenure)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onShow(form)
  }

  const hasAnyError = attempted && Object.keys(errors).length > 0

  // Year column labels for Land Lease
  const yearLabels = Array.from({ length: count }, (_, i) => `Yr ${i + 1}`)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Tenancies</h2>
          <p className="text-blue-300 text-xs mt-0.5">Fill all required fields, then click Show Tenancies</p>
        </div>
        <span className="text-xs text-blue-300">
          Tenure: <strong className="text-white">{tenure} yrs</strong>
        </span>
      </div>

      <div className="p-5 space-y-4">

        {/* ── 1. New Tenancies ── */}
        <SectionCard title="New Tenancies">
          {[1, 2].map((s) => (
            <div key={s}>
              <ScenarioLabel num={s} label={TENANCY_SCENARIOS[s].label} />
              <div className="grid grid-cols-3 gap-3 mt-2">
                <Field label="YoY %" id={`nt_yoy_${s}`} value={form[`nt_yoy_${s}`]}
                  onChange={handleChange} hasError={errors[`nt_yoy_${s}`]}
                  unit="%" placeholder="e.g. 5" />
                <Field label="Current FY" id={`nt_curFY_${s}`} value={form[`nt_curFY_${s}`]}
                  onChange={handleChange} hasError={errors[`nt_curFY_${s}`]}
                  unit="Month" placeholder="e.g. 240" />
                <Field label="Next FY" id={`nt_nextFY_${s}`} value={form[`nt_nextFY_${s}`]}
                  onChange={handleChange} hasError={errors[`nt_nextFY_${s}`]}
                  unit="Month" placeholder="e.g. 266" />
              </div>
            </div>
          ))}
        </SectionCard>

        {/* ── 2. Churn ── */}
        <SectionCard title="Churn (%)">
          {[1, 2].map((s) => (
            <div key={s}>
              <ScenarioLabel num={s} label={TENANCY_SCENARIOS[s].label} />
              <div className="grid grid-cols-3 gap-3 mt-2">
                <Field label="YoY %" id={`ch_yoy_${s}`} value={form[`ch_yoy_${s}`]}
                  onChange={handleChange} hasError={errors[`ch_yoy_${s}`]}
                  unit="%" placeholder="e.g. 5" />
                <Field label="Current FY" id={`ch_curFY_${s}`} value={form[`ch_curFY_${s}`]}
                  onChange={handleChange} hasError={errors[`ch_curFY_${s}`]}
                  unit="%" placeholder="e.g. 0.50" />
                <Field label="Next FY" id={`ch_nextFY_${s}`} value={form[`ch_nextFY_${s}`]}
                  onChange={handleChange} hasError={errors[`ch_nextFY_${s}`]}
                  unit="%" placeholder="e.g. 0.55" />
              </div>
            </div>
          ))}
        </SectionCard>

        {/* ── 3. IP Fee Escalation ── */}
        <SectionCard
          title="IP Fee Escalation (%)"
          subtitle="Current FY + Next FY per scenario · remaining years = Next FY"
        >
          {[
            { key: 'base',  label: 'Base Case' },
            { key: 'case2', label: 'Case 2'    },
          ].map((sc, idx) => (
            <div key={sc.key}>
              <ScenarioLabel num={idx + 1} label={sc.label} />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field
                  label="Current FY"
                  id={`ip_curFY_${sc.key}`}
                  value={form[`ip_curFY_${sc.key}`]}
                  onChange={handleChange}
                  hasError={errors[`ip_curFY_${sc.key}`]}
                  unit="%"
                  placeholder="e.g. 4"
                />
                <Field
                  label="Next FY"
                  id={`ip_nextFY_${sc.key}`}
                  value={form[`ip_nextFY_${sc.key}`]}
                  onChange={handleChange}
                  hasError={errors[`ip_nextFY_${sc.key}`]}
                  unit="% — repeats for all years"
                  placeholder="e.g. 5"
                />
              </div>
            </div>
          ))}
        </SectionCard>

        {/* ── 4. Land Lease Recovery Profile ── */}
        <SectionCard
          title="Land Lease Recovery Profile (%)"
          subtitle={`Enter value for each of the ${count} years manually`}
        >
          {[
            { key: 'base', label: 'Base Case' },
            { key: 'bp25', label: 'BP 25'     },
          ].map((sc, idx) => (
            <div key={sc.key}>
              <ScenarioLabel num={idx + 1} label={sc.label} />
              <div className="mt-2 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {yearLabels.map((yr, i) => (
                    <div key={i} className="flex flex-col gap-0.5" style={{ minWidth: 64 }}>
                      <label className="text-[10px] text-slate-500 text-center font-medium">
                        {yr}
                        <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        value={form[`ll_${sc.key}_${i}`] ?? ''}
                        onChange={(e) => handleChange(`ll_${sc.key}_${i}`, e.target.value)}
                        placeholder={errors[`ll_${sc.key}_${i}`] ? '!' : '%'}
                        style={{ textAlign: 'center' }}
                        className={`w-full px-1 py-1.5 text-xs font-semibold rounded border outline-none
                                    focus:ring-2 focus:ring-inset tabular-nums
                                    ${errors[`ll_${sc.key}_${i}`]
                                      ? 'bg-red-50 border-red-400 text-red-700 placeholder-red-400 focus:ring-red-400'
                                      : 'bg-[#dbeeff] border-blue-300 text-blue-800 focus:ring-blue-500'
                                    }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </SectionCard>

        {/* ── 5. Write-Off of Receivables ── */}
        <SectionCard
          title="Write-Off of Receivables — IP Fee (%)"
          subtitle="Single value auto-fills all year columns"
        >
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'ipFees',    label: 'IP Fees',     placeholder: 'e.g. 2' },
              { key: 'energyRev', label: 'Energy Rev',  placeholder: 'e.g. 1' },
              { key: 'others',    label: 'Others',      placeholder: 'e.g. 0.5' },
            ].map((row) => (
              <div key={row.key} className="flex flex-col gap-0.5">
                <label className="text-xs text-slate-600 font-medium">
                  {row.label}
                  <span className="text-slate-400 font-normal ml-1">(% — all years)</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  value={form[`wo_${row.key}`]}
                  placeholder={errors[`wo_${row.key}`] ? 'Required' : row.placeholder}
                  onChange={(e) => handleChange(`wo_${row.key}`, e.target.value)}
                  style={{ textAlign: 'center' }}
                  className={`w-full px-2 py-1.5 text-xs font-semibold rounded border outline-none
                              focus:ring-2 focus:ring-inset tabular-nums
                              ${errors[`wo_${row.key}`]
                                ? 'bg-red-50 border-red-400 text-red-700 placeholder-red-400 focus:ring-red-400'
                                : 'bg-[#dbeeff] border-blue-300 text-blue-800 focus:ring-blue-500'
                              }`}
                  aria-invalid={!!errors[`wo_${row.key}`]}
                />
                {errors[`wo_${row.key}`] && (
                  <span className="text-red-500 text-[10px]">Required</span>
                )}
                {/* Preview: show auto-fill note */}
                {form[`wo_${row.key}`] !== '' && (
                  <span className="text-[10px] text-slate-400 text-center">
                    → fills all {tenure} yrs with {form[`wo_${row.key}`]}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
        <div>
          {hasAnyError ? (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Please fill in all required fields before saving.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              All fields marked <span className="text-red-500 font-bold">*</span> are required.
            </p>
          )}
        </div>
        <button
          onClick={handleShow}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white
                     text-xs font-semibold px-5 py-2 rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Save Tenancies
        </button>
      </div>
    </div>
  )
}
