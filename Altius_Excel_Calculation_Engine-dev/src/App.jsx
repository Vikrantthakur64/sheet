import { useState, useMemo, useEffect } from 'react'
import { loadSession, saveSession } from './api/db'

import LoginPage            from './pages/LoginPage'
import Header               from './components/Header'
import Sidebar              from './components/Sidebar'
import InputSection         from './components/InputSection'
import ScenarioInputTable   from './components/ScenarioInputTable'
import TenancyInputForm     from './components/TenancyInputForm'
import RevenuePage          from './pages/RevenuePage'
import OpexPage             from './pages/OpexPage'
import CapexPage            from './pages/CapexPage'
import DebtSHLPage          from './pages/DebtSHLPage'
import DebtINVITPage        from './pages/DebtINVITPage'
import OtherAssumptionsPage from './pages/OtherAssumptionsPage'
import OutputPage           from './pages/OutputPage'
import SectionDivider       from './components/SectionDivider'
import AnalyzeModal         from './components/AnalyzeModal'
import HistoryPage          from './pages/HistoryPage'

import { DEFAULT_SCENARIO_ROWS, DEFAULT_DISMANTLE_ROWS, NUM_YEARS } from './data/scenarios'
import { DEFAULT_INPUTS, DEFAULT_REVENUE, buildDefaultCells } from './data/defaults'
import {
  computeTowerSchedule, computeTenancySchedule, buildChurnSeries, generateYearLabels,
  computeCapexSchedule,
} from './utils/calculation'
import { handleDownload } from './utils/exportExcel'
import { buildNewTenanciesSeries } from './pages/RevenuePage'

function buildSeries(base, yoyPct, count) {
  const b = Number(base) || 0
  const r = (Number(yoyPct) || 0) / 100
  const arr = []
  let v = b
  for (let i = 0; i < count; i++) { arr.push(v); v *= (1 + r) }
  return arr
}

function padTo(arr, n) {
  const out  = [...(arr || [])]
  const last = out[out.length - 1] || 0
  while (out.length < n) out.push(last)
  return out.slice(0, n)
}

export default function App() {
  const [user, setUser]               = useState(null)
  const [inputs, setInputs]           = useState(DEFAULT_INPUTS)
  const [errors, setErrors]           = useState({})
  const [savedMsg, setSavedMsg]       = useState('')
  const [scenarioRows, setScenarioRows]   = useState(DEFAULT_SCENARIO_ROWS.map((r) => ({ ...r })))
  const [dismantleRows, setDismantleRows] = useState(DEFAULT_DISMANTLE_ROWS.map((r) => ({ ...r })))
  const [scenarioId, setScenarioId]       = useState(1)

  const [tenancyForm, setTenancyForm] = useState(null)

  const [activeSection,    setActiveSection]    = useState('view-all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showAnalyze,      setShowAnalyze]      = useState(false)
  const [opexResult,       setOpexResult]       = useState(null)
  const [autoSaveTick,     setAutoSaveTick]     = useState(0)

  const [cells, setCells] = useState(() => buildDefaultCells())

  const [revenueInputs, setRevenueInputs] = useState(DEFAULT_REVENUE)

  const [plInputs, setPlInputs] = useState({
    ipFeeRevenue: '', otherPassRevenue: '', landLeaseReimbursement: '', repairsMaintenance: '',
    salariesSGA: '', leaseCost: '', writeOffReceivables: '', energyPassThrough: '',
    depreciation: '', financeCost: '', tax: '', bsEquity: '', bsOtherEquity: '',
    bsShlDebt: '', bsTradePayables: '', bsGrossBlock: '', bsAccumDep: '',
    bsTradeReceivables: '', bsDeposits: '', bsCash: '',
  })

  // ── Saved form states (for Output page) ───────────────────────────────────
  const [savedRevenueForm, setSavedRevenueForm] = useState(null)
  const [savedOpexForm,    setSavedOpexForm]    = useState(null)
  const [savedCapexForm,   setSavedCapexForm]   = useState(null)
  const [savedSHLForm,     setSavedSHLForm]     = useState(null)
  const [savedDebtINVIT,   setSavedDebtINVIT]   = useState(null)
  const [savedOtherAssump, setSavedOtherAssump] = useState(null)
  const [savedModel1, setSavedModel1] = useState(null)
  const [savedModel2, setSavedModel2] = useState(null)

  // ── onFormSave handlers — update state + persist to Supabase ──────────────
  function handleSaveModel1(data) { setSavedModel1(data); saveSession({ model_1_config: data }) }
  function handleSaveModel2(data) { setSavedModel2(data); saveSession({ model_2_config: data }) }
  function handleRevenueFormSave(data)  { setSavedRevenueForm(data); saveSession({ saved_revenue_form: data }) }
  function handleOpexFormSave(data)     { setSavedOpexForm(data);    saveSession({ saved_opex_form: data }) }
  function handleCapexFormSave(data)    { setSavedCapexForm(data);   saveSession({ saved_capex_form: data }) }
  function handleSHLFormSave(data)      { setSavedSHLForm(data);     saveSession({ saved_shl_form: data }) }
  function handleDebtINVITSave(data)    { setSavedDebtINVIT(data);   saveSession({ saved_debt_invit: data }) }
  function handleOtherAssumpSave(data)  { setSavedOtherAssump(data); saveSession({ saved_other_assump: data }) }

  // ── Load from Supabase on mount ───────────────────────────────────────────
  useEffect(() => {
    loadSession().then((data) => {
      if (!data) return
      if (data.inputs)                      setInputs(data.inputs)
      if (data.scenario_rows?.length)       setScenarioRows(data.scenario_rows)
      if (data.dismantle_rows?.length)      setDismantleRows(data.dismantle_rows)
      if (data.cells)                       setCells(data.cells)
      if (data.scenario_id)                 setScenarioId(data.scenario_id)
      if (data.revenue_inputs)              setRevenueInputs(data.revenue_inputs)
      if (data.tenancy_form)                setTenancyForm(data.tenancy_form)
      if (data.saved_revenue_form)          setSavedRevenueForm(data.saved_revenue_form)
      if (data.saved_opex_form)             setSavedOpexForm(data.saved_opex_form)
      if (data.saved_capex_form)            setSavedCapexForm(data.saved_capex_form)
      if (data.saved_shl_form)              setSavedSHLForm(data.saved_shl_form)
      if (data.saved_debt_invit)            setSavedDebtINVIT(data.saved_debt_invit)
      if (data.saved_other_assump)          setSavedOtherAssump(data.saved_other_assump)
      if (data.model_1_config)              setSavedModel1(data.model_1_config)
      if (data.model_2_config)              setSavedModel2(data.model_2_config)
    })
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const { yearLabels, count } = useMemo(() => {
    const c         = Math.max(1, Math.min(parseInt(inputs.tenure, 10) || NUM_YEARS, 20))
    const startYear = parseInt(inputs.yearStart, 10) || 2026
    return { yearLabels: generateYearLabels(startYear, c), count: c }
  }, [inputs.yearStart, inputs.tenure])

  const growthPct = useMemo(() => {
    const selRow = scenarioRows.find((r) => r.modelScenario === scenarioId)
    const g = selRow ? parseFloat(selRow.pctIncrease) : 0
    return isNaN(g) ? 0 : g
  }, [scenarioRows, scenarioId])

  const allSeries = useMemo(() => {
    const g1  = (() => { const r = scenarioRows.find((r) => r.modelScenario === 1); const v = r ? parseFloat(r.pctIncrease) : 0; return isNaN(v) ? 0 : v })()
    const g2  = (() => { const r = scenarioRows.find((r) => r.modelScenario === 2); const v = r ? parseFloat(r.pctIncrease) : 0; return isNaN(v) ? 0 : v })()
    const dg1 = (() => { const r = dismantleRows.find((r) => r.modelScenario === 1); const v = r ? parseFloat(r.pctIncrease) : 0; return isNaN(v) ? 0 : v })()
    const dg2 = (() => { const r = dismantleRows.find((r) => r.modelScenario === 2); const v = r ? parseFloat(r.pctIncrease) : 0; return isNaN(v) ? 0 : v })()

    function buildS(v26, v27, pct) {
      if (count <= 1) return [Number(v26) || 0]
      const result = [Number(v26) || 0, Number(v27) || 0]
      const factor = 1 + pct / 100
      for (let i = 2; i < count; i++) result.push(Math.round(result[i - 1] * factor))
      return result
    }

    const selTower = buildS(cells.sel_tower_apr26, cells.sel_tower_apr27, growthPct)
    const selDm    = buildS(cells.sel_dm_apr26,    cells.sel_dm_apr27,    growthPct)

    const baseT = scenarioRows.find((r) => r.modelScenario === 1)
    const bp25T = scenarioRows.find((r) => r.modelScenario === 2)
    const baseD = dismantleRows.find((r) => r.modelScenario === 1)
    const bp25D = dismantleRows.find((r) => r.modelScenario === 2)

    return {
      sel_tower:  selTower,
      base_tower: buildS(baseT?.currentFinancialYear ?? 0, baseT?.nextFinancialYear ?? 0, g1),
      bp25_tower: buildS(bp25T?.currentFinancialYear ?? 0, bp25T?.nextFinancialYear ?? 0, g2),
      sel_dm:     selDm,
      base_dm:    buildS(baseD?.currentFinancialYear ?? 0, baseD?.nextFinancialYear ?? 0, dg1),
      bp25_dm:    buildS(bp25D?.currentFinancialYear ?? 0, bp25D?.nextFinancialYear ?? 0, dg2),
    }
  }, [cells, growthPct, count, scenarioRows, dismantleRows])

  const avgTowers = useMemo(() => {
    const opening = Number(revenueInputs.openingTower) || 0
    if (!opening || !allSeries.sel_tower.length) return []
    return computeTowerSchedule(opening, allSeries.sel_tower, allSeries.sel_dm)
      .map((r) => r.average)
  }, [revenueInputs.openingTower, allSeries.sel_tower, allSeries.sel_dm])

  const avgTenancies = useMemo(() => {
    const existing = Number(revenueInputs.existingTenancies) || 0
    if (!existing || !tenancyForm) return []
    const newT       = buildNewTenanciesSeries(tenancyForm, count)
    const churnRates = buildChurnSeries(
      parseFloat(tenancyForm.ch_curFY_1)  || 0,
      parseFloat(tenancyForm.ch_nextFY_1) || 0,
      parseFloat(tenancyForm.ch_yoy_1)    || 0,
      count,
    )
    return computeTenancySchedule(existing, newT, churnRates).map((r) => r.average)
  }, [revenueInputs.existingTenancies, tenancyForm, count])

  const capexAdditionsForDebt = useMemo(() => {
    if (!savedCapexForm) return []
    const capexPerSiteArr = buildSeries(savedCapexForm.capexBase, savedCapexForm.capexYoy, count)
    const maintArr        = buildSeries(savedCapexForm.maintenanceBase, savedCapexForm.maintenanceYoy, count)
    const adds   = padTo(allSeries.sel_tower, count)
    const towers = avgTowers.length ? padTo(avgTowers, count) : Array(count).fill(0)
    return computeCapexSchedule(adds, capexPerSiteArr, maintArr, towers).map((c) => c.totalCapex)
  }, [savedCapexForm, count, allSeries.sel_tower, avgTowers])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleInputChange(field, value) {
    setInputs((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => { const c = { ...e }; delete c[field]; return c })
  }

  function handleScenarioRowChange(rowIndex, field, value) {
    setScenarioRows((prev) => prev.map((r, i) => i === rowIndex ? { ...r, [field]: value } : r))
    const row = scenarioRows[rowIndex]
    if (row.modelScenario === scenarioId) {
      if (field === 'currentFinancialYear') setCells((prev) => ({ ...prev, sel_tower_apr26: value }))
      if (field === 'nextFinancialYear')    setCells((prev) => ({ ...prev, sel_tower_apr27: value }))
    }
  }

  function handleDismantleRowChange(rowIndex, field, value) {
    setDismantleRows((prev) => prev.map((r, i) => i === rowIndex ? { ...r, [field]: value } : r))
    const row = dismantleRows[rowIndex]
    if (row.modelScenario === scenarioId) {
      if (field === 'currentFinancialYear') setCells((prev) => ({ ...prev, sel_dm_apr26: value }))
      if (field === 'nextFinancialYear')    setCells((prev) => ({ ...prev, sel_dm_apr27: value }))
    }
  }

  function handleScenarioChange(id) {
    setScenarioId(id)
    const tRow = scenarioRows.find((r) => r.modelScenario === id)
    const dRow = dismantleRows.find((r) => r.modelScenario === id)
    setCells((prev) => ({
      ...prev,
      ...(tRow ? { sel_tower_apr26: String(tRow.currentFinancialYear), sel_tower_apr27: String(tRow.nextFinancialYear) } : {}),
      ...(dRow ? { sel_dm_apr26:    String(dRow.currentFinancialYear), sel_dm_apr27:    String(dRow.nextFinancialYear) } : {}),
    }))
  }

  function handleCellChange(key, value) {
    setCells((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    const errs = {}
    if (!inputs.tenure || isNaN(Number(inputs.tenure)) || Number(inputs.tenure) <= 0)
      errs.tenure = 'Tenure must be a positive number.'
    if (!inputs.equityContribution || isNaN(Number(inputs.equityContribution)))
      errs.equityContribution = 'Equity Contribution must be a number.'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    await saveSession({
      inputs,
      scenario_rows:  scenarioRows,
      dismantle_rows: dismantleRows,
      cells,
      scenario_id:    scenarioId,
      revenue_inputs: revenueInputs,
    })
    setAutoSaveTick((t) => t + 1)
    setSavedMsg('Saved!')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  if (!user) return <LoginPage onLogin={setUser} />

  const TENURE = inputs.tenure || '9'

  // ── Section content ────────────────────────────────────────────────────────
  function renderSection() {
    const groundContent = (
      <div className="space-y-5">
        <ScenarioInputTable
          towerRows={scenarioRows}
          dismantleRows={dismantleRows}
          onTowerChange={handleScenarioRowChange}
          onDismantleChange={handleDismantleRowChange}
          tenure={inputs.tenure || '—'}
        />
      </div>
    )

    const modelInputsContent = (
      <InputSection inputs={inputs} onChange={handleInputChange} errors={errors} />
    )

    const tenancyContent = (
      <TenancyInputForm
        tenure={inputs.tenure || '—'}
        initialForm={tenancyForm}
        triggerAutoSave={autoSaveTick}
        onShow={(formData) => {
          setTenancyForm(formData)
          saveSession({ tenancy_form: formData })
        }}
      />
    )

    switch (activeSection) {
      case 'ground':    return (
        <div className="space-y-5">
          <InputSection inputs={inputs} onChange={handleInputChange} errors={errors} />
          {groundContent}
        </div>
      )
      case 'tenancies': return tenancyContent
      case 'revenue':   return (
        <RevenuePage
          tenure={TENURE}
          yearLabels={yearLabels}
          towerAdds={allSeries.sel_tower}
          dismantles={allSeries.sel_dm}
          revenueInputs={revenueInputs}
          onRevenueChange={(field, val) =>
            setRevenueInputs((prev) => ({ ...prev, [field]: val }))
          }
          tenancyForm={tenancyForm}
          initialRateForm={savedRevenueForm}
          onFormSave={handleRevenueFormSave}
        />
      )
      case 'capex': return (
        <CapexPage
          tenure={TENURE}
          yearLabels={yearLabels}
          towerAdds={allSeries.sel_tower}
          avgTowers={avgTowers}
          onFormSave={handleCapexFormSave}
          initialForm={savedCapexForm}
        />
      )
      case 'opex': return (
        <OpexPage
          tenure={TENURE}
          yearLabels={yearLabels}
          avgTowers={avgTowers}
          avgTenancies={avgTenancies}
          onFormSave={handleOpexFormSave}
          onOpexResult={setOpexResult}
          initialForm={savedOpexForm}
        />
      )
      case 'debt-shl': return (
        <DebtSHLPage
          tenure={TENURE}
          yearLabels={yearLabels}
          onFormSave={handleSHLFormSave}
          initialForm={savedSHLForm}
        />
      )
      case 'debt-invit': return (
        <DebtINVITPage
          tenure={TENURE}
          yearLabels={yearLabels}
          capexAdditions={capexAdditionsForDebt}
          onFormSave={handleDebtINVITSave}
          initialForm={savedDebtINVIT}
        />
      )
      case 'other-assumptions': return (
        <OtherAssumptionsPage
          tenure={TENURE}
          onFormSave={handleOtherAssumpSave}
          initialForm={savedOtherAssump}
        />
      )
      case 'output': return (
        <OutputPage
          tenure={TENURE}
          yearLabels={yearLabels}
          count={count}
          allSeries={allSeries}
          avgTowers={avgTowers}
          avgTenancies={avgTenancies}
          revenueInputs={revenueInputs}
          tenancyForm={tenancyForm}
          savedRevenueForm={savedRevenueForm}
          savedOpexForm={savedOpexForm}
          savedCapexForm={savedCapexForm}
          savedSHLForm={savedSHLForm}
          savedDebtINVIT={savedDebtINVIT}
          savedOtherAssump={savedOtherAssump}
          capexAdditionsForDebt={capexAdditionsForDebt}
          equityContribution={inputs.equityContribution}
          onSaveModel1={handleSaveModel1}
          onSaveModel2={handleSaveModel2}
        />
      )
      case 'history': return (
        <HistoryPage
          model1={savedModel1}
          model2={savedModel2}
          onClearModel1={() => { setSavedModel1(null); saveSession({ model_1_config: null }) }}
          onClearModel2={() => { setSavedModel2(null); saveSession({ model_2_config: null }) }}
        />
      )
      case 'view-all':
        return (
          <div className="space-y-8">
            {/* Model Inputs — above Ground-Based Towers */}
            <section>
              <div className="flex items-center gap-4 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full
                                 text-white text-sm font-bold shrink-0 bg-slate-600">
                  ⚙
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-600">Model Inputs</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border
                                     bg-slate-100 text-slate-700 border-slate-200">
                      File name, year start, tenure &amp; equity
                    </span>
                  </div>
                  <div className="mt-1.5 h-px bg-slate-600 opacity-30" />
                </div>
              </div>
              {modelInputsContent}
            </section>
            <section>
              <SectionDivider num={1} title="Ground-Based Towers" subtitle="New Tower Adds & Dismantle Sites" color="blue" />
              {groundContent}
            </section>
            <section>
              <SectionDivider num={2} title="Tenancies" subtitle="Churn, IP Fee, Land Lease, Write-Off" color="indigo" />
              {tenancyContent}
            </section>
            <section>
              <SectionDivider num={3} title="Revenue" subtitle="Revenue streams modeling" color="emerald" />
              <RevenuePage
                tenure={TENURE}
                yearLabels={yearLabels}
                towerAdds={allSeries.sel_tower}
                dismantles={allSeries.sel_dm}
                revenueInputs={revenueInputs}
                onRevenueChange={(field, val) =>
                  setRevenueInputs((prev) => ({ ...prev, [field]: val }))
                }
                tenancyForm={tenancyForm}
                initialRateForm={savedRevenueForm}
                onFormSave={handleRevenueFormSave}
                triggerAutoSave={autoSaveTick}
              />
            </section>
            <section>
              <SectionDivider num={4} title="Capex & PPE" subtitle="Capital Expenditure & Fixed Asset Schedule" color="yellow" />
              <CapexPage
                tenure={TENURE}
                yearLabels={yearLabels}
                towerAdds={allSeries.sel_tower}
                avgTowers={avgTowers}
                onFormSave={handleCapexFormSave}
                initialForm={savedCapexForm}
                triggerAutoSave={autoSaveTick}
              />
            </section>
            <section>
              <SectionDivider num={5} title="Opex" subtitle="Operating expenditure modeling" color="orange" />
              <OpexPage
                tenure={TENURE}
                yearLabels={yearLabels}
                avgTowers={avgTowers}
                avgTenancies={avgTenancies}
                onFormSave={handleOpexFormSave}
                onOpexResult={setOpexResult}
                initialForm={savedOpexForm}
                triggerAutoSave={autoSaveTick}
              />
            </section>
            <section>
              <SectionDivider num={6} title="Debt — SHL" subtitle="Shareholder Loan Schedule" color="red" />
              <DebtSHLPage
                tenure={TENURE}
                yearLabels={yearLabels}
                onFormSave={handleSHLFormSave}
                initialForm={savedSHLForm}
                triggerAutoSave={autoSaveTick}
              />
            </section>
            <section>
              <SectionDivider num={7} title="Debt — INVIT" subtitle="INVIT-Level Debt Schedule" color="purple" />
              <DebtINVITPage
                tenure={TENURE}
                yearLabels={yearLabels}
                capexAdditions={capexAdditionsForDebt}
                onFormSave={handleDebtINVITSave}
                initialForm={savedDebtINVIT}
                triggerAutoSave={autoSaveTick}
              />
            </section>
            <section>
              <SectionDivider num={8} title="Other Assumptions" subtitle="Opening Balance Sheet & Working Capital" color="slate" />
              <OtherAssumptionsPage
                tenure={TENURE}
                onFormSave={handleOtherAssumpSave}
                initialForm={savedOtherAssump}
                triggerAutoSave={autoSaveTick}
              />
            </section>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4
                            flex items-center justify-between gap-4 rounded-b-xl shadow-lg">
              <p className="text-xs text-slate-500">
                Fill all sections above, then click <strong>View Output</strong> to
                review the full P&amp;L, Balance Sheet, Cashflow &amp; Equity IRR.
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { handleSave(); setShowAnalyze(true) }}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white
                             text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors
                             focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm"
                >
                  Save &amp; Analyze
                </button>
                <button
                  onClick={() => setActiveSection('output')}
                  className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4f7f] text-white
                             text-sm font-bold px-7 py-3 rounded-xl transition-colors
                             focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0
                         0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0
                         0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Output
                </button>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const SECTION_TITLES = {
    ground:              'Ground-Based Towers',
    tenancies:           'Tenancies',
    revenue:             'Revenue',
    capex:               'Capex & PPE',
    opex:                'Opex',
    'debt-shl':          'Debt — SHL',
    'debt-invit':        'Debt — INVIT',
    'other-assumptions': 'Other Assumptions',
    output:                'View Output',
    'output-calculation':  'Output Calculation',
    'view-all':            'Input Form — All Sections',
    history:               'Saved History',
  }
  const SECTION_SUBTITLES = {
    ground:              'New Tower Adds & Dismantle Sites — scenario modeling',
    tenancies:           'Tenancy analysis — churn, IP fee, land lease, write-off',
    revenue:             'Revenue streams modeling',
    capex:               'Capital Expenditure & Fixed Asset Schedule',
    opex:                'Operating expenditure modeling',
    'debt-shl':          'Shareholder Loan debt schedule',
    'debt-invit':        'INVIT-level debt schedule — SPV refinancing & capex debt',
    'other-assumptions': 'Opening balance sheet, working capital & cash assumptions',
    output:                'Full model output — P&L · Balance Sheet · Cashflow · Equity IRR',
    'output-calculation':  'Select scenario assumptions · Save Model 1 & 2 · Compare side by side',
    'view-all':            'Ground-Based Towers · Tenancies · Revenue · Opex · Debt · Assumptions',
    history:               'All saved input and output calculations stored in this browser',
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        onSave={handleSave}
        onDownload={() => handleDownload({ inputs, scenarioRows, dismantleRows, yearLabels, growthPct, allSeries, scenarioId })}
        user={user}
        onLogout={() => setUser(null)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeSection={activeSection}
          onSelect={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                {SECTION_TITLES[activeSection] || activeSection}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {SECTION_SUBTITLES[activeSection] || ''}
              </p>
            </div>
          </div>

          <div className="px-4 md:px-6 py-5 max-w-screen-2xl mx-auto w-full">
            {renderSection()}
          </div>
        </main>
      </div>

      {savedMsg && (
        <div role="status" aria-live="polite"
          className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-medium
                     px-4 py-2 rounded-lg shadow-lg">
          ✓ {savedMsg}
        </div>
      )}

      <AnalyzeModal
        open={showAnalyze}
        onClose={() => setShowAnalyze(false)}
        inputs={inputs}
        errors={errors}
        onInputChange={handleInputChange}
        scenarioRows={scenarioRows}
        dismantleRows={dismantleRows}
        onTowerChange={handleScenarioRowChange}
        onDismantleChange={handleDismantleRowChange}
        scenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        growthPct={growthPct}
        cells={cells}
        onCellChange={handleCellChange}
        yearLabels={yearLabels}
        count={count}
        allSeries={allSeries}
        avgTowers={avgTowers}
        avgTenancies={avgTenancies}
        revenueInputs={revenueInputs}
        onRevenueChange={(field, val) => setRevenueInputs((prev) => ({ ...prev, [field]: val }))}
        tenancyForm={tenancyForm}
        onTenancyFormSave={(formData) => {
          setTenancyForm(formData)
          saveSession({ tenancy_form: formData })
        }}
        opexResult={opexResult}
        savedCapexForm={savedCapexForm}
        savedSHLForm={savedSHLForm}
        savedDebtINVIT={savedDebtINVIT}
        savedOtherAssump={savedOtherAssump}
        capexAdditionsForDebt={capexAdditionsForDebt}
        plInputs={plInputs}
        onPLInputChange={(field, val) => {
          const next = { ...plInputs, [field]: val }
          setPlInputs(next)
          saveSession({ pl_inputs: next })
        }}
      />
    </div>
  )
}
