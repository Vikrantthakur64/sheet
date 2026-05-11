import { useState } from 'react'

const DROPDOWN_DEFS = [
  {
    key: 'towerAdds',
    label: 'New Tower Adds',
    options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'Updated BP 25' }],
  },
  {
    key: 'dismantles',
    label: 'Dismantles',
    options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'Updated BP 25' }],
  },
  {
    key: 'newTenancies',
    label: 'New Tenancies',
    options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'BP 25 Updated' }],
  },
  {
    key: 'churn',
    label: 'Churn',
    options: [{ value: 1, label: 'Base Case' }, { value: 2, label: 'BP 25 Updated' }],
  },
  {
    key: 'ipFeeEsc',
    label: 'IP Fee Escalation',
    options: [{ value: 'base', label: 'Base Case' }, { value: 'case2', label: 'Case 2' }],
  },
  {
    key: 'landLease',
    label: 'Land Lease Recovery',
    options: [{ value: 'base', label: 'Base Case' }, { value: 'bp25', label: 'BP 25' }],
  },
]

const DEFAULT_SELECTIONS = {
  towerAdds: 1, dismantles: 1, newTenancies: 1, churn: 1,
  ipFeeEsc: 'base', landLease: 'base',
}

function ModelBadge({ config, title, accent }) {
  const borderCls = accent === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'
  const titleCls  = accent === 'blue' ? 'text-blue-700' : 'text-slate-600'

  if (!config) {
    return (
      <div className="border border-dashed border-slate-300 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-xs text-slate-400 italic">Not configured yet</p>
      </div>
    )
  }
  return (
    <div className={`border rounded-xl p-4 ${borderCls}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${titleCls}`}>{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {DROPDOWN_DEFS.map((d) => {
          const opt = d.options.find((o) => String(o.value) === String(config[d.key]))
          return (
            <div key={d.key} className="flex items-baseline gap-1 text-xs min-w-0">
              <span className="text-slate-400 shrink-0">{d.label}:</span>
              <span className="font-semibold text-slate-700 truncate">{opt?.label ?? '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OutputCalculationPage({
  model1Config, model2Config, onSaveModel1, onSaveModel2, tenancyForm,
}) {
  const [selections, setSelections] = useState({ ...DEFAULT_SELECTIONS })
  const [lastSaved,  setLastSaved]  = useState(null)

  const hasTenancyData = !!tenancyForm

  function handleChange(key, rawValue) {
    const value = (rawValue === '1' || rawValue === '2') ? Number(rawValue) : rawValue
    setSelections((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave(modelNum) {
    const config = { ...selections }
    if (modelNum === 1) onSaveModel1(config)
    else                onSaveModel2(config)
    setLastSaved(modelNum)
    setTimeout(() => setLastSaved(null), 2500)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-[#0d2045] rounded-xl px-6 py-4">
        <h2 className="text-base font-bold text-white uppercase tracking-widest">Output Calculation</h2>
        <p className="text-blue-300 text-xs mt-0.5">
          Pick a scenario for each of the 6 drivers · Save as Model 1 or Model 2 · Compare on View Output
        </p>
      </div>

      {!hasTenancyData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
          <strong>Tenancy data required</strong> — Complete the <strong>Tenancies</strong> section first
          to enable IP Fee Escalation and Land Lease scenario selection.
        </div>
      )}

      {/* 6 Dropdowns */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#b8d4ea] px-4 py-2 border-b border-slate-300 flex items-center justify-between">
          <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">
            Scenario Selection — 6 Drivers
          </span>
          <span className="text-[10px] text-[#1e3a5f]/70 italic">One scenario per driver</span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {DROPDOWN_DEFS.map((d) => (
            <div key={d.key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {d.label}
              </label>
              <div className="relative">
                <select
                  value={selections[d.key]}
                  onChange={(e) => handleChange(d.key, e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 text-xs font-semibold rounded-lg
                             border border-blue-300 bg-[#dbeeff] text-blue-800
                             focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {d.options.map((o) => (
                    <option key={String(o.value)} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-blue-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleSave(1)}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7f]
                     text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8" />
          </svg>
          {lastSaved === 1 ? '✓ Saved as Model 1' : 'Save as Model 1'}
        </button>
        <button
          onClick={() => handleSave(2)}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700
                     text-white text-sm font-bold px-5 py-3 rounded-xl transition-colors
                     focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8" />
          </svg>
          {lastSaved === 2 ? '✓ Saved as Model 2' : 'Save as Model 2'}
        </button>
      </div>

      {/* Saved config summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ModelBadge config={model1Config} title="Model 1 — Saved Configuration" accent="blue" />
        <ModelBadge config={model2Config} title="Model 2 — Saved Configuration" accent="slate" />
      </div>

      {model1Config && model2Config && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-xs
                        text-emerald-700 flex items-center gap-3">
          <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Both models configured. Go to <strong className="ml-0.5">View Output</strong> to see the comparison.
        </div>
      )}

    </div>
  )
}