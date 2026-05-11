import { useState, useEffect, useRef } from 'react'
import { saveSession } from '../api/db'

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

const REQUIRED_FIELDS = [
  'receivableDays', 'payableDays',
  'minCash'

]

function validate(form) {
  const errors = {}
  REQUIRED_FIELDS.forEach((k) => {
    if (form[k] === '' || form[k] === null || form[k] === undefined) errors[k] = true
  })
  return errors
}

const INITIAL_FORM = {
  receivableDays: '', payableDays: '',
  minCash: '', openingCash: '',
  deposits: '',
  openingReceivables: '', openingPayables: '',
  shareCapital: '', openingRetained: '',
}

export default function OtherAssumptionsPage({ tenure = '9', onFormSave = null, initialForm = null, triggerAutoSave = 0 }) {
  const [form,      setForm]      = useState(() => {
    try {
      const saved = localStorage.getItem('fmd_form_assumptions')
      return saved ? JSON.parse(saved) : INITIAL_FORM
    } catch { return INITIAL_FORM }
  })
  const [errors,    setErrors]    = useState({})
  const [attempted, setAttempted] = useState(false)
  const [saved,     setSaved]     = useState(false)

  const _restoreRef = useRef(false)
  useEffect(() => {
    if (initialForm && !_restoreRef.current) {
      setForm(initialForm)
      _restoreRef.current = true
    }
  }, [initialForm])

  // Auto-save when parent triggers it
  useEffect(() => {
    if (triggerAutoSave > 0 && onFormSave) onFormSave({ ...form })
  }, [triggerAutoSave]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(id, value) {
    setForm((prev) => {
      const next = { ...prev, [id]: value }
      saveSession({ assumptions_form: next })
      return next
    })
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSaved(false)
  }

  function handleSave() {
    setAttempted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    if (onFormSave) onFormSave({ ...form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasAnyError = attempted && Object.keys(errors).length > 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Other Assumptions</h2>
          <p className="text-blue-300 text-xs mt-0.5">
            Opening balance sheet & working capital parameters
          </p>
        </div>
        <span className="text-xs text-blue-300">
          Tenure: <strong className="text-white">{tenure} yrs</strong>
        </span>
      </div>

      <div className="p-5 space-y-4">

        {/* Working Capital */}
        <SectionCard title="Working Capital" subtitle="Days outstanding">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Receivable Days" id="receivableDays" value={form.receivableDays}
              onChange={handleChange} hasError={errors.receivableDays}
              unit="days" placeholder="e.g. 60" />
            <Field label="Payable Days" id="payableDays" value={form.payableDays}
              onChange={handleChange} hasError={errors.payableDays}
              unit="days" placeholder="e.g. 50" />
          </div>
        </SectionCard>

        {/* Cash */}
        <SectionCard title="Cash" subtitle="INR MM">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum Cash Balance" id="minCash" value={form.minCash}
              onChange={handleChange} hasError={errors.minCash}
              unit="INR MM" placeholder="e.g. 4500" />
            {/* <Field label="Opening Cash (Year 1 start)" id="openingCash" value={form.openingCash}
              onChange={handleChange} hasError={errors.openingCash}
              unit="INR MM" placeholder="e.g. 8768" /> */}
          </div>
        </SectionCard>

        {/* Other Assets */}
        {/* <SectionCard title="Other Assets" subtitle="INR MM (constant)">
          <div className="grid grid-cols-1 gap-3" style={{ maxWidth: 280 }}>
            <Field label="Deposits / Other Assets" id="deposits" value={form.deposits}
              onChange={handleChange} hasError={errors.deposits}
              unit="INR MM" placeholder="e.g. 4180" />
          </div>
        </SectionCard> */}

        {/* Opening Balance Sheet */}
        {/* <SectionCard title="Opening Balance Sheet" subtitle="Values at start of Year 1 (INR MM)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Trade Receivables" id="openingReceivables" value={form.openingReceivables}
              onChange={handleChange} hasError={errors.openingReceivables}
              unit="INR MM" placeholder="e.g. 9786" />
            <Field label="Opening Trade Payables" id="openingPayables" value={form.openingPayables}
              onChange={handleChange} hasError={errors.openingPayables}
              unit="INR MM" placeholder="e.g. 6009" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Share Capital" id="shareCapital" value={form.shareCapital}
              onChange={handleChange} hasError={errors.shareCapital}
              unit="INR MM" placeholder="e.g. 7986" />
            <Field label="Opening Retained Earnings" id="openingRetained" value={form.openingRetained}
              onChange={handleChange} hasError={errors.openingRetained}
              unit="INR MM" placeholder="e.g. 10032" />
          </div>
        </SectionCard> */}

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
              Please fill in all required fields.
            </p>
          ) : saved ? (
            <p className="text-xs text-emerald-600 font-medium">✓ Assumptions saved</p>
          ) : (
            <p className="text-xs text-slate-400">
              All fields marked <span className="text-red-500 font-bold">*</span> are required.
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white
                     text-xs font-semibold px-5 py-2 rounded-lg transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Save Assumptions
        </button>
      </div>
    </div>
  )
}
