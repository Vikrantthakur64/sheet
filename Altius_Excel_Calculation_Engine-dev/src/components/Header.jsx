import React from 'react'

export default function Header({ onSave, onDownload, user, onLogout }) {
  return (
    <header className="bg-[#0d2045] text-white px-6 py-3 flex items-center justify-between shadow-lg">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 21V9l3-6 3 6v12M9 12h6" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wide leading-tight">Financial Modeling Dashboard</h1>
          <p className="text-blue-300 text-xs">Tower Infrastructure · Scenario Analysis</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* User badge */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold uppercase">
              {user.username[0]}
            </div>
            <span className="text-xs text-slate-300">{user.username}</span>
          </div>
        )}

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-500 transition-colors
                     text-xs font-medium px-3 py-2 rounded-md"
          aria-label="Save"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save
        </button>

        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 transition-colors
                     text-xs font-medium px-3 py-2 rounded-md"
          aria-label="Download Excel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Excel
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-700/60 hover:bg-red-600 transition-colors
                       text-xs font-medium px-3 py-2 rounded-md"
            aria-label="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}
