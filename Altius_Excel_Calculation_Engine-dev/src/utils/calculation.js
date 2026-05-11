/**
 * Compute an array of `count` values starting from baseValue,
 * each subsequent = previous * (1 + growthPct / 100), rounded to integer.
 */
export function computeSeries(baseValue, growthPct, count) {
  const result = [baseValue]
  const factor = 1 + growthPct / 100
  for (let i = 1; i < count; i++) {
    result.push(Math.round(result[i - 1] * factor))
  }
  return result
}

/**
 * Apply growth rate to a full dataset array (decimal rate, e.g. 0.05 = 5%).
 * First value = data[0], rest = prev * (1 + rate).
 */
export function applyGrowth(data, rate) {
  const result = [data[0]]
  for (let i = 1; i < data.length; i++) {
    result.push(result[i - 1] * (1 + rate))
  }
  return result
}

/**
 * Apply growth rate for `count` years from a single seed value (decimal rate).
 */
export function applyGrowthFromSeed(seed, rate, count) {
  const result = [seed]
  for (let i = 1; i < count; i++) {
    result.push(result[i - 1] * (1 + rate))
  }
  return result
}

/**
 * Validate model-level input fields.
 */
export function validateInputs({ yearStart, tenure, equityContribution, growthPct }) {
  const errors = {}
  if (!yearStart) errors.yearStart = 'Year Start is required.'
  if (!tenure || isNaN(Number(tenure)) || Number(tenure) <= 0)
    errors.tenure = 'Tenure must be a positive number.'
  if (!equityContribution || isNaN(Number(equityContribution)))
    errors.equityContribution = 'Equity Contribution must be a number.'
  if (growthPct !== undefined && (growthPct === '' || isNaN(Number(growthPct))))
    errors.growthPct = 'Growth % must be a number.'
  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Build a churn-rate series from two explicit seed values (curFY%, nextFY%) plus YoY growth.
 * Input values are percentages (e.g. 5 = 5%); output is decimals (e.g. 0.05).
 */
export function buildChurnSeries(curFY, nextFY, yoyPct, count) {
  if (count === 0) return []
  if (count === 1) return [curFY / 100]
  const result = [curFY / 100, nextFY / 100]
  const factor = 1 + yoyPct / 100
  for (let i = 2; i < count; i++) result.push(result[i - 1] * factor)
  return result
}

/**
 * Generate column year labels formatted as "Apr-YY" for `count` years.
 */
export function generateYearLabels(startYear, count) {
  const base = parseInt(startYear, 10)
  if (isNaN(base)) return Array.from({ length: count }, (_, i) => `Apr-${26 + i}`)
  return Array.from({ length: count }, (_, i) => {
    const yr = (base + i) % 100
    return `Apr-${String(yr).padStart(2, '0')}`
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// TOWER SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute ground-based tower schedule for each projection year.
 *
 * Closing  = Opening + Adds − Dismantles
 * Average  = Closing (Year 1) | (prev Closing + Closing) / 2 (Year 2+)
 *
 * @param {number}   openingTowers  - tower count at start of Year 1
 * @param {number[]} towerAdds      - new tower additions per year (positive)
 * @param {number[]} dismantles     - towers dismantled per year (positive, subtracted)
 * @returns {{ opening, adds, dismantles, closing, average }[]}
 */
export function computeTowerSchedule(openingTowers, towerAdds, dismantles) {
  const count = towerAdds.length
  const rows = []
  let prevClosing = Number(openingTowers) || 0

  for (let i = 0; i < count; i++) {
    const opening = prevClosing
    const adds    = Number(towerAdds[i])  || 0
    const dm      = Number(dismantles[i]) || 0
    const closing = Math.round(opening + adds - dm)
    const average = i === 0 ? closing : Math.round((prevClosing + closing) / 2)
    rows.push({ opening, adds, dismantles: dm, closing, average })
    prevClosing = closing
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANCY SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute tenancy schedule for each year.
 *
 * Existing(Yr1) = openingExisting (input)
 * Existing(YrN) = Closing(YrN-1) × (1 − churnRates[N-2])
 * Closing       = Existing + New Tenancies
 * Average       = Closing (Year 1) | (prev Closing + Closing) / 2 (Year 2+)
 * avgExisting   = Existing (Year 1) | (prev Existing + Existing) / 2 (Year 2+)
 * avgNew        = New (Year 1)      | (prev New + New) / 2 (Year 2+)
 *
 * @param {number}   openingExisting - existing tenancies at start of Year 1
 * @param {number[]} newTenancies    - new tenancies added per year
 * @param {number[]} churnRates      - annual churn on closing tenancies (decimal, e.g. 0.005)
 * @returns {{ existing, newT, closing, average, avgExisting, avgNew }[]}
 */
export function computeTenancySchedule(openingExisting, newTenancies, churnRates) {
  const count = newTenancies.length
  const rows  = []
  let prevClosing  = Number(openingExisting) || 0
  let prevExisting = Number(openingExisting) || 0
  let prevNew      = 0

  for (let i = 0; i < count; i++) {
    const existing = i === 0
      ? prevClosing
      : Math.round(prevClosing * (1 - (Number(churnRates[i - 1]) || 0)))

    const newT    = Number(newTenancies[i]) || 0
    const closing = Math.round(existing + newT)

    const avgExisting = i === 0 ? existing : Math.round((prevExisting + existing) / 2)
    const avgNew      = i === 0 ? newT     : Math.round((prevNew + newT) / 2)
    const average     = i === 0 ? closing  : Math.round((prevClosing + closing) / 2)

    rows.push({ existing, newT, closing, average, avgExisting, avgNew })

    prevClosing  = closing
    prevExisting = existing
    prevNew      = newT
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE CARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escalate IP fee rates annually.
 * Year 1 uses base rates; each subsequent year compounds by ipFeeEscalation[i].
 *
 * @param {number}   baseRateExisting  - INR / tenant / month (Year 1)
 * @param {number}   baseRateNew       - INR / tenant / month (Year 1)
 * @param {number[]} ipFeeEscalation   - escalation per year (decimal, e.g. 0.05 = 5%)
 * @returns {{ rateExisting, rateNew }[]}
 */
export function computeRateCard(baseRateExisting, baseRateNew, ipFeeEscalation) {
  const count = ipFeeEscalation.length
  const rows  = []
  let rateExisting = Number(baseRateExisting) || 0
  let rateNew      = Number(baseRateNew)      || 0

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      const esc    = Number(ipFeeEscalation[i]) || 0
      rateExisting = rateExisting * (1 + esc)
      rateNew      = rateNew      * (1 + esc)
    }
    rows.push({ rateExisting, rateNew })
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute GBT (IP Fee) revenue using separate existing / new tenancy averages.
 *
 * Revenue = avgTenancies × rate × 12 / 1,000,000  (INR MM)
 *
 * @param {{ avgExisting, avgNew }[]} tenancySchedule
 * @param {{ rateExisting, rateNew }[]} rateCard
 * @returns {{ existingRev, newRev, totalRev }[]}
 */
export function computeGBTRevenue(tenancySchedule, rateCard) {
  return tenancySchedule.map((t, i) => {
    const { rateExisting = 0, rateNew = 0 } = rateCard[i] || {}
    const existingRev = t.avgExisting * rateExisting * 12 / 1_000_000
    const newRev      = t.avgNew      * rateNew      * 12 / 1_000_000
    return { existingRev, newRev, totalRev: existingRev + newRev }
  })
}

/**
 * Compute energy and other revenue.
 *
 * Energy Fee Rate = energyChargesPerTenant × (1 + energyMargin)
 * Energy Revenue  = avgTenancies × energyFeeRate × 12 / 1,000,000  (INR MM)
 *
 * @param {number[]} avgTenancies           - average tenancies per year
 * @param {number[]} energyChargesPerTenant - INR / tenant / month (pre-margin, escalated)
 * @param {number[]} energyMargins          - margin per year (decimal, e.g. 0.05)
 * @returns {{ energyFeeRate, energyRevenue }[]}
 */
export function computeEnergyRevenue(avgTenancies, energyChargesPerTenant, energyMargins) {
  return avgTenancies.map((avgT, i) => {
    const charges      = Number(energyChargesPerTenant[i]) || 0
    const margin       = Number(energyMargins[i])          || 0
    const energyFeeRate  = charges * (1 + margin)
    const energyRevenue  = avgT * energyFeeRate * 12 / 1_000_000
    return { energyFeeRate, energyRevenue }
  })
}

/**
 * Compute land lease reimbursement.
 *
 * LLR = avgTowers × leaseRentPerSite × landLeaseRecoveryPct × 12 / 1,000,000  (INR MM)
 *
 * @param {number[]} avgTowers
 * @param {number[]} leaseRentPerSite      - INR / tower / month
 * @param {number[]} landLeaseRecoveryPct  - decimal (e.g. 0.27 = 27%)
 * @returns {number[]}
 */
export function computeLandLeaseReimbursement(avgTowers, leaseRentPerSite, landLeaseRecoveryPct) {
  return avgTowers.map((avgT, i) =>
    avgT
    * (Number(leaseRentPerSite[i])     || 0)
    * (Number(landLeaseRecoveryPct[i]) || 0)
    * 12 / 1_000_000
  )
}

/**
 * Sum the three revenue streams into total revenue per year.
 *
 * Total Revenue = IP Fee Revenue + Energy Revenue + Land Lease Reimbursement
 *
 * @param {{ totalRev }[]}       gbtRevenue
 * @param {{ energyRevenue }[]}  energyRevenue
 * @param {number[]}             landLeaseReimbursement
 * @returns {number[]}
 */
export function computeTotalRevenue(gbtRevenue, energyRevenue, landLeaseReimbursement) {
  return gbtRevenue.map((g, i) =>
    g.totalRev
    + (energyRevenue[i]?.energyRevenue     || 0)
    + (landLeaseReimbursement[i]           || 0)
  )
}

/**
 * Compute write-offs on IP fees and energy revenue.
 *
 * Write-off = Revenue × write-off %
 *
 * @param {{ totalRev }[]}       gbtRevenue
 * @param {{ energyRevenue }[]}  energyRevenue
 * @param {number[]} ipFeeWriteoffPct   - decimal per year
 * @param {number[]} energyWriteoffPct  - decimal per year
 * @returns {{ ipFeeWriteoff, energyWriteoff, totalWriteoff }[]}
 */
export function computeWriteoffs(gbtRevenue, energyRevenue, ipFeeWriteoffPct, energyWriteoffPct) {
  return gbtRevenue.map((g, i) => {
    const ipFeeWriteoff   = g.totalRev                              * (Number(ipFeeWriteoffPct[i])  || 0)
    const energyWriteoff  = (energyRevenue[i]?.energyRevenue || 0)  * (Number(energyWriteoffPct[i]) || 0)
    return { ipFeeWriteoff, energyWriteoff, totalWriteoff: ipFeeWriteoff + energyWriteoff }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// OPEX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute all opex lines for each year (INR MM).
 *
 * Lease Rent    = avgTowers    × leaseRentPerSite      × 12 / 1,000,000
 * Energy Opex   = avgTenancies × energyChargesPerTenant × 12 / 1,000,000
 * R&M           = avgTowers    × rAndMPerSite          × 12 / 1,000,000
 * Admin & Salary are already in INR M (pass directly)
 *
 * @param {number[]} avgTowers
 * @param {number[]} avgTenancies
 * @param {{
 *   leaseRentPerSite:       number[],  // INR / tower  / month
 *   energyChargesPerTenant: number[],  // INR / tenant / month
 *   rAndMPerSite:           number[],  // INR / tower  / month
 *   adminCost:              number[],  // INR M (already in millions)
 *   totalSalaryCost:        number[],  // INR M
 * }} opexInputs
 * @returns {{ leaseRent, energyExpense, rAndM, admin, salary, totalOpex }[]}
 */
export function computeOpex(avgTowers, avgTenancies, opexInputs) {
  const { leaseRentPerSite, energyChargesPerTenant, rAndMPerSite, adminCost, totalSalaryCost } = opexInputs

  return avgTowers.map((avgT, i) => {
    const avgTen       = avgTenancies[i] || 0
    const leaseRent    = avgT   * (Number(leaseRentPerSite[i])       || 0) * 12 / 1_000_000
    const energyExpense = avgTen * (Number(energyChargesPerTenant[i]) || 0) * 12 / 1_000_000
    const rAndM        = avgT   * (Number(rAndMPerSite[i])           || 0) * 12 / 1_000_000
    const admin        = Number(adminCost[i])       || 0
    const salary       = Number(totalSalaryCost[i]) || 0
    const totalOpex    = leaseRent + energyExpense + rAndM + admin + salary
    return { leaseRent, energyExpense, rAndM, admin, salary, totalOpex }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// EBITDA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EBITDA = Revenue − R&M − Salary − Admin − Lease Cost − Write-offs − Energy Opex
 * EBITDA % = EBITDA / Total Revenue
 *
 * @param {number[]}                          totalRevenue
 * @param {{ rAndM, salary, admin, leaseRent, energyExpense }[]} opex
 * @param {{ totalWriteoff }[]}               writeoffs
 * @returns {{ ebitda, ebitdaPct }[]}
 */
export function computeEBITDA(totalRevenue, opex, writeoffs) {
  return totalRevenue.map((rev, i) => {
    const o      = opex[i]      || {}
    const writeoff = writeoffs[i]?.totalWriteoff || 0
    const ebitda = rev
      - (o.rAndM         || 0)
      - (o.salary        || 0)
      - (o.admin         || 0)
      - (o.leaseRent     || 0)
      - writeoff
      - (o.energyExpense || 0)
    const ebitdaPct = rev > 0 ? ebitda / rev : 0
    return { ebitda, ebitdaPct }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPEX SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute capital expenditure for each year (INR MM).
 *
 * New Tower Capex   = newTowerAdds × capexPerSite  (capexPerSite in INR MM / tower)
 * Maintenance Capex = avgTowers × maintenanceCapexPerSite / 1,000,000
 *                     (maintenanceCapexPerSite in INR / tower)
 *
 * @param {number[]} newTowerAdds
 * @param {number[]} capexPerSite              - INR MM / tower
 * @param {number[]} maintenanceCapexPerSite   - INR / tower
 * @param {number[]} avgTowers
 * @returns {{ newTowerCapex, maintenanceCapex, totalCapex }[]}
 */
export function computeCapexSchedule(newTowerAdds, capexPerSite, maintenanceCapexPerSite, avgTowers) {
  return newTowerAdds.map((adds, i) => {
    const newTowerCapex    = (Number(adds) || 0)       * (Number(capexPerSite[i])            || 0)
    const maintenanceCapex = (Number(avgTowers[i]) || 0) * (Number(maintenanceCapexPerSite[i]) || 0) / 1_000_000
    return { newTowerCapex, maintenanceCapex, totalCapex: newTowerCapex + maintenanceCapex }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PPE / DEPRECIATION SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute Property, Plant & Equipment and depreciation schedule (INR MM).
 *
 * Closing Gross Block = Opening + Capex Additions
 * Depreciation        = Average Gross Block × depreciationRate
 * Accumulated Dep     = prior accumulated + current depreciation
 * Net Block (PPE)     = Closing Gross Block − Accumulated Depreciation
 *
 * @param {number}   openingGrossBlock      - INR MM (before first-year additions)
 * @param {number}   openingAccumulatedDep  - INR MM (accumulated depreciation at start)
 * @param {number[]} capexPerYear           - INR MM additions each year
 * @param {number}   depreciationRate       - decimal (e.g. 0.07 = 7%)
 * @returns {{ openingGB, additions, closingGB, depreciation, accumulatedDep, netBlock }[]}
 */
export function computePPESchedule(openingGrossBlock, openingAccumulatedDep, capexPerYear, depreciationRate) {
  const count  = capexPerYear.length
  const rows   = []
  let openingGB  = Number(openingGrossBlock)     || 0
  let accumDep   = Number(openingAccumulatedDep) || 0

  for (let i = 0; i < count; i++) {
    const additions   = Number(capexPerYear[i]) || 0
    const closingGB   = openingGB + additions
    const avgGB       = (openingGB + closingGB) / 2
    const depreciation = avgGB * (Number(depreciationRate) || 0)
    accumDep          += depreciation
    const netBlock    = closingGB - accumDep

    rows.push({ openingGB, additions, closingGB, depreciation, accumulatedDep: accumDep, netBlock })
    openingGB = closingGB
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBT SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute Shareholder Loan (SHL) debt schedule (INR MM).
 *
 * Finance Cost = Average(Opening, Closing) × interestRate
 * Repayments are provided directly (driven by available cashflow in the full model).
 *
 * @param {number}   openingBalance
 * @param {number[]} additions    - new SHL drawdowns per year
 * @param {number[]} repayments   - repayments per year (positive)
 * @param {number}   interestRate - decimal (e.g. 0.09)
 * @returns {{ opening, additions, repayments, closing, financeCost }[]}
 */
export function computeSHLDebtSchedule(openingBalance, additions, repayments, interestRate) {
  const count = additions.length
  const rows  = []
  let opening = Number(openingBalance) || 0

  for (let i = 0; i < count; i++) {
    const add       = Number(additions[i])  || 0
    const rep       = Number(repayments[i]) || 0
    const closing   = Math.max(0, opening + add - rep)
    const avgBalance  = (opening + closing) / 2
    const financeCost = avgBalance * (Number(interestRate) || 0)
    rows.push({ opening, additions: add, repayments: rep, closing, financeCost })
    opening = closing
  }
  return rows
}

/**
 * Compute Capex Debt schedule (INR MM).
 *
 * Repayment = Opening × repaymentPct + Additions × repaymentPct × 0.5
 *   (additions are assumed to be drawn mid-year, so half-year repayment applies)
 * Finance Cost = Average(Opening, Closing) × interestRate
 *
 * @param {number}   openingBalance
 * @param {number[]} additions      - new capex debt drawdowns per year
 * @param {number}   repaymentPct   - annual repayment as % of opening (decimal, e.g. 0.05)
 * @param {number}   interestRate   - decimal (e.g. 0.08)
 * @returns {{ opening, additions, repayments, closing, financeCost }[]}
 */
export function computeCapexDebtSchedule(openingBalance, additions, repaymentPct, interestRate) {
  const count = additions.length
  const rows  = []
  let opening = Number(openingBalance) || 0
  const rate  = Number(repaymentPct)   || 0

  for (let i = 0; i < count; i++) {
    const add        = Number(additions[i]) || 0
    const repayment  = opening * rate + add * rate * 0.5
    const closing    = Math.max(0, opening + add - repayment)
    const avgBalance  = (opening + closing) / 2
    const financeCost = avgBalance * (Number(interestRate) || 0)
    rows.push({ opening, additions: add, repayments: repayment, closing, financeCost })
    opening = closing
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// P&L
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PBT = EBITDA − Depreciation − Finance Cost
 *
 * @param {{ ebitda }[]}     ebitdaSchedule
 * @param {{ depreciation }[]} ppeSchedule
 * @param {{ financeCost }[]}  shlDebt
 * @param {{ financeCost }[]}  capexDebt
 * @returns {number[]}
 */
export function computePBT(ebitdaSchedule, ppeSchedule, shlDebt, capexDebt) {
  return ebitdaSchedule.map((e, i) =>
    e.ebitda
    - (ppeSchedule[i]?.depreciation  || 0)
    - (shlDebt[i]?.financeCost       || 0)
    - (capexDebt[i]?.financeCost     || 0)
  )
}

/**
 * PAT = PBT × (1 − taxRate).  Tax = 0 in this model.
 *
 * @param {number[]} pbt
 * @param {number}   taxRate - decimal (e.g. 0.25); use 0 for tax-free
 * @returns {number[]}
 */
export function computePAT(pbt, taxRate = 0) {
  return pbt.map((p) => p * (1 - (Number(taxRate) || 0)))
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKING CAPITAL & CASHFLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trade Receivables = Total Revenue × receivableDays / 365  (INR MM)
 *
 * @param {number[]} totalRevenue
 * @param {number}   receivableDays
 * @returns {number[]}
 */
export function computeTradeReceivables(totalRevenue, receivableDays) {
  return totalRevenue.map((rev) => rev * (Number(receivableDays) || 0) / 365)
}

/**
 * Trade Payables = Total Opex × payableDays / 365  (INR MM)
 *
 * @param {{ totalOpex }[]} opex
 * @param {number}          payableDays
 * @returns {number[]}
 */
export function computeTradePayables(opex, payableDays) {
  return opex.map((o) => (o.totalOpex || 0) * (Number(payableDays) || 0) / 365)
}

/**
 * Working Capital Change = ΔPayables − ΔReceivables
 * (positive = cash inflow, negative = cash outflow)
 *
 * @param {number[]} receivables
 * @param {number[]} payables
 * @param {number}   openingReceivables - balance at start of Year 1
 * @param {number}   openingPayables    - balance at start of Year 1
 * @returns {number[]}
 */
export function computeWorkingCapitalChange(receivables, payables, openingReceivables, openingPayables) {
  return receivables.map((rec, i) => {
    const prevRec = i === 0 ? (Number(openingReceivables) || 0) : receivables[i - 1]
    const prevPay = i === 0 ? (Number(openingPayables)    || 0) : payables[i - 1]
    const deltaRec = rec - prevRec
    const deltaPay = (payables[i] || 0) - prevPay
    return deltaPay - deltaRec
  })
}

/**
 * Cashflow from Operating Activities = EBITDA + WC Change − Tax
 *
 * @param {{ ebitda }[]} ebitdaSchedule
 * @param {number[]}     wcChange
 * @param {number[]}     tax             - tax paid per year (INR MM)
 * @returns {number[]}
 */
export function computeCFOperations(ebitdaSchedule, wcChange, tax) {
  return ebitdaSchedule.map((e, i) =>
    e.ebitda + (wcChange[i] || 0) - (tax[i] || 0)
  )
}

/**
 * Cashflow from Investing Activities = −Total Capex per year
 *
 * @param {{ totalCapex }[]} capexSchedule
 * @returns {number[]}
 */
export function computeCFInvesting(capexSchedule) {
  return capexSchedule.map((c) => -(c.totalCapex || 0))
}

/**
 * Cashflow from Financing Activities = Debt Additions − Debt Repayments − Finance Cost
 *
 * @param {{ additions, repayments, financeCost }[]} capexDebt
 * @returns {number[]}
 */
export function computeCFFinancing(capexDebt) {
  return capexDebt.map((d) =>
    (d.additions || 0) - (d.repayments || 0) - (d.financeCost || 0)
  )
}

/**
 * Compute equity cashflows to InvIT investors.
 *
 * Equity CF = SHL Coupon + SHL Repayment + Dividend − Capex Debt Finance Cost − Capex Debt Repayment
 *
 * @param {{ financeCost }[]}             shlDebt
 * @param {{ repayments }[]}              shlRepayments   - SHL principal repaid each year
 * @param {number[]}                      dividends       - dividends distributed per year (INR MM)
 * @param {{ financeCost, repayments }[]} capexDebt
 * @returns {number[]}
 */
export function computeEquityCashflows(shlDebt, shlRepayments, dividends, capexDebt) {
  return shlDebt.map((shl, i) =>
    (shl.financeCost              || 0)
    + (shlRepayments[i]?.repayments || shl.repayments || 0)
    + (dividends[i]                 || 0)
    - (capexDebt[i]?.financeCost    || 0)
    - (capexDebt[i]?.repayments     || 0)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUITY IRR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute IRR using Newton-Raphson iteration.
 *
 * cashflows[0] should be the initial (negative) equity investment.
 * cashflows[1..n] are the yearly inflows.
 *
 * @param {number[]} cashflows  - [-initialEquity, yr1CF, yr2CF, …]
 * @param {number}   guess      - initial rate guess (default 0.1)
 * @returns {number|null}       - IRR as decimal, or null if no convergence
 */
export function computeIRR(cashflows, guess = 0.1) {
  const MAX_ITER  = 1000
  const TOLERANCE = 1e-7
  let rate = guess

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let npv  = 0
    let dnpv = 0
    for (let t = 0; t < cashflows.length; t++) {
      const cf    = cashflows[t]
      const denom = Math.pow(1 + rate, t)
      npv  += cf / denom
      dnpv -= t * cf / (denom * (1 + rate))
    }
    if (Math.abs(dnpv) < 1e-12) return null
    const newRate = rate - npv / dnpv
    if (Math.abs(newRate - rate) < TOLERANCE) return newRate
    rate = newRate
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE SHEET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute balance sheet snapshot for each year (INR MM).
 *
 * Assets  = Net PPE + Trade Receivables + Deposits + Cash
 * Equity  = Share Capital + Retained Earnings (PAT accumulated)
 * Debt    = SHL Closing + Capex Debt Closing
 * Liabilities = Equity + Debt + Trade Payables
 *
 * @param {{
 *   equity:             number,    // share capital (constant)
 *   openingRetained:    number,    // retained earnings at start of Year 1
 *   deposits:           number,    // other assets / deposits (constant)
 *   openingCash:        number,    // cash at start of Year 1
 *   minCashBalance:     number,    // minimum cash to maintain
 * }} constants
 * @param {{ netBlock }[]}                      ppeSchedule
 * @param {{ closing: number, financeCost }[]}  shlDebt
 * @param {{ closing: number }[]}               capexDebt
 * @param {number[]}                            tradeReceivables
 * @param {number[]}                            tradePayables
 * @param {number[]}                            pat
 * @param {number[]}                            dividends
 * @param {number[]}                            cfOperations
 * @param {number[]}                            cfInvesting
 * @param {number[]}                            cfFinancing
 * @returns {{ equity, retainedEarnings, shlDebt, capexDebt, tradePayables,
 *             ppe, tradeReceivables, deposits, cash, totalAssets, totalLiabilities, check }[]}
 */
export function computeBalanceSheet(
  constants,
  ppeSchedule, shlDebt, capexDebt,
  tradeReceivables, tradePayables,
  pat, dividends,
  cfOperations, cfInvesting, cfFinancing,
) {
  const { equity, openingRetained = 0, deposits = 0, openingCash = 0, minCashBalance = 0 } = constants
  const rows      = []
  let retained    = Number(openingRetained) || 0
  let cash        = Number(openingCash)     || 0

  for (let i = 0; i < ppeSchedule.length; i++) {
    retained += pat[i] || 0

    const netCF = (cfOperations[i] || 0) + (cfInvesting[i] || 0) + (cfFinancing[i] || 0)
    const div   = dividends[i] || 0
    cash = Math.max(minCashBalance, cash + netCF - div)

    const ppe          = ppeSchedule[i]?.netBlock          || 0
    const rec          = tradeReceivables[i]               || 0
    const pay          = tradePayables[i]                  || 0
    const shlClose     = shlDebt[i]?.closing               || 0
    const capexClose   = capexDebt[i]?.closing             || 0
    const totalAssets  = ppe + rec + deposits + cash
    const totalLiab    = equity + retained + shlClose + capexClose + pay
    const check        = totalAssets - totalLiab

    rows.push({
      equity:           Number(equity) || 0,
      retainedEarnings: retained,
      shlDebt:          shlClose,
      capexDebt:        capexClose,
      tradePayables:    pay,
      ppe,
      tradeReceivables: rec,
      deposits,
      cash,
      totalAssets,
      totalLiabilities: totalLiab,
      check,
    })
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER OUTPUT SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wire all sub-calculations together and return a full model output.
 *
 * @param {{
 *   openingTowers:           number,
 *   towerAdds:               number[],
 *   dismantles:              number[],
 *   openingExisting:         number,
 *   newTenancies:            number[],
 *   churnRates:              number[],
 *   baseRateExisting:        number,
 *   baseRateNew:             number,
 *   ipFeeEscalation:         number[],
 *   energyChargesPerTenant:  number[],
 *   energyMargins:           number[],
 *   leaseRentPerSite:        number[],
 *   landLeaseRecoveryPct:    number[],
 *   ipFeeWriteoffPct:        number[],
 *   energyWriteoffPct:       number[],
 *   rAndMPerSite:            number[],
 *   adminCost:               number[],
 *   totalSalaryCost:         number[],
 *   capexPerSite:            number[],
 *   maintenanceCapexPerSite: number[],
 *   openingGrossBlock:       number,
 *   openingAccumulatedDep:   number,
 *   depreciationRate:        number,
 *   openingSHL:              number,
 *   shlAdditions:            number[],
 *   shlRepayments:           number[],
 *   shlInterestRate:         number,
 *   openingCapexDebt:        number,
 *   capexDebtRepaymentPct:   number,
 *   capexDebtInterestRate:   number,
 *   taxRate:                 number,
 *   receivableDays:          number,
 *   payableDays:             number,
 *   openingReceivables:      number,
 *   openingPayables:         number,
 *   equityContribution:      number,
 *   dividends:               number[],
 *   deposits:                number,
 *   openingCash:             number,
 *   minCashBalance:          number,
 *   shareCapital:            number,
 *   openingRetained:         number,
 * }} inputs
 * @returns {{
 *   towerSchedule, tenancySchedule, rateCard,
 *   gbtRevenue, energyRevenue, landLeaseReimbursement, totalRevenue,
 *   writeoffs, opex, ebitda,
 *   capexSchedule, ppeSchedule, shlDebt, capexDebt,
 *   pbt, pat,
 *   tradeReceivables, tradePayables, wcChange,
 *   cfOperations, cfInvesting, cfFinancing,
 *   equityCashflows, equityIRR,
 *   balanceSheet,
 * }}
 */
export function computeOutputSummary(inputs) {
  const towerSchedule = computeTowerSchedule(
    inputs.openingTowers, inputs.towerAdds, inputs.dismantles,
  )

  const tenancySchedule = computeTenancySchedule(
    inputs.openingExisting, inputs.newTenancies, inputs.churnRates,
  )

  const rateCard = computeRateCard(
    inputs.baseRateExisting, inputs.baseRateNew, inputs.ipFeeEscalation,
  )

  const gbtRevenue = computeGBTRevenue(tenancySchedule, rateCard)

  const energyRev = computeEnergyRevenue(
    tenancySchedule.map((t) => t.average),
    inputs.energyChargesPerTenant,
    inputs.energyMargins,
  )

  const landLeaseReimb = computeLandLeaseReimbursement(
    towerSchedule.map((t) => t.average),
    inputs.leaseRentPerSite,
    inputs.landLeaseRecoveryPct,
  )

  const totalRevenue = computeTotalRevenue(gbtRevenue, energyRev, landLeaseReimb)

  const writeoffs = computeWriteoffs(
    gbtRevenue, energyRev, inputs.ipFeeWriteoffPct, inputs.energyWriteoffPct,
  )

  const opex = computeOpex(
    towerSchedule.map((t) => t.average),
    tenancySchedule.map((t) => t.average),
    {
      leaseRentPerSite:       inputs.leaseRentPerSite,
      energyChargesPerTenant: inputs.energyChargesPerTenant,
      rAndMPerSite:           inputs.rAndMPerSite,
      adminCost:              inputs.adminCost,
      totalSalaryCost:        inputs.totalSalaryCost,
    },
  )

  const ebitdaSchedule = computeEBITDA(totalRevenue, opex, writeoffs)

  const capexSchedule = computeCapexSchedule(
    inputs.towerAdds,
    inputs.capexPerSite,
    inputs.maintenanceCapexPerSite,
    towerSchedule.map((t) => t.average),
  )

  const ppeSchedule = computePPESchedule(
    inputs.openingGrossBlock,
    inputs.openingAccumulatedDep,
    capexSchedule.map((c) => c.totalCapex),
    inputs.depreciationRate,
  )

  const shlDebt = computeSHLDebtSchedule(
    inputs.openingSHL,
    inputs.shlAdditions,
    inputs.shlRepayments,
    inputs.shlInterestRate,
  )

  const capexDebt = computeCapexDebtSchedule(
    inputs.openingCapexDebt,
    capexSchedule.map((c) => c.totalCapex),
    inputs.capexDebtRepaymentPct,
    inputs.capexDebtInterestRate,
  )

  const pbt = computePBT(ebitdaSchedule, ppeSchedule, shlDebt, capexDebt)
  const pat = computePAT(pbt, inputs.taxRate)

  const tradeReceivables = computeTradeReceivables(totalRevenue, inputs.receivableDays)
  const tradePayables    = computeTradePayables(opex, inputs.payableDays)

  const wcChange = computeWorkingCapitalChange(
    tradeReceivables, tradePayables,
    inputs.openingReceivables, inputs.openingPayables,
  )

  const cfOps  = computeCFOperations(ebitdaSchedule, wcChange, pat.map(() => 0))
  const cfInv  = computeCFInvesting(capexSchedule)
  const cfFin  = computeCFFinancing(capexDebt)

  const equityCFs = computeEquityCashflows(shlDebt, shlDebt, inputs.dividends, capexDebt)

  const irrCashflows = [-(Number(inputs.equityContribution) || 0), ...equityCFs]
  const equityIRR    = computeIRR(irrCashflows)

  const balanceSheet = computeBalanceSheet(
    {
      equity:          inputs.shareCapital,
      openingRetained: inputs.openingRetained,
      deposits:        inputs.deposits,
      openingCash:     inputs.openingCash,
      minCashBalance:  inputs.minCashBalance,
    },
    ppeSchedule, shlDebt, capexDebt,
    tradeReceivables, tradePayables,
    pat, inputs.dividends,
    cfOps, cfInv, cfFin,
  )

  return {
    towerSchedule,
    tenancySchedule,
    rateCard,
    gbtRevenue,
    energyRevenue:           energyRev,
    landLeaseReimbursement:  landLeaseReimb,
    totalRevenue,
    writeoffs,
    opex,
    ebitda:                  ebitdaSchedule,
    capexSchedule,
    ppeSchedule,
    shlDebt,
    capexDebt,
    pbt,
    pat,
    tradeReceivables,
    tradePayables,
    wcChange,
    cfOperations:            cfOps,
    cfInvesting:             cfInv,
    cfFinancing:             cfFin,
    equityCashflows:         equityCFs,
    equityIRR,
    balanceSheet,
  }
}
