import * as XLSX from 'xlsx'
import { SCENARIOS } from '../data/scenarios'

export function handleDownload({ inputs, scenarioRows, dismantleRows, yearLabels, growthPct, allSeries, scenarioId }) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Scenario Inputs
  const wsInputs = XLSX.utils.aoa_to_sheet([
    ['Model Scenario', 'Description', '% Increase', 'Tenure', 'Current FY (Month)', 'Next FY (Month)'],
    [],
    ['-- New Tower Adds --'],
    ...scenarioRows.map((r) => [r.modelScenario, r.description, `${r.pctIncrease}%`, inputs.tenure, r.currentFinancialYear, r.nextFinancialYear]),
    [],
    ['-- Dismantle Sites --'],
    ...dismantleRows.map((r) => [r.modelScenario, r.description, `${r.pctIncrease}%`, inputs.tenure, r.currentFinancialYear, r.nextFinancialYear]),
  ])
  wsInputs['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsInputs, 'Scenario Inputs')

  // Sheet 2: Tower Model
  const numRow  = ['YoY %', 'Section', 'Row', 'Unit', ...yearLabels.map((_, i) => i + 1)]
  const yearRow = ['', '', '', '', ...yearLabels]
  const g = growthPct

  const dataRows = [
    [`${g}%`, 'New Tower Adds', `Selected Case (${SCENARIOS[scenarioId]?.label || ''})`, '# towers', ...allSeries.sel_tower],
    [`${g}%`, 'New Tower Adds', 'Base Case', '#', ...allSeries.base_tower],
    [`${g}%`, 'New Tower Adds', 'Updated BP 25', '#', ...allSeries.bp25_tower],
    [],
    [`${g}%`, 'Dismantle Sites', `Selected Case (${SCENARIOS[scenarioId]?.label || ''})`, '# towers', ...allSeries.sel_dm],
    [`${g}%`, 'Dismantle Sites', 'Base Case', '#', ...allSeries.base_dm],
    [`${g}%`, 'Dismantle Sites', 'Updated BP 25', '#', ...allSeries.bp25_dm],
  ]
  const ws = XLSX.utils.aoa_to_sheet([numRow, yearRow, [], ...dataRows])
  ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, ...yearLabels.map(() => ({ wch: 10 }))]
  XLSX.utils.book_append_sheet(wb, ws, 'Tower Model')

  // Sheet 3: Model Inputs
  const wsMeta = XLSX.utils.aoa_to_sheet([
    ['Parameter',                    'Value'],
    ['Year Start',                   `01/04/${inputs.yearStart}`],
    ['Tenure (yrs)',                 inputs.tenure],
    ['Equity Contribution (INR MM)', inputs.equityContribution],
  ])
  wsMeta['!cols'] = [{ wch: 32 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Model Inputs')

  XLSX.writeFile(wb, `tower_model_${(SCENARIOS[scenarioId]?.label || 'export').replace(/\s+/g, '_')}.xlsx`)
}
