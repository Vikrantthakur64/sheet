export const DEFAULT_INPUTS = {
  yearStart:          '2026',
  tenure:             '9',
  equityContribution: '79',
}

export const DEFAULT_REVENUE = {
  openingTower:          '',
  existingTenancies:     '',
  rateExistingTenancies: '',
  rateNewSites:          '',
  energyMargin:          '',
  energyOtherFeeRate:    '',
}

export function buildDefaultCells() {
  return {
    sel_tower_apr26: '',
    sel_tower_apr27: '',
    sel_dm_apr26:    '',
    sel_dm_apr27:    '',
  }
}
