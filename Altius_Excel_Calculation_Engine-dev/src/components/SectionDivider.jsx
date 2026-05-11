const colorMap = {
  blue:    { bg: 'bg-blue-600',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700 border-blue-200'    },
  indigo:  { bg: 'bg-indigo-600',  text: 'text-indigo-600',  badge: 'bg-indigo-100 text-indigo-700 border-indigo-200'  },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700 border-orange-200'  },
}

export default function SectionDivider({ num, title, subtitle, color }) {
  const c = colorMap[color] || colorMap.blue
  return (
    <div className="flex items-center gap-4 mb-4">
      <span className={`flex items-center justify-center w-8 h-8 rounded-full
                        text-white text-sm font-bold shrink-0 ${c.bg}`}>
        {num}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className={`text-sm font-bold ${c.text}`}>{title}</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
            {subtitle}
          </span>
        </div>
        <div className={`mt-1.5 h-px ${c.bg} opacity-30`} />
      </div>
    </div>
  )
}
