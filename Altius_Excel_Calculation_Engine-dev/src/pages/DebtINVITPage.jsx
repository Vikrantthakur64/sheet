import { useState, useEffect, useRef } from 'react'
import { computeCapexDebtSchedule } from '../utils/calculation'
import { saveSession } from '../api/db'
import DebtINVITModal from '../components/DebtINVITModal'

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

const REQUIRED_FIELDS = ['spvOpening', 'spvAddition', 'spvRepaymentPct', 'spvIntRate', 'capexDebtOpening', 'repaymentPct', 'capexIntRate']

function validate(form) {
  const errors = {}
  REQUIRED_FIELDS.forEach((k) => {
    if (form[k] === '' || form[k] === null || form[k] === undefined) errors[k] = true
  })
  return errors
}

const INITIAL_FORM = {
  spvOpening: '', spvAddition: '', spvRepaymentPct: '', spvIntRate: '',
  capexDebtOpening: '', repaymentPct: '', capexIntRate: '',
}

export default function DebtINVITPage({
  tenure          = '9',
  yearLabels      = [],
  capexAdditions  = [],
  onFormSave      = null,
  initialForm     = null,
  triggerAutoSave = 0,
}) {
  const count = yearLabels.length

  const [form,      setForm]      = useState(() => {
    try {
      const saved = localStorage.getItem('fmd_form_invit')
      return saved ? JSON.parse(saved) : INITIAL_FORM
    } catch { return INITIAL_FORM }
  })
  const [errors,    setErrors]    = useState({})
  const [attempted, setAttempted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [result,    setResult]    = useState(null)

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
      saveSession({ invit_form: next })
      return next
    })
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleShow() {
    setAttempted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    // SPV Refinancing Debt — one-time drawdown in Yr 1, repayment % on opening each year
    const spvAdditions  = Array(count).fill(0)
    spvAdditions[0]     = Number(form.spvAddition) || 0
    const spvRepayPct   = (Number(form.spvRepaymentPct) || 0) / 100
    const spvRate       = (Number(form.spvIntRate) || 0) / 100
    let   spvOpenBal    = Number(form.spvOpening) || 0
    const spvDebt       = []
    for (let i = 0; i < count; i++) {
      const add  = spvAdditions[i]
      const rep  = spvOpenBal * spvRepayPct + add * spvRepayPct * 0.5
      const close = Math.max(0, spvOpenBal + add - rep)
      const fc   = (spvOpenBal + close) / 2 * spvRate
      spvDebt.push({ opening: spvOpenBal, additions: add, repayments: rep, closing: close, financeCost: fc, repayPct: spvRepayPct })
      spvOpenBal = close
    }

    // Capex Debt
    const capexAdditionsArr = capexAdditions.length ? capexAdditions : Array(count).fill(0)
    const repayPct          = (Number(form.repaymentPct) || 0) / 100
    const capexRate         = (Number(form.capexIntRate)  || 0) / 100
    const capexDebt         = computeCapexDebtSchedule(
      Number(form.capexDebtOpening) || 0,
      capexAdditionsArr,
      repayPct,
      capexRate,
    )

    if (onFormSave) onFormSave({ ...form })
    setResult({ spvDebt, capexDebt })
    setShowModal(true)
  }

  const hasAnyError = attempted && Object.keys(errors).length > 0
  const hasCapexData = capexAdditions.some((v) => v > 0)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Debt — INVIT</h2>
            <p className="text-blue-300 text-xs mt-0.5">
              INVIT-Level Debt Schedule
            </p>
          </div>
          <span className="text-xs text-blue-300">
            Tenure: <strong className="text-white">{tenure} yrs</strong>
          </span>
        </div>

        <div className="p-5 space-y-4">

          {!hasCapexData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
              <strong>Capex data not loaded</strong> — Capex Debt additions will be 0.
              Complete the <strong>Capex &amp; PPE</strong> section first for accurate debt projections.
            </div>
          )}

          {/* SPV Refinancing */}
          <SectionCard title="SPV Refinancing" subtitle="SHL refinanced at INVIT level">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Opening Balance (Yr 1)" id="spvOpening" value={form.spvOpening}
                onChange={handleChange} hasError={errors.spvOpening}
                unit="INR MM" placeholder="e.g. 0" />
              <Field label="Addition (Yr 1 Drawdown)" id="spvAddition" value={form.spvAddition}
                onChange={handleChange} hasError={errors.spvAddition}
                unit="INR MM" placeholder="e.g. 40000" />
              <Field label="Annual Repayment %" id="spvRepaymentPct" value={form.spvRepaymentPct}
                onChange={handleChange} hasError={errors.spvRepaymentPct}
                unit="%" placeholder="e.g. 0" />
              <Field label="Interest Rate" id="spvIntRate" value={form.spvIntRate}
                onChange={handleChange} hasError={errors.spvIntRate}
                unit="%" placeholder="e.g. 8" />
            </div>
          </SectionCard>

          {/* Capex Debt */}
          <SectionCard title="Capex Debt" subtitle="Debt used to fund new tower capex">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Opening Balance" id="capexDebtOpening" value={form.capexDebtOpening}
                onChange={handleChange} hasError={errors.capexDebtOpening}
                unit="INR MM" placeholder="e.g. 4000" />
              <Field label="Annual Repayment %" id="repaymentPct" value={form.repaymentPct}
                onChange={handleChange} hasError={errors.repaymentPct}
                unit="%" placeholder="e.g. 5" />
              <Field label="Interest Rate" id="capexIntRate" value={form.capexIntRate}
                onChange={handleChange} hasError={errors.capexIntRate}
                unit="%" placeholder="e.g. 8" />
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Additions = Capex per year (from Capex &amp; PPE). Repayment = Opening × repay% + Addition × repay% × 0.5
            </p>
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
            Save Debt INVIT
          </button>
        </div>
      </div>

      <DebtINVITModal
        open={showModal}
        onClose={() => setShowModal(false)}
        yearLabels={yearLabels}
        tenure={tenure}
        result={result}
      />
    </>
  )
}
