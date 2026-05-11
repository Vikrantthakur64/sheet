/**
 * Static scenario datasets (used as fallback / reference).
 * Each scenario has 8 data points (Apr-26 through Apr-33).
 */
export const SCENARIOS = {
  1: {
    label: 'Base Case',
    towerAdds: [110, 116, 121, 127, 134, 140, 147, 155],
    dismantle:  [47,  50,  52,  55,  57,  60,  63,  66],
  },
  2: {
    label: 'Updated BP 25',
    towerAdds: [162, 170, 179, 188, 197, 207, 217, 228],
    dismantle:  [139, 146, 153, 160, 168, 177, 186, 195],
  },
}

export const YEAR_LABELS = [
  'Apr-26', 'Apr-27', 'Apr-28', 'Apr-29',
  'Apr-30', 'Apr-31', 'Apr-32', 'Apr-33',
]

export const NUM_YEARS = 8

/**
 * Default rows for the Ground-Based Towers scenario input table.
 * Fields:
 *   modelScenario        — scenario number (read-only display)
 *   description          — scenario name
 *   baseValue            — Next Financial Year starting value (seed for Year 1)
 *   pctIncrease          — YoY growth % for this scenario
 *   numProjections       — number of years to project
 *   currentFinancialYear — Current FY value (Month)
 *   nextFinancialYear    — Next FY value (Month) — also used as the seed
 */
export const DEFAULT_SCENARIO_ROWS = [
  { modelScenario: 1, description: 'Base Case',      pctIncrease: '', currentFinancialYear: '', nextFinancialYear: '' },
  { modelScenario: 2, description: 'Updated BP 25',  pctIncrease: '', currentFinancialYear: '', nextFinancialYear: '' },
]

export const DEFAULT_DISMANTLE_ROWS = [
  { modelScenario: 1, description: 'Base Case',      pctIncrease: '', currentFinancialYear: '', nextFinancialYear: '' },
  { modelScenario: 2, description: 'Updated BP 25',  pctIncrease: '', currentFinancialYear: '', nextFinancialYear: '' },
]

// ── Tenancies data ────────────────────────────────────────────────────────────
export const TENANCY_SCENARIOS = {
  1: { label: 'Base Case',       newTenancies: [266, 279, 293, 308, 323, 340, 357, 374] },
  2: { label: 'BP 25 Updated',   newTenancies: [473, 496, 521, 547, 574, 603, 633, 665] },
}

// Default churn rates per scenario (as decimals, e.g. 0.005 = 0.5%)
export const TENANCY_CHURN = {
  1: [0.005, 0.005, 0.006, 0.006, 0.006, 0.007, 0.007, 0.007],
  2: [0.005, 0.005, 0.006, 0.006, 0.006, 0.007, 0.007, 0.007],
}

// Default IP Fee Escalation % (decimal) — all user-editable, pre-filled with 5%
export const DEFAULT_IP_FEE_ESC = Array(8).fill(0.05)

// Default Land Lease Recovery Profile % (decimal) — user-editable
export const DEFAULT_LAND_LEASE = [0.25, 0.27, 0.30, 0.35, 0.38, 0.40, 0.42, 0.45]

// Default Write-Off of Receivables (decimal) — user-editable
export const DEFAULT_WRITEOFF = {
  ipFees:         Array(8).fill(0.02),
  energyRevenue:  Array(8).fill(0.01),
  others:         Array(8).fill(0.005),
}
