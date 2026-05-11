import { useState, useEffect } from 'react'
import RevenueModal from '../components/RevenueModal'
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

const INITIAL_RATE_FORM = {
  baseRateExisting: '', baseRateNew: '', ipFeeEscPct: '',
  energyMarginPct: '',
  landLeaseRecoveryPct: '',
  ipFeeWriteoffPct: '', energyWriteoffPct: '',
}

const REQUIRED_RATE_FIELDS = ['baseRateExisting', 'baseRateNew']

export default function RevenuePage({
  tenure            = '9',
  yearLabels        = [],
  towerAdds         = [],
  dismantles        = [],
  revenueInputs     = { openingTower: '', existingTenancies: '' },
  onRevenueChange   = () => {},
  tenancyForm       = null,
  onFormSave        = null,
  triggerAutoSave   = 0,
  initialRateForm   = null,
}) {
  const [errors,    setErrors]    = useState({})
  const [rateForm,  setRateForm]  = useState(() => initialRateForm ? {
    baseRateExisting:     initialRateForm.baseRateExisting     ?? '',
    baseRateNew:          initialRateForm.baseRateNew          ?? '',
    ipFeeEscPct:          initialRateForm.ipFeeEscPct          ?? '',
    energyMarginPct:      initialRateForm.energyMarginPct      ?? '',
    landLeaseRecoveryPct: initialRateForm.landLeaseRecoveryPct ?? '',
    ipFeeWriteoffPct:     initialRateForm.ipFeeWriteoffPct     ?? '',
    energyWriteoffPct:    initialRateForm.energyWriteoffPct    ?? '',
  } : INITIAL_RATE_FORM)
  const [rateErrs,  setRateErrs]  = useState({})
  const [showModal, setShowModal] = useState(false)

  const openingTower      = revenueInputs.openingTower      ?? ''
  const existingTenancies = revenueInputs.existingTenancies ?? ''

  // Auto-save when parent triggers it
  useEffect(() => {
    if (triggerAutoSave > 0 && onFormSave) {
      onFormSave({ openingTower, existingTenancies, ...rateForm })
    }
  }, [triggerAutoSave]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(field, val) {
    onRevenueChange(field, val)
  }

  function handleRateChange(id, val) {
    setRateForm((prev) => {
      const next = { ...prev, [id]: val }
      saveSession({ saved_revenue_form: { openingTower, existingTenancies, ...next } })
      return next
    })
    if (rateErrs[id]) setRateErrs((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleShow() {
    const errs = {}
    if (openingTower === '' || isNaN(Number(openingTower)) || Number(openingTower) < 0)
      errs.openingTower = 'Please enter a valid opening tower count.'
    if (existingTenancies === '' || isNaN(Number(existingTenancies)) || Number(existingTenancies) < 0)
      errs.existingTenancies = 'Please enter a valid existing tenancies value.'
    setErrors(errs)

    const rErrs = {}
    REQUIRED_RATE_FIELDS.forEach((k) => {
      if (rateForm[k] === '' || rateForm[k] === null || rateForm[k] === undefined) rErrs[k] = true
    })
    setRateErrs(rErrs)

    if (Object.keys(errs).length > 0 || Object.keys(rErrs).length > 0) return

    if (onFormSave) {
      onFormSave({ openingTower, existingTenancies, ...rateForm })
    }
    setShowModal(true)
  }

  const newTenanciesSeries = buildNewTenanciesSeries(tenancyForm, yearLabels.length)
  const hasTenancyData = newTenanciesSeries.some((v) => v > 0)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#0d2045] px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Revenue</h2>
            <p className="text-blue-300 text-xs mt-0.5">Fill all inputs, then click Show Revenue Projection</p>
          </div>
          <span className="text-xs text-blue-300">
            Tenure: <strong className="text-white">{tenure} yrs</strong>
          </span>
        </div>

        <div className="p-5 space-y-4">

          {/* 1. Ground Based Tower */}
          <SectionCard title="Ground Based Tower Revenue">
            <div className="max-w-xs">
              <Field
                label="Opening Tower (Year 1)" id="openingTower"
                value={openingTower}
                onChange={handleChange}
                hasError={!!errors.openingTower}
                unit="# towers" placeholder="e.g. 45954"
              />
              {errors.openingTower && (
                <p role="alert" className="text-xs text-red-600 mt-1">{errors.openingTower}</p>
              )}
            </div>
          </SectionCard>

          {/* 2. Tenancies */}
          <SectionCard title="Tenancies">
            <div className="max-w-xs">
              <Field
                label="Existing Tenancies (Year 1)" id="existingTenancies"
                value={existingTenancies}
                onChange={handleChange}
                hasError={!!errors.existingTenancies}
                unit="# tenancies" placeholder="e.g. 61119"
              />
              {errors.existingTenancies && (
                <p role="alert" className="text-xs text-red-600 mt-1">{errors.existingTenancies}</p>
              )}
            </div>
            {hasTenancyData ? (
              <div className="mt-2 overflow-x-auto">
                <p className="text-xs font-semibold text-emerald-700 mb-1">
                  New Tenancies (from Tenancies section)
                </p>
                <div className="flex gap-2 min-w-max">
                  {yearLabels.map((lbl, i) => (
                    <div key={i} className="flex flex-col gap-0.5" style={{ minWidth: 72 }}>
                      <span className="text-[10px] text-slate-500 text-center font-medium">{lbl}</span>
                      <div className="px-2 py-1.5 text-xs font-bold text-center tabular-nums
                                      text-blue-800 bg-[#dbeeff] border border-blue-200 rounded">
                        {Math.round(newTenanciesSeries[i] || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-1">
                Complete the <strong>Tenancies</strong> section first to load New Tenancy data.
              </p>
            )}
          </SectionCard>

          {/* 3. IP Fee Rate Card */}
          <SectionCard title="IP Fee Rate Card" subtitle="INR / tenant / month">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Existing Tenant Rate (Yr 1)" id="baseRateExisting" value={rateForm.baseRateExisting}
                onChange={handleRateChange} hasError={rateErrs.baseRateExisting}
                unit="INR/tenant/month" placeholder="e.g. 43806" />
              <Field label="New Tenant Rate (Yr 1)" id="baseRateNew" value={rateForm.baseRateNew}
                onChange={handleRateChange} hasError={rateErrs.baseRateNew}
                unit="INR/tenant/month" placeholder="e.g. 37155" />
              <Field label="YoY Escalation" id="ipFeeEscPct" value={rateForm.ipFeeEscPct}
                onChange={handleRateChange} hasError={false}
                unit="%" placeholder="e.g. 5" required={false} />
            </div>
          </SectionCard>

          {/* 4. Energy Margin */}
          <SectionCard title="Energy Revenue" subtitle="Margin charged above energy cost">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Energy Margin" id="energyMarginPct" value={rateForm.energyMarginPct}
                onChange={handleRateChange} hasError={false}
                unit="%" placeholder="e.g. 5" required={false} />
              <div className="flex flex-col gap-0.5 justify-center">
                <p className="text-[10px] text-slate-400 italic leading-tight">
                  Energy revenue = (energy cost per tenant × (1 + margin)) × avg tenancies × 12
                </p>
              </div>
            </div>
          </SectionCard>

          {/* 5. Land Lease Reimbursement */}
          <SectionCard title="Land Lease Reimbursement" subtitle="% of lease rent recovered from operators">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Recovery %" id="landLeaseRecoveryPct" value={rateForm.landLeaseRecoveryPct}
                onChange={handleRateChange} hasError={false}
                unit="%" placeholder="e.g. 27" required={false} />
              <div className="flex flex-col gap-0.5 justify-center">
                <p className="text-[10px] text-slate-400 italic leading-tight">
                  LLR = avg towers × lease rent per site × recovery% × 12
                </p>
              </div>
            </div>
          </SectionCard>

          {/* 6. Write-offs */}
          <SectionCard title="Write-offs" subtitle="Irrecoverable amounts on receivables">
            <div className="grid grid-cols-2 gap-3">
              <Field label="IP Fee Write-off" id="ipFeeWriteoffPct" value={rateForm.ipFeeWriteoffPct}
                onChange={handleRateChange} hasError={false}
                unit="%" placeholder="e.g. 1" required={false} />
              <Field label="Energy Write-off" id="energyWriteoffPct" value={rateForm.energyWriteoffPct}
                onChange={handleRateChange} hasError={false}
                unit="%" placeholder="e.g. 0" required={false} />
            </div>
          </SectionCard>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-slate-400">
            Fields marked <span className="text-red-500 font-bold">*</span> are required.
          </p>
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
            Save Revenue
          </button>
        </div>
      </div>

      <RevenueModal
        open={showModal}
        onClose={() => setShowModal(false)}
        yearLabels={yearLabels}
        tenure={tenure}
        revenueData={{
          openingTower,
          towerAdds,
          dismantles,
          existingTenancies,
          newTenanciesSeries,
        }}
      />
    </>
  )
}

export function buildNewTenanciesSeries(tenancyForm, count) {
  if (!tenancyForm || count === 0) return Array(count).fill(0)

  const curFY  = parseFloat(tenancyForm.nt_curFY_1)  || 0
  const nextFY = parseFloat(tenancyForm.nt_nextFY_1) || 0
  const yoy    = parseFloat(tenancyForm.nt_yoy_1)    || 0

  if (count === 1) return [Math.round(curFY)]

  const result = [Math.round(curFY), Math.round(nextFY)]
  const factor = 1 + yoy / 100
  for (let i = 2; i < count; i++) {
    result.push(Math.round(result[i - 1] * factor))
  }
  return result
}
