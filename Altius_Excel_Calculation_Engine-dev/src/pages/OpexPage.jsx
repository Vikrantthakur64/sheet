import { useState, useEffect, useRef } from 'react'
import { computeOpex } from '../utils/calculation'
import { saveSession } from '../api/db'
import OpexModal from '../components/OpexModal'

function buildSeries(baseVal, yoyPct, count) {
  const base = Number(baseVal) || 0
  const rate = (Number(yoyPct) || 0) / 100
  const arr  = []
  let v = base
  for (let i = 0; i < count; i++) {
    arr.push(v)
    v *= (1 + rate)
  }
  return arr
}

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
  'leaseRentBase',
  'energyBase',
  'rAndMBase',
  'adminBase',
  'onRollTotal',
  'offRollTotal',
]

function validate(form) {
  const errors = {}
  REQUIRED_FIELDS.forEach((k) => {
    if (form[k] === '' || form[k] === null || form[k] === undefined) errors[k] = true
  })
  return errors
}

const INITIAL_FORM = {
  leaseRentBase: '', leaseRentYoy: '',
  energyBase: '', energyYoy: '',
  rAndMBase: '', rAndMYoy: '',
  adminBase: '', adminYoy: '',
  onRollCount: '', onRollTotal: '', onRollYoy: '',
  offRollCount: '', offRollTotal: '', offRollYoy: '',
}

export default function OpexPage({
  tenure       = '9',
  yearLabels   = [],
  avgTowers    = [],
  avgTenancies = [],
  onFormSave   = null,
  onOpexResult = null,
  initialForm  = null,
  triggerAutoSave = 0,
}) {
  const count = yearLabels.length

  const [form,       setForm]       = useState(() => {
    try {
      const saved = localStorage.getItem('fmd_form_opex')
      return saved ? JSON.parse(saved) : INITIAL_FORM
    } catch { return INITIAL_FORM }
  })
  const [errors,     setErrors]     = useState({})
  const [attempted,  setAttempted]  = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const [opexResult, setOpexResult] = useState(null)

  const _restoreRef = useRef(false)
  useEffect(() => {
    if (initialForm && !_restoreRef.current) {
      setForm(initialForm)
      _restoreRef.current = true
    }
  }, [initialForm])

  // Shared computation — used by both manual save and auto-save
  function computeAndPublish(f, towers, tenancies) {
    const n = (yearLabels.length) || 1
    const towersArr    = towers.length    ? towers    : Array(n).fill(0)
    const tenanciesArr = tenancies.length ? tenancies : Array(n).fill(0)

    const leaseRentPerSite       = buildSeries(f.leaseRentBase, f.leaseRentYoy, n)
    const energyChargesPerTenant = buildSeries(f.energyBase,    f.energyYoy,    n)
    const rAndMPerSite           = buildSeries(f.rAndMBase,     f.rAndMYoy,     n)
    const adminCost              = buildSeries(f.adminBase,     f.adminYoy,     n)
    const onRollSalary           = buildSeries(f.onRollTotal,   f.onRollYoy,    n)
    const offRollSalary          = buildSeries(f.offRollTotal,  f.offRollYoy,   n)
    const totalSalaryCost        = onRollSalary.map((v, i) => v + offRollSalary[i])

    const rows = computeOpex(towersArr, tenanciesArr, {
      leaseRentPerSite, energyChargesPerTenant, rAndMPerSite, adminCost, totalSalaryCost,
    })
    const result = {
      rows,
      rates: { leaseRentPerSite, energyChargesPerTenant, rAndMPerSite },
      onRollSalary,
      offRollSalary,
    }
    if (onFormSave)   onFormSave({ ...f })
    if (onOpexResult) onOpexResult(result)
    return result
  }

  // Auto-save when parent triggers it — compute + publish even without validation
  useEffect(() => {
    if (triggerAutoSave > 0) {
      const result = computeAndPublish(form, avgTowers, avgTenancies)
      setOpexResult(result)
    }
  }, [triggerAutoSave]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(id, value) {
    setForm((prev) => {
      const next = { ...prev, [id]: value }
      saveSession({ opex_form: next })
      return next
    })
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleShow() {
    setAttempted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const result = computeAndPublish(form, avgTowers, avgTenancies)
    setOpexResult(result)
    setShowModal(true)
  }

  const hasAnyError = attempted && Object.keys(errors).length > 0

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Opex</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Fill all required fields, then click Show Opex Projection
            </p>
          </div>
          <span className="text-xs text-blue-300">
            Tenure: <strong className="text-white">{tenure} yrs</strong>
          </span>
        </div>

        <div className="p-5 space-y-4">

          {/* Lease Rent */}
          <SectionCard title="Lease Rent" subtitle="INR / tower / month">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year 1 Rate per Site" id="leaseRentBase" value={form.leaseRentBase}
                onChange={handleChange} hasError={errors.leaseRentBase}
                unit="INR/tower/month" placeholder="e.g. 40000" />
              <Field label="YoY Escalation" id="leaseRentYoy" value={form.leaseRentYoy}
                onChange={handleChange} hasError={false}
                unit="%" placeholder="e.g. 5" required={false} />
            </div>
          </SectionCard>

          {/* Energy Charges */}
          <SectionCard title="Energy Charges" subtitle="INR / tenant / month (cost to company)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year 1 Rate per Tenant" id="energyBase" value={form.energyBase}
                onChange={handleChange} hasError={errors.energyBase}
                unit="INR/tenant/month" placeholder="e.g. 3500" />
              <Field label="YoY Escalation" id="energyYoy" value={form.energyYoy}
                onChange={handleChange} hasError={false}
                unit="%" placeholder="e.g. 0" required={false} />
            </div>
          </SectionCard>

          {/* R&M */}
          <SectionCard title="R&amp;M" subtitle="INR / tower / month">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year 1 Rate per Site" id="rAndMBase" value={form.rAndMBase}
                onChange={handleChange} hasError={errors.rAndMBase}
                unit="INR/tower/month" placeholder="e.g. 5000" />
              <Field label="YoY Escalation" id="rAndMYoy" value={form.rAndMYoy}
                onChange={handleChange} hasError={false}
                unit="%" placeholder="e.g. 3" required={false} />
            </div>
          </SectionCard>

          {/* Admin Cost */}
          <SectionCard title="Admin Cost" subtitle="INR MM per year">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year 1 Base" id="adminBase" value={form.adminBase}
                onChange={handleChange} hasError={errors.adminBase}
                unit="INR MM" placeholder="e.g. 882" />
              <Field label="YoY Escalation" id="adminYoy" value={form.adminYoy}
                onChange={handleChange} hasError={false}
                unit="%" placeholder="e.g. 5" required={false} />
            </div>
          </SectionCard>

          {/* Salary */}
          <SectionCard title="Salary" subtitle="Cost grows by YoY% — headcount stays fixed">

            {/* On Roll */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
                                 bg-[#1e3a5f] text-white text-[9px] font-bold shrink-0">1</span>
                On Roll
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Headcount" id="onRollCount" value={form.onRollCount}
                  onChange={handleChange} hasError={false}
                  unit="#" placeholder="e.g. 170" required={false} />
                <Field label="Year 1 Total Cost" id="onRollTotal" value={form.onRollTotal}
                  onChange={handleChange} hasError={errors.onRollTotal}
                  unit="INR MM" placeholder="e.g. 270" />
                <Field label="YoY Escalation" id="onRollYoy" value={form.onRollYoy}
                  onChange={handleChange} hasError={false}
                  unit="%" placeholder="e.g. 6" required={false} />
              </div>
              {form.onRollCount !== '' && form.onRollTotal !== '' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Implied rate: {(Number(form.onRollTotal) / (Number(form.onRollCount) || 1)).toFixed(2)} INR MM/person/yr
                </p>
              )}
            </div>

            {/* Off Roll */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
                                 bg-[#1e3a5f] text-white text-[9px] font-bold shrink-0">2</span>
                Off Roll
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Headcount" id="offRollCount" value={form.offRollCount}
                  onChange={handleChange} hasError={false}
                  unit="#" placeholder="e.g. 57" required={false} />
                <Field label="Year 1 Total Cost" id="offRollTotal" value={form.offRollTotal}
                  onChange={handleChange} hasError={errors.offRollTotal}
                  unit="INR MM" placeholder="e.g. 48" />
                <Field label="YoY Escalation" id="offRollYoy" value={form.offRollYoy}
                  onChange={handleChange} hasError={false}
                  unit="%" placeholder="e.g. 5" required={false} />
              </div>
              {form.offRollCount !== '' && form.offRollTotal !== '' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Implied rate: {(Number(form.offRollTotal) / (Number(form.offRollCount) || 1)).toFixed(2)} INR MM/person/yr
                </p>
              )}
            </div>

            {form.onRollTotal !== '' && form.offRollTotal !== '' && (
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                <p className="text-xs text-blue-700 font-medium">
                  Year 1 Total Salary:{' '}
                  <strong>
                    {((Number(form.onRollTotal) || 0) + (Number(form.offRollTotal) || 0)).toFixed(0)}
                  </strong>{' '}INR MM
                  {form.onRollCount !== '' && form.offRollCount !== '' && (
                    <>&nbsp;·&nbsp; Headcount:{' '}
                      <strong>{(Number(form.onRollCount) || 0) + (Number(form.offRollCount) || 0)}</strong>
                    </>
                  )}
                </p>
              </div>
            )}
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
                Please fill in all required fields before showing the projection.
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
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Save Opex
          </button>
        </div>
      </div>

      <OpexModal
        open={showModal}
        onClose={() => setShowModal(false)}
        yearLabels={yearLabels}
        tenure={tenure}
        opexResult={opexResult}
      />
    </>
  )
}
