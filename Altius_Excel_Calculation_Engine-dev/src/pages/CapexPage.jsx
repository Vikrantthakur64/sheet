import { useState, useEffect, useRef } from 'react'
import { computeCapexSchedule, computePPESchedule } from '../utils/calculation'
import { saveSession } from '../api/db'
import CapexModal from '../components/CapexModal'

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
  'capexBase', 'capexYoy',
  'maintenanceBase', 'maintenanceYoy',
]

function validate(form) {
  const errors = {}
  REQUIRED_FIELDS.forEach((k) => {
    if (form[k] === '' || form[k] === null || form[k] === undefined) errors[k] = true
  })
  return errors
}

const INITIAL_FORM = {
  capexBase: '', capexYoy: '',
  maintenanceBase: '', maintenanceYoy: '',
  depRate: '',
  openingGB: '', openingAccumDep: '',
}

export default function CapexPage({
  tenure       = '9',
  yearLabels   = [],
  towerAdds    = [],
  avgTowers    = [],
  onFormSave   = null,
  initialForm  = null,
  triggerAutoSave = 0,
}) {
  const count = yearLabels.length

  const [form,       setForm]       = useState(() => {
    try {
      const saved = localStorage.getItem('fmd_form_capex')
      return saved ? JSON.parse(saved) : INITIAL_FORM
    } catch { return INITIAL_FORM }
  })
  const [errors,     setErrors]     = useState({})
  const [attempted,  setAttempted]  = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const [capexResult, setCapexResult] = useState(null)

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
      saveSession({ capex_form: next })
      return next
    })
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleShow() {
    setAttempted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const capexPerSite    = buildSeries(form.capexBase,        form.capexYoy,        count)
    const maintPerSite    = buildSeries(form.maintenanceBase,  form.maintenanceYoy,  count)
    const depRate         = (Number(form.depRate) || 0) / 100

    // Pad tower arrays to count
    function padTo(arr, n) {
      const out  = [...arr]
      const last = out[out.length - 1] || 0
      while (out.length < n) out.push(last)
      return out
    }
    const adds    = padTo(towerAdds, count)
    const towers  = padTo(avgTowers, count)

    const capexSchedule = computeCapexSchedule(adds, capexPerSite, maintPerSite, towers)
    const ppeSchedule   = computePPESchedule(
      Number(form.openingGB)       || 0,
      Number(form.openingAccumDep) || 0,
      capexSchedule.map((r) => r.totalCapex),
      depRate,
    )

    setCapexResult({ capexSchedule, ppeSchedule })
    if (onFormSave) onFormSave({ ...form })
    setShowModal(true)
  }

  const hasAnyError = attempted && Object.keys(errors).length > 0
  const hasTowerData = towerAdds.some((v) => v > 0)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Capex &amp; PPE</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              Capital Expenditure &amp; Fixed Asset Schedule
            </p>
          </div>
          <span className="text-xs text-blue-300">
            Tenure: <strong className="text-white">{tenure} yrs</strong>
          </span>
        </div>

        <div className="p-5 space-y-4">

          {!hasTowerData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
              <strong>Tower data not loaded</strong> — New Tower Capex will be 0.
              Complete the <strong>Ground-Based Towers</strong> section first for full results.
            </div>
          )}

          {/* ── 1. New Tower Capex ── */}
          <SectionCard title="New Tower Capex" subtitle="INR MM / tower">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capex per Site (Yr 1)" id="capexBase" value={form.capexBase}
                onChange={handleChange} hasError={errors.capexBase}
                unit="INR MM/tower" placeholder="e.g. 2.4" />
              <Field label="YoY Escalation" id="capexYoy" value={form.capexYoy}
                onChange={handleChange} hasError={errors.capexYoy}
                unit="%" placeholder="e.g. 3" />
            </div>
          </SectionCard>

          {/* ── 2. Maintenance Capex ── */}
          <SectionCard title="Maintenance Capex" subtitle="INR / tower">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Maintenance per Site (Yr 1)" id="maintenanceBase" value={form.maintenanceBase}
                onChange={handleChange} hasError={errors.maintenanceBase}
                unit="INR/tower" placeholder="e.g. 36538" />
              <Field label="YoY Escalation" id="maintenanceYoy" value={form.maintenanceYoy}
                onChange={handleChange} hasError={errors.maintenanceYoy}
                unit="%" placeholder="e.g. 3" />
            </div>
          </SectionCard>

          {/* ── 3. Gross Block / PPE ── */}
          {/* <SectionCard title="Gross Block — PPE" subtitle="INR MM">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Opening Gross Block" id="openingGB" value={form.openingGB}
                onChange={handleChange} hasError={errors.openingGB}
                unit="INR MM" placeholder="e.g. 78064" />
              <Field label="Opening Accum. Depreciation" id="openingAccumDep" value={form.openingAccumDep}
                onChange={handleChange} hasError={errors.openingAccumDep}
                unit="INR MM" placeholder="e.g. 39626" />
              <Field label="Depreciation Rate" id="depRate" value={form.depRate}
                onChange={handleChange} hasError={errors.depRate}
                unit="%" placeholder="e.g. 7" />
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
            Save Capex &amp; PPE
          </button>
        </div>
      </div>

      <CapexModal
        open={showModal}
        onClose={() => setShowModal(false)}
        yearLabels={yearLabels}
        tenure={tenure}
        capexResult={capexResult}
      />
    </>
  )
}
