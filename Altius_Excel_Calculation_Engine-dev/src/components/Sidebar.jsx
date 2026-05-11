// Individual section nav items — commented out for now
/*
const NAV_ITEMS = [
  { id: 'ground',            label: 'Ground-Based Towers' },
  { id: 'tenancies',         label: 'Tenancies'           },
  { id: 'revenue',           label: 'Revenue'             },
  { id: 'capex',             label: 'Capex & PPE'         },
  { id: 'opex',              label: 'Opex'                },
  { id: 'debt-shl',          label: 'Debt — SHL'          },
  { id: 'debt-invit',        label: 'Debt — INVIT'        },
  { id: 'other-assumptions', label: 'Assumptions'         },
  { id: 'output',            label: 'Output'              },
]
*/

export default function Sidebar({ activeSection, onSelect, collapsed, onToggle }) {
  return (
    <aside
      className={`flex flex-col bg-[#0d2045] text-white transition-all duration-200 shrink-0
                  ${collapsed ? 'w-16' : 'w-56'}`}
      style={{ minHeight: '100%' }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end px-3 py-3 border-b border-white/10">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-300
                     hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto" role="navigation" aria-label="Main navigation">

        {/* ── Input Form ── */}
        {(() => {
          const isActive = activeSection === 'view-all'
          return (
            <button
              onClick={() => onSelect('view-all')}
              title={collapsed ? 'Input Form' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                          transition-all duration-150 group relative
                          ${isActive
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-emerald-300 hover:bg-emerald-600/20 hover:text-emerald-200'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full
                                text-[10px] font-bold border
                                ${isActive
                                  ? 'bg-white text-emerald-600 border-white'
                                  : 'border-emerald-600 text-emerald-400 group-hover:border-emerald-400'
                                }`}>
                ✦
              </span>
              <span className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold leading-tight truncate">Input Form</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6
                                 bg-emerald-300 rounded-r-full" />
              )}
            </button>
          )
        })()}

        <div className="my-2 border-t border-white/10" />

        {/* ── View Output ── */}
        {(() => {
          const isActive = activeSection === 'output'
          return (
            <button
              onClick={() => onSelect('output')}
              title={collapsed ? 'View Output' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                          transition-all duration-150 group relative
                          ${isActive
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-blue-300 hover:bg-blue-600/20 hover:text-blue-200'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full
                                text-[10px] font-bold border
                                ${isActive
                                  ? 'bg-white text-blue-600 border-white'
                                  : 'border-blue-500 text-blue-400 group-hover:border-blue-300'
                                }`}>
                ▶
              </span>
              <span className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold leading-tight truncate">View Output</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6
                                 bg-blue-300 rounded-r-full" />
              )}
            </button>
          )
        })()}

        <div className="my-2 border-t border-white/10" />

        {/* ── History ── */}
        {(() => {
          const isActive = activeSection === 'history'
          return (
            <button
              onClick={() => onSelect('history')}
              title={collapsed ? 'History' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                          transition-all duration-150 group relative
                          ${isActive
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'text-amber-300 hover:bg-amber-600/20 hover:text-amber-200'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full
                                text-[10px] font-bold border
                                ${isActive
                                  ? 'bg-white text-amber-600 border-white'
                                  : 'border-amber-600 text-amber-400 group-hover:border-amber-400'
                                }`}>
                ⏱
              </span>
              <span className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              {!collapsed && (
                <span className="text-xs font-semibold leading-tight truncate">History</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6
                                 bg-amber-300 rounded-r-full" />
              )}
            </button>
          )
        })()}

      </nav>

      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Financial Model</p>
          <p className="text-[10px] text-slate-600">v1.0</p>
        </div>
      )}
    </aside>
  )
}
