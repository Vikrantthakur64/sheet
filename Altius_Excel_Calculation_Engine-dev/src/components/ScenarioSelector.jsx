import React from 'react'
import { SCENARIOS } from '../data/scenarios'

/**
 * Dropdown to switch between available scenarios.
 */
export default function ScenarioSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="scenario-select" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
        Scenario:
      </label>
      <select
        id="scenario-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   shadow-sm cursor-pointer min-w-[180px]"
        aria-label="Select scenario"
      >
        {Object.entries(SCENARIOS).map(([key, scenario]) => (
          <option key={key} value={key}>
            {key} — {scenario.label}
          </option>
        ))}
      </select>

      {/* Active scenario badge */}
      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
        {SCENARIOS[value]?.label}
      </span>
    </div>
  )
}
