import React from 'react'

/**
 * Summary cards showing totals for the current scenario + growth settings.
 */
export default function SummaryCards({ towerAdds, dismantle }) {
  const totalTowers   = towerAdds.reduce((a, b) => a + b, 0)
  const totalDismantle = dismantle.reduce((a, b) => a + b, 0)
  const netAdditions  = totalTowers - totalDismantle

  const cards = [
    {
      label: 'Total Tower Adds',
      value: totalTowers.toLocaleString(),
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 21h18M9 21V9l3-6 3 6v12M9 12h6" />
        </svg>
      ),
    },
    {
      label: 'Total Dismantled',
      value: totalDismantle.toLocaleString(),
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      ),
    },
    {
      label: 'Net Additions',
      value: netAdditions.toLocaleString(),
      color: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-700',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center gap-4 border rounded-xl p-4 shadow-sm ${card.color}`}
        >
          <div className="shrink-0">{card.icon}</div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
