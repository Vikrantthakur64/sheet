import React, { useState, useMemo, useRef } from 'react'
import { TENANCY_SCENARIOS } from '../data/scenarios'

// ── Style constants ───────────────────────────────────────────────────────────
const SEL_BG = 'bg-[#fde8d8]'
const W_BG   = 'bg-white'
const TD     = 'border border-slate-300'
const TH     = 'bg-[#1e3a5f] text-white text-xs font-semibold text-center px-2 py-2 border border-[#1e3a5f] whitespace-nowrap'

function fmtPct(val, dec = 2) {
  const n = Number(val)
  if (isNaN(n)) return ''
  return `${(n * 100).toFixed(dec)}%`
}

// ── Cell primitives ───────────────────────────────────────────────────────────
function BlueInput({ value, onChange, bg = W_BG }) {
  const ref = useRef(null)
  return (
    <td className={`${TD} p-0 ${bg}`} style={{ minWidth: 72 }}>
      <input
        ref={ref}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setTimeout(() => ref.current?.select(), 0)}
        className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                   text-blue-700 border-0 outline-none bg-[#dbeeff]
                   focus:ring-2 focus:ring-inset focus:ring-blue-500"
      />
    </td>
  )
}

function BlueDisplay({ value, pct = false, dec = 2, bg = W_BG }) {
  const display = pct ? fmtPct(value, dec) : Math.round(Number(value)).toLocaleString()
  return (
    <td className={`${TD} px-2 py-[5px] text-center text-xs font-bold tabular-nums text-blue-700 ${bg}`}
        style={{ minWidth: 72 }}>
      {display}
    </td>
  )
}

function CalcCell({ value, pct = false, dec = 2, bg = W_BG }) {
  const display = pct ? fmtPct(value, dec) : Math.round(Number(value)).toLocaleString()
  return (
    <td className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${bg}`}
        style={{ minWidth: 72 }}>
      {display}
    </td>
  )
}

function EmptyCell({ bg = W_BG }) {
  return <td className={`${TD} ${bg}`} style={{ minWidth: 72 }} />
}

// ── Sidebar cells ─────────────────────────────────────────────────────────────
function SidebarCells({ yoyPct, label, isSelected, scenarioId, onScenarioChange, unit, bg }) {
  return (
    <>
      <td className={`${TD} ${bg} px-2 py-[5px] text-xs text-slate-500 text-center font-medium`}
          style={{ width: 44 }}>
        {isSelected ? '' : (yoyPct !== undefined ? `${yoyPct}%` : '')}
      </td>
      <td className={`${TD} ${bg} px-2 py-[5px] text-xs whitespace-nowrap
                      ${isSelected ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
          style={{ minWidth: 160 }}>
        {label}
      </td>
      <td className={`${TD} ${bg} px-1 py-[5px] text-center`} style={{ width: 36 }}>
        {isSelected && onScenarioChange ? (
          <select
            value={scenarioId}
            onChange={(e) => onScenarioChange(Number(e.target.value))}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-400
                       rounded px-0.5 py-0 text-center focus:outline-none focus:ring-1
                       focus:ring-blue-400 cursor-pointer appearance-none"
            style={{ minWidth: 28 }}
          >
            {Object.entries(TENANCY_SCENARIOS).map(([k]) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        ) : null}
      </td>
      <td className={`${TD} ${bg} px-2 py-[5px] text-xs text-slate-400 italic text-center`}
          style={{ width: 64 }}>
        {unit || ''}
      </td>
    </>
  )
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function SectionHeaderRow({ label, totalCols }) {
  return (
    <tr>
      <td colSpan={totalCols}
        className="bg-[#b8d4ea] text-[#1e3a5f] text-xs font-bold px-3 py-[6px]
                   border border-slate-300 uppercase tracking-wide">
        {label}
      </td>
    </tr>
  )
}

function SubHeaderRow({ label, totalCols }) {
  return (
    <tr>
      <td colSpan={totalCols}
        className="bg-white text-slate-800 text-xs font-bold px-3 py-[5px]
                   border border-slate-300 underline">
        {label}
      </td>
    </tr>
  )
}

function SpacerRow({ totalCols }) {
  return (
    <tr>
      <td colSpan={totalCols} className="bg-white border-0 border-b border-slate-200"
          style={{ height: 10 }} />
    </tr>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TENANCIES COMPONENT
// Props:
//   yearLabels  string[]
//   formData    object — from TenancyInputForm (validated user inputs)
// ══════════════════════════════════════════════════════════════════════════════
export default function Tenancies({ yearLabels, formData, selectedCase = 'base' }) {
  const count     = yearLabels.length
  const totalCols = 4 + count

  // ── Scenario selector (inside the table) ──────────────────────────────────
  const [scenarioId, setScenarioId] = useState(1)

  // ── Row visibility based on selectedCase ─────────────────────────────────
  // 'base' → show Base Case row only; 'bp25' → show BP25/Case2 row only
  const showSelected = false  // Selected Case row is always hidden in filtered view
  const showBase     = selectedCase === 'base'
  const showBP25     = selectedCase === 'bp25'

  // ── Parse form data ───────────────────────────────────────────────────────
  // New Tenancies
  const yoy1      = parseFloat(formData?.nt_yoy_1)    || 0
  const yoy2      = parseFloat(formData?.nt_yoy_2)    || 0
  const ntCurFY1  = parseFloat(formData?.nt_curFY_1)  || 0   // → Apr-26 Selected Case Sc1
  const ntNextFY1 = parseFloat(formData?.nt_nextFY_1) || 0   // → Apr-27 Selected Case Sc1
  const ntCurFY2  = parseFloat(formData?.nt_curFY_2)  || 0   // → Apr-26 Selected Case Sc2
  const ntNextFY2 = parseFloat(formData?.nt_nextFY_2) || 0   // → Apr-27 Selected Case Sc2
  // Churn
  const chYoy1    = parseFloat(formData?.ch_yoy_1)    || 0
  const chYoy2    = parseFloat(formData?.ch_yoy_2)    || 0
  const chCurFY1  = parseFloat(formData?.ch_curFY_1)  || 0   // → Apr-26 Selected Case Sc1
  const chNextFY1 = parseFloat(formData?.ch_nextFY_1) || 0   // → Apr-27 Selected Case Sc1
  const chCurFY2  = parseFloat(formData?.ch_curFY_2)  || 0   // → Apr-26 Selected Case Sc2
  const chNextFY2 = parseFloat(formData?.ch_nextFY_2) || 0   // → Apr-27 Selected Case Sc2
  // Other sections — no longer used as pre-fill seeds (sections are self-contained)
  // const ipFeeRate = parseFloat(formData?.ipFeeEsc)    || 0
  // const landRate  = parseFloat(formData?.landLease)   || 0
  // const woIpFees  = parseFloat(formData?.wo_ipFees)   || 0
  // const woEnergy  = parseFloat(formData?.wo_energy)   || 0
  // const woOthers  = parseFloat(formData?.wo_others)   || 0

  // ── IP Fee Escalation — parse form seeds ─────────────────────────────────
  const ipCurFY1  = parseFloat(formData?.ip_curFY_base)  || 0
  const ipNextFY1 = parseFloat(formData?.ip_nextFY_base) || 0
  const ipCurFY2  = parseFloat(formData?.ip_curFY_case2) || 0
  const ipNextFY2 = parseFloat(formData?.ip_nextFY_case2)|| 0

  // ── IP Fee Escalation state — 2 non-selected scenarios ───────────────────
  const [ipFee, setIpFee] = useState({
    base:  { curFY: String(ipCurFY1  || ''), nextFY: String(ipNextFY1 || '') },
    case2: { curFY: String(ipCurFY2  || ''), nextFY: String(ipNextFY2 || '') },
  })

  // ── IP Fee Selected Case editable seeds ───────────────────────────────────
  const [selIpApr26, setSelIpApr26] = useState(String(ipCurFY1  || ''))
  const [selIpApr27, setSelIpApr27] = useState(String(ipNextFY1 || ''))

  // ── Land Lease Recovery — parse form seeds ────────────────────────────────
  const llBaseSeed = parseFloat(formData?.ll_base_0) || 0
  const llBp25Seed = parseFloat(formData?.ll_bp25_0) || 0

  // ── Land Lease Recovery state — 2 non-selected scenarios, all years manual
  const [landLease, setLandLease] = useState({
    base: Array.from({ length: count }, (_, i) => String(parseFloat(formData?.[`ll_base_${i}`]) || '')),
    bp25: Array.from({ length: count }, (_, i) => String(parseFloat(formData?.[`ll_bp25_${i}`]) || '')),
  })

  // ── Land Lease Selected Case editable seeds ───────────────────────────────
  const [selLlApr26, setSelLlApr26] = useState(String(llBaseSeed || ''))
  const [selLlApr27, setSelLlApr27] = useState(String(llBaseSeed || ''))

  // ── Write-Off state — 3 rows, single input auto-fills all columns ─────────
  const [writeOff, setWriteOff] = useState({
    ipFees:    String(parseFloat(formData?.wo_ipFees)    || ''),
    energyRev: String(parseFloat(formData?.wo_energyRev) || ''),
    others:    String(parseFloat(formData?.wo_others)    || ''),
  })

  // ── Derived: New Tenancies series ─────────────────────────────────────────
  //
  // EXACT same pattern as Ground-Based Tower:
  //
  // Selected Case:
  //   Apr-26 = curFY  (blue editable — from form)
  //   Apr-27 = nextFY (blue editable — from form)
  //   Apr-28+ = prev × (1 + YoY%)  (black italic)
  //
  // Base Case / BP25:
  //   Apr-26 = EMPTY
  //   Apr-27 = dataset[0]  (blue display — fixed seed)
  //   Apr-28+ = prev × (1 + YoY%)  (black italic, calculated from dataset[0])
  //
  const tenancySeries = useMemo(() => {
    // Selected Case series: [curFY, nextFY, calc, calc, …]
    function buildSelSeries(curFY, nextFY, yoyPct) {
      if (count <= 1) return [curFY]
      const result = [curFY, nextFY]
      const factor = 1 + yoyPct / 100
      for (let i = 2; i < count; i++) {
        result.push(Math.round(result[i - 1] * factor))
      }
      return result
    }

    // Base/BP25 series: [dataset[0], calc, calc, …]  (length = count - 1, shown from Apr-27)
    function buildBaseSeries(seed, yoyPct) {
      const result = [seed]
      const factor = 1 + yoyPct / 100
      for (let i = 1; i < count - 1; i++) {
        result.push(Math.round(result[i - 1] * factor))
      }
      return result  // length = count - 1
    }

    const selSc1 = buildSelSeries(ntCurFY1, ntNextFY1, yoy1)
    const selSc2 = buildSelSeries(ntCurFY2, ntNextFY2, yoy2)

    return {
      sel:      scenarioId === 1 ? selSc1 : selSc2,   // full array [Apr-26 … Apr-N]
      base:     buildBaseSeries(TENANCY_SCENARIOS[1].newTenancies[0], yoy1),  // [Apr-27 … Apr-N]
      bp25:     buildBaseSeries(TENANCY_SCENARIOS[2].newTenancies[0], yoy2),  // [Apr-27 … Apr-N]
    }
  }, [scenarioId, ntCurFY1, ntNextFY1, yoy1, ntCurFY2, ntNextFY2, yoy2, count])

  // ── Derived: Churn series — same pattern ──────────────────────────────────
  const churnSeries = useMemo(() => {
    function buildSelSeries(curFY, nextFY, yoyPct) {
      if (count <= 1) return [curFY]
      const result = [curFY, nextFY]
      const factor = 1 + yoyPct / 100
      for (let i = 2; i < count; i++) {
        result.push(result[i - 1] * factor)
      }
      return result
    }

    function buildBaseSeries(seed, yoyPct) {
      const result = [seed]
      const factor = 1 + yoyPct / 100
      for (let i = 1; i < count - 1; i++) {
        result.push(result[i - 1] * factor)
      }
      return result
    }

    const selSc1 = buildSelSeries(chCurFY1, chNextFY1, chYoy1)
    const selSc2 = buildSelSeries(chCurFY2, chNextFY2, chYoy2)

    return {
      sel:  scenarioId === 1 ? selSc1 : selSc2,
      base: buildBaseSeries(chCurFY1, chYoy1),   // Base Case seed = Sc1 curFY
      bp25: buildBaseSeries(chCurFY2, chYoy2),   // BP25 seed = Sc2 curFY
    }
  }, [scenarioId, chCurFY1, chNextFY1, chYoy1, chCurFY2, chNextFY2, chYoy2, count])

  // ── Editable seed state for Selected Case (Apr-26 and Apr-27) ───────────
  // Initialised from form data, but user can override directly in the table
  const [selNtApr26, setSelNtApr26] = useState(String(ntCurFY1))
  const [selNtApr27, setSelNtApr27] = useState(String(ntNextFY1))
  const [selChApr26, setSelChApr26] = useState(String(chCurFY1))
  const [selChApr27, setSelChApr27] = useState(String(chNextFY1))

  // Recompute Selected Case series when editable seeds change
  const selNtSeries = useMemo(() => {
    const v26 = parseFloat(selNtApr26) || 0
    const v27 = parseFloat(selNtApr27) || 0
    const yoy = scenarioId === 1 ? yoy1 : yoy2
    if (count <= 1) return [v26]
    const result = [v26, v27]
    const factor = 1 + yoy / 100
    for (let i = 2; i < count; i++) result.push(Math.round(result[i - 1] * factor))
    return result
  }, [selNtApr26, selNtApr27, scenarioId, yoy1, yoy2, count])

  const selChSeries = useMemo(() => {
    const v26 = parseFloat(selChApr26) || 0
    const v27 = parseFloat(selChApr27) || 0
    const yoy = scenarioId === 1 ? chYoy1 : chYoy2
    if (count <= 1) return [v26]
    const result = [v26, v27]
    const factor = 1 + yoy / 100
    for (let i = 2; i < count; i++) result.push(result[i - 1] * factor)
    return result
  }, [selChApr26, selChApr27, scenarioId, chYoy1, chYoy2, count])

  // ── IP Fee Selected Case series (Apr-26 editable, Apr-27 editable, Apr-28+ = nextFY repeated) ──
  const selIpSeries = useMemo(() => {
    const v26 = selIpApr26 !== '' ? selIpApr26 : ''
    const v27 = selIpApr27 !== '' ? selIpApr27 : ''
    if (count <= 1) return [v26]
    const result = [v26, v27]
    // remaining columns repeat nextFY (same as Base/Case2 behaviour)
    for (let i = 2; i < count; i++) result.push(v27)
    return result
  }, [selIpApr26, selIpApr27, count])

  // ── Land Lease Selected Case series (Apr-26 editable, Apr-27 editable, Apr-28+ = nextFY repeated) ──
  const selLlSeries = useMemo(() => {
    const v26 = selLlApr26 !== '' ? selLlApr26 : ''
    const v27 = selLlApr27 !== '' ? selLlApr27 : ''
    if (count <= 1) return [v26]
    const result = [v26, v27]
    for (let i = 2; i < count; i++) result.push(v27)
    return result
  }, [selLlApr26, selLlApr27, count])

  // Sync editable seeds when scenario changes
  const prevScenarioRef = React.useRef(scenarioId)
  React.useEffect(() => {
    if (prevScenarioRef.current === scenarioId) return
    prevScenarioRef.current = scenarioId
    if (scenarioId === 1) {
      setSelNtApr26(String(ntCurFY1)); setSelNtApr27(String(ntNextFY1))
      setSelChApr26(String(chCurFY1)); setSelChApr27(String(chNextFY1))
      setSelIpApr26(String(ipCurFY1 || '')); setSelIpApr27(String(ipNextFY1 || ''))
      setSelLlApr26(String(llBaseSeed || '')); setSelLlApr27(String(llBaseSeed || ''))
    } else {
      setSelNtApr26(String(ntCurFY2)); setSelNtApr27(String(ntNextFY2))
      setSelChApr26(String(chCurFY2)); setSelChApr27(String(chNextFY2))
      setSelIpApr26(String(ipCurFY2 || '')); setSelIpApr27(String(ipNextFY2 || ''))
      setSelLlApr26(String(llBp25Seed || '')); setSelLlApr27(String(llBp25Seed || ''))
    }
  }, [scenarioId, ntCurFY1, ntNextFY1, ntCurFY2, ntNextFY2,
      chCurFY1, chNextFY1, chCurFY2, chNextFY2,
      ipCurFY1, ipNextFY1, ipCurFY2, ipNextFY2,
      llBaseSeed, llBp25Seed])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function setIpFeeField(scenario, field, val) {
    setIpFee((p) => ({ ...p, [scenario]: { ...p[scenario], [field]: val } }))
  }
  function setLandCell(scenario, i, val) {
    setLandLease((p) => ({ ...p, [scenario]: p[scenario].map((x, j) => j === i ? val : x) }))
  }
  function setWOField(key, val) {
    setWriteOff((p) => ({ ...p, [key]: val }))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-5 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm border border-blue-400 bg-[#dbeeff]" />
          Editable input
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm bg-white border border-slate-300" />
          Calculated = prev × (1 + rate)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm border border-orange-300 bg-[#fde8d8]" />
          Selected Case
        </span>
        <div className="ml-auto flex gap-4 text-xs text-slate-500">
          <span>NT Sc1 YoY: <strong className="text-blue-700">{yoy1}%</strong></span>
          <span>NT Sc2 YoY: <strong className="text-blue-700">{yoy2}%</strong></span>
          <span>Churn Sc1 YoY: <strong className="text-blue-700">{chYoy1}%</strong></span>
          <span>Churn Sc2 YoY: <strong className="text-blue-700">{chYoy2}%</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse w-full"
               role="table" aria-label="Tenancies projection table"
               style={{ tableLayout: 'auto' }}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ minWidth: 160 }} />
            <col style={{ width: 36 }} />
            <col style={{ width: 68 }} />
            {yearLabels.map((_, i) => <col key={i} style={{ minWidth: 72 }} />)}
          </colgroup>

          <thead>
            <tr>
              <th className={TH} />
              <th className={TH} />
              <th className={TH} />
              <th className={TH} />
              {yearLabels.map((yr) => <th key={yr} className={TH}>{yr}</th>)}
            </tr>
          </thead>

          <tbody>
            {/* Title row */}
            <tr>
              <td colSpan={4}
                className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-2 border border-[#1e3a5f]">
                Tenancies
              </td>
              {yearLabels.map((_, i) => (
                <td key={i} className="border border-slate-300 bg-white" style={{ minWidth: 72 }} />
              ))}
            </tr>

            <SectionHeaderRow label="Tenancy Analysis" totalCols={totalCols} />

            {/* ── 1. NEW TENANCIES ── */}
            <SubHeaderRow label="New Tenancies" totalCols={totalCols} />

            {/* Selected Case — Apr-26 editable, Apr-27 editable, Apr-28+ calc */}
            {showSelected && (
            <tr>
              <SidebarCells isSelected label="Selected Case" scenarioId={scenarioId}
                onScenarioChange={setScenarioId} unit="# tenancies" bg={SEL_BG} />
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input ref={React.createRef()} type="number" value={selNtApr26}
                  onChange={(e) => setSelNtApr26(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selNtApr27}
                  onChange={(e) => setSelNtApr27(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              {selNtSeries.slice(2).map((val, i) => (
                <CalcCell key={i} value={val} bg={SEL_BG} />
              ))}
            </tr>
            )}

            {/* Base Case */}
            {showBase && (
            <tr>
              <SidebarCells isSelected={false} label="Base Case" yoyPct={yoy1} unit="#" bg={W_BG} />
              <EmptyCell bg={W_BG} />
              <BlueDisplay value={tenancySeries.base[0]} bg={W_BG} />
              {tenancySeries.base.slice(1).map((val, i) => (
                <CalcCell key={i} value={val} bg={W_BG} />
              ))}
            </tr>
            )}

            {/* BP 25 Updated */}
            {showBP25 && (
            <tr>
              <SidebarCells isSelected={false} label="BP 25 Updated" yoyPct={yoy2} unit="#" bg={W_BG} />
              <EmptyCell bg={W_BG} />
              <BlueDisplay value={tenancySeries.bp25[0]} bg={W_BG} />
              {tenancySeries.bp25.slice(1).map((val, i) => (
                <CalcCell key={i} value={val} bg={W_BG} />
              ))}
            </tr>
            )}

            <SpacerRow totalCols={totalCols} />

            {/* ── 2. CHURN (%) ── */}
            <SubHeaderRow label="Churn (%)" totalCols={totalCols} />

            {/* Selected Case — Apr-26 editable, Apr-27 editable, Apr-28+ calc */}
            {showSelected && (
            <tr>
              <SidebarCells isSelected label="Selected Case" scenarioId={scenarioId}
                onScenarioChange={setScenarioId} unit="%" bg={SEL_BG} />
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selChApr26}
                  onChange={(e) => setSelChApr26(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selChApr27}
                  onChange={(e) => setSelChApr27(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              {selChSeries.slice(2).map((val, i) => (
                <CalcCell key={i} value={val} pct bg={SEL_BG} />
              ))}
            </tr>
            )}

            {/* Base Case */}
            {showBase && (
            <tr>
              <SidebarCells isSelected={false} label="Base Case" yoyPct={chYoy1} unit="%" bg={W_BG} />
              <EmptyCell bg={W_BG} />
              <BlueDisplay value={churnSeries.base[0]} pct bg={W_BG} />
              {churnSeries.base.slice(1).map((val, i) => (
                <CalcCell key={i} value={val} pct bg={W_BG} />
              ))}
            </tr>
            )}

            {/* BP 25 Updated */}
            {showBP25 && (
            <tr>
              <SidebarCells isSelected={false} label="BP 25 Updated" yoyPct={chYoy2} unit="%" bg={W_BG} />
              <EmptyCell bg={W_BG} />
              <BlueDisplay value={churnSeries.bp25[0]} pct bg={W_BG} />
              {churnSeries.bp25.slice(1).map((val, i) => (
                <CalcCell key={i} value={val} pct bg={W_BG} />
              ))}
            </tr>
            )}

            <SpacerRow totalCols={totalCols} />

            {/* ══════════════════════════════════════════════════════════
                3. IP FEE ESCALATION (%)
                Selected Case: Apr-26 editable, Apr-27 editable, Apr-28+ = nextFY repeated
                Base Case + Case 2: curFY editable, nextFY editable, remaining = nextFY
                ══════════════════════════════════════════════════════════ */}
            <SubHeaderRow label="IP Fee Escalation (%)" totalCols={totalCols} />

            {/* Selected Case */}
            {showSelected && (
            <tr>
              <SidebarCells isSelected label="Selected Case" scenarioId={scenarioId}
                onScenarioChange={setScenarioId} unit="%" bg={SEL_BG} />
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selIpApr26}
                  onChange={(e) => setSelIpApr26(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selIpApr27}
                  onChange={(e) => setSelIpApr27(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              {selIpSeries.slice(2).map((val, i) => (
                <td key={i}
                  className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${SEL_BG}`}
                  style={{ minWidth: 72 }}>
                  {val}
                </td>
              ))}
            </tr>
            )}

            {/* Base Case */}
            {showBase && (() => {
              const curFY  = ipFee.base.curFY
              const nextFY = ipFee.base.nextFY
              const remainingCount = Math.max(0, count - 2)
              return (
                <tr>
                  <SidebarCells isSelected={false} label="Base Case" unit="%" bg={W_BG} />
                  <td className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input type="number" value={curFY}
                      onChange={(e) => setIpFeeField('base', 'curFY', e.target.value)}
                      placeholder="Cur FY"
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500" />
                  </td>
                  <td className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input type="number" value={nextFY}
                      onChange={(e) => setIpFeeField('base', 'nextFY', e.target.value)}
                      placeholder="Next FY"
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500" />
                  </td>
                  {Array.from({ length: remainingCount }).map((_, i) => (
                    <td key={i}
                      className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${W_BG}`}
                      style={{ minWidth: 72 }}>
                      {nextFY !== '' ? nextFY : ''}
                    </td>
                  ))}
                </tr>
              )
            })()}

            {/* Case 2 */}
            {showBP25 && (() => {
              const curFY  = ipFee.case2.curFY
              const nextFY = ipFee.case2.nextFY
              const remainingCount = Math.max(0, count - 2)
              return (
                <tr>
                  <SidebarCells isSelected={false} label="Case 2" unit="%" bg={W_BG} />
                  <td className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input type="number" value={curFY}
                      onChange={(e) => setIpFeeField('case2', 'curFY', e.target.value)}
                      placeholder="Cur FY"
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500" />
                  </td>
                  <td className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input type="number" value={nextFY}
                      onChange={(e) => setIpFeeField('case2', 'nextFY', e.target.value)}
                      placeholder="Next FY"
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500" />
                  </td>
                  {Array.from({ length: remainingCount }).map((_, i) => (
                    <td key={i}
                      className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${W_BG}`}
                      style={{ minWidth: 72 }}>
                      {nextFY !== '' ? nextFY : ''}
                    </td>
                  ))}
                </tr>
              )
            })()}

            <SpacerRow totalCols={totalCols} />

            {/* ══════════════════════════════════════════════════════════
                4. LAND LEASE RECOVERY PROFILE (%)
                Selected Case: Apr-26 editable, Apr-27 editable, Apr-28+ = nextFY repeated
                Base Case + BP 25: all `count` columns manually editable
                ══════════════════════════════════════════════════════════ */}
            <SubHeaderRow label="Land Lease Recovery Profile (%)" totalCols={totalCols} />

            {/* Selected Case */}
            {showSelected && (
            <tr>
              <SidebarCells isSelected label="Selected Case" scenarioId={scenarioId}
                onScenarioChange={setScenarioId} unit="%" bg={SEL_BG} />
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selLlApr26}
                  onChange={(e) => setSelLlApr26(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              <td className={`${TD} p-0 ${SEL_BG}`} style={{ minWidth: 72 }}>
                <input type="number" value={selLlApr27}
                  onChange={(e) => setSelLlApr27(e.target.value)}
                  className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                             text-blue-700 border-0 outline-none bg-[#dbeeff]
                             focus:ring-2 focus:ring-inset focus:ring-blue-500" />
              </td>
              {selLlSeries.slice(2).map((val, i) => (
                <td key={i}
                  className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${SEL_BG}`}
                  style={{ minWidth: 72 }}>
                  {val}
                </td>
              ))}
            </tr>
            )}

            {/* Base Case + BP 25 — all years manually editable */}
            {[
              { key: 'base', label: 'Base Case', show: showBase },
              { key: 'bp25', label: 'BP 25',     show: showBP25 },
            ].filter(r => r.show).map((row) => (
              <tr key={row.key}>
                <SidebarCells isSelected={false} label={row.label} unit="%" bg={W_BG} />
                {Array.from({ length: count }).map((_, i) => (
                  <td key={i} className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input
                      type="number"
                      value={landLease[row.key][i] ?? ''}
                      onChange={(e) => setLandCell(row.key, i, e.target.value)}
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>
                ))}
              </tr>
            ))}

            <SpacerRow totalCols={totalCols} />

            {/* ══════════════════════════════════════════════════════════
                5. WRITE-OFF OF RECEIVABLES — IP FEE (%)
                3 rows: IP Fees, Energy Rev, Others
                Single input → auto-fills all year columns with same value
                ══════════════════════════════════════════════════════════ */}
            <SubHeaderRow label="Write-Off of Receivables — IP Fee (%)" totalCols={totalCols} />

            {[
              { key: 'ipFees',    label: 'IP Fees'     },
              { key: 'energyRev', label: 'Energy Rev'  },
              { key: 'others',    label: 'Others'      },
            ].map((row) => {
              const val = writeOff[row.key]
              return (
                <tr key={row.key}>
                  <td className={`${TD} ${W_BG} px-2 py-[5px] text-xs text-slate-500 text-center`} style={{ width: 44 }} />
                  <td className={`${TD} ${W_BG} px-2 py-[5px] text-xs font-semibold text-slate-700`} style={{ minWidth: 160 }}>
                    {row.label}
                  </td>
                  <td className={`${TD} ${W_BG}`} style={{ width: 36 }} />
                  <td className={`${TD} ${W_BG} px-2 py-[5px] text-xs text-slate-400 italic text-center`} style={{ width: 64 }}>%</td>

                  {/* First column — single editable input */}
                  <td className={`${TD} p-0 ${W_BG}`} style={{ minWidth: 72 }}>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => setWOField(row.key, e.target.value)}
                      placeholder="Enter %"
                      className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                                 text-blue-700 border-0 outline-none bg-[#dbeeff]
                                 focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  {/* Remaining columns — auto-fill with same value (black italic) */}
                  {Array.from({ length: count - 1 }).map((_, i) => (
                    <td key={i}
                      className={`${TD} px-2 py-[5px] text-center text-xs italic tabular-nums text-slate-800 ${W_BG}`}
                      style={{ minWidth: 72 }}>
                      {val !== '' ? val : ''}
                    </td>
                  ))}
                </tr>
              )
            })}

          </tbody>
        </table>
      </div>
    </div>
  )
}
