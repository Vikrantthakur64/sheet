import React, { useRef } from 'react'
import { SCENARIOS } from '../data/scenarios'

/**
 * Projection table.
 *
 * Apr-26 column:
 *   Selected Case  → blue EDITABLE input  (currentFinancialYear from selected scenario)
 *   Base Case      → blue READ-ONLY display (currentFinancialYear from scenario 1)
 *   Updated BP 25  → blue READ-ONLY display (currentFinancialYear from scenario 2)
 *
 * Apr-27 column:
 *   Selected Case  → blue EDITABLE input  (nextFinancialYear from selected scenario)
 *   Base Case      → blue READ-ONLY display (nextFinancialYear from scenario 1)
 *   Updated BP 25  → blue READ-ONLY display (nextFinancialYear from scenario 2)
 *
 * Apr-28+ → black italic calculated for ALL rows: prev × (1 + YoY%)
 */
export default function DataTable({
  yearLabels,
  scenarioId,
  onScenarioChange,
  growthPct,
  cells,
  onCellChange,
  allSeries,
  scenarioRows = [],
  dismantleRows = [],
  selectedCase,   // 'base' | 'bp25' | undefined (show all when undefined)
}) {
  const count     = yearLabels.length
  const totalCols = 4 + count

  // ── Blue EDITABLE input (Selected Case only) ──────────────────────────────
  function BlueInput({ cellKey, bg = '' }) {
    const ref = useRef(null)
    return (
      <td className={`border border-slate-300 p-0 ${bg}`} style={{ minWidth: 72 }}>
        <input
          ref={ref}
          type="number"
          value={cells[cellKey] ?? ''}
          onChange={(e) => onCellChange(cellKey, e.target.value)}
          onFocus={() => setTimeout(() => ref.current?.select(), 0)}
          className="w-full px-2 py-[5px] text-center text-xs font-bold tabular-nums
                     text-blue-700 border-0 outline-none bg-[#dbeeff]
                     focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-label={cellKey}
        />
      </td>
    )
  }

  // ── Blue READ-ONLY display (Base Case / BP25) ─────────────────────────────
  function BlueDisplay({ value, bg = '' }) {
    return (
      <td className={`border border-slate-300 px-2 py-[5px] text-center text-xs
                      font-bold tabular-nums text-blue-700 ${bg}`}
          style={{ minWidth: 72 }}>
        {value !== undefined && value !== '' ? Math.round(Number(value)).toLocaleString() : ''}
      </td>
    )
  }

  // ── Black italic calculated cell ──────────────────────────────────────────
  function CalcCell({ value, bg = '' }) {
    return (
      <td className={`border border-slate-300 px-2 py-[5px] text-center text-xs
                      italic tabular-nums text-slate-800 ${bg}`}
          style={{ minWidth: 72 }}>
        {Math.round(value).toLocaleString()}
      </td>
    )
  }

  // ── Empty cell ────────────────────────────────────────────────────────────
  function EmptyCell({ bg = '' }) {
    return <td className={`border border-slate-300 ${bg}`} style={{ minWidth: 72 }} />
  }

  // ── Layout rows ───────────────────────────────────────────────────────────
  function TitleRow() {
    return (
      <tr>
        <td colSpan={4}
          className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-2 border border-[#1e3a5f]">
          Tower Adds
        </td>
        {yearLabels.map((_, i) => (
          <td key={i} className="border border-slate-300 bg-white" style={{ minWidth: 72 }} />
        ))}
      </tr>
    )
  }

  function SectionHeader({ label }) {
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

  function SubHeader({ label }) {
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

  // ── Single data row ───────────────────────────────────────────────────────
  /**
   * isSelected   — true = Selected Case (salmon bg, editable Apr-26/27, dropdown)
   * apr26Edit    — cell key for editable Apr-26 (Selected Case only)
   * apr27Edit    — cell key for editable Apr-27 (Selected Case only)
   * apr26Display — static value to show for Base/BP25 Apr-26
   * apr27Display — static value to show for Base/BP25 Apr-27
   * seriesArr    — full series [v26, v27, calc28, calc29, …]
   */
  function DataRow({
    isSelected,
    label,
    yoyPct,
    apr26Edit, apr27Edit,
    apr26Display, apr27Display,
    seriesArr,
  }) {
    const bg = isSelected ? 'bg-[#fde8d8]' : 'bg-white'

    return (
      <tr>
        {/* A: YoY% */}
        <td className={`border border-slate-300 ${bg} px-2 py-[5px] text-xs
                        text-slate-500 text-center font-medium`}
            style={{ width: 44 }}>
          {isSelected ? '' : `${yoyPct}%`}
        </td>

        {/* B: Label */}
        <td className={`border border-slate-300 ${bg} px-2 py-[5px] text-xs
                        ${isSelected ? 'font-semibold text-slate-800' : 'text-slate-700'}
                        whitespace-nowrap`}
            style={{ minWidth: 120 }}>
          {label}
        </td>

        {/* C: Scenario dropdown (Selected Case only) */}
        <td className={`border border-slate-300 ${bg} px-1 py-[5px] text-center`}
            style={{ width: 32 }}>
          {isSelected ? (
            <select
              value={scenarioId}
              onChange={(e) => onScenarioChange(Number(e.target.value))}
              className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-400
                         rounded px-0.5 py-0 text-center focus:outline-none focus:ring-1
                         focus:ring-blue-400 cursor-pointer appearance-none"
              aria-label="Select scenario"
              style={{ minWidth: 28 }}
            >
              {Object.entries(SCENARIOS).map(([k]) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          ) : null}
        </td>

        {/* D: Unit */}
        <td className={`border border-slate-300 ${bg} px-2 py-[5px] text-xs
                        text-slate-400 italic text-center`}
            style={{ width: 64 }}>
          {isSelected ? '# towers' : '#'}
        </td>

        {/* Data columns */}
        {yearLabels.map((_, colIdx) => {
          if (colIdx === 0) {
            // Apr-26: editable for Selected Case, read-only display for others
            return isSelected
              ? <BlueInput    key={colIdx} cellKey={apr26Edit}    bg={bg} />
              : <BlueDisplay  key={colIdx} value={apr26Display}   bg={bg} />
          }
          if (colIdx === 1) {
            // Apr-27: editable for Selected Case, read-only display for others
            return isSelected
              ? <BlueInput    key={colIdx} cellKey={apr27Edit}    bg={bg} />
              : <BlueDisplay  key={colIdx} value={apr27Display}   bg={bg} />
          }
          // Apr-28+: calculated for all rows
          const val = seriesArr[colIdx]
          return val !== undefined
            ? <CalcCell  key={colIdx} value={val} bg={bg} />
            : <EmptyCell key={colIdx} bg={bg} />
        })}
      </tr>
    )
  }

  // ── Three-row metric block ────────────────────────────────────────────────
  /**
   * selApr26/27Edit  — cell keys for Selected Case editable inputs
   * baseRows / bp25Rows — the input table rows to read display values from
   * selSeries / baseSeries / bp25Series — computed series arrays
   */
  function MetricBlock({
    selApr26Edit, selApr27Edit, selSeries,
    baseSeries, bp25Series,
    inputRows,   // the scenario input rows for this metric (tower or dismantle)
  }) {
    const selRow  = scenarioRows.find((r) => r.modelScenario === scenarioId)
    const baseRow = inputRows?.find((r) => Number(r.modelScenario) === 1)
    const bp25Row = inputRows?.find((r) => Number(r.modelScenario) === 2)

    const selPct  = selRow  ? parseFloat(selRow.pctIncrease)  || growthPct : growthPct
    const basePct = baseRow ? parseFloat(baseRow.pctIncrease) || growthPct : growthPct
    const bp25Pct = bp25Row ? parseFloat(bp25Row.pctIncrease) || growthPct : growthPct

    // When selectedCase is set, only show the matching row; otherwise show all three
    const showSelected = !selectedCase
    const showBase     = !selectedCase || selectedCase === 'base'
    const showBP25     = !selectedCase || selectedCase === 'bp25'

    return (
      <>
        {/* Selected Case — editable Apr-26 and Apr-27 */}
        {showSelected && (
          <DataRow
            isSelected
            label="Selected Case"
            yoyPct={selPct}
            apr26Edit={selApr26Edit}
            apr27Edit={selApr27Edit}
            seriesArr={selSeries}
          />
        )}

        {/* Base Case — read-only Apr-26 (currentFY) and Apr-27 (nextFY) */}
        {showBase && (
          <DataRow
            isSelected={false}
            label="Base Case"
            yoyPct={basePct}
            apr26Display={baseRow?.currentFinancialYear}
            apr27Display={baseRow?.nextFinancialYear}
            seriesArr={baseSeries}
          />
        )}

        {/* Updated BP 25 — read-only Apr-26 and Apr-27 */}
        {showBP25 && (
          <DataRow
            isSelected={false}
            label="Updated BP 25"
            yoyPct={bp25Pct}
            apr26Display={bp25Row?.currentFinancialYear}
            apr27Display={bp25Row?.nextFinancialYear}
            seriesArr={bp25Series}
          />
        )}
      </>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-5 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm border border-blue-400 bg-[#dbeeff]" />
          Editable (Selected Case only)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm bg-white border border-blue-300" />
          From input table (read-only)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm bg-white border border-slate-300" />
          Calculated = prev × (1 + YoY%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-3 rounded-sm border border-orange-300 bg-[#fde8d8]" />
          Selected Case
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="text-sm border-collapse w-full"
               role="table" aria-label="Tower projection table"
               style={{ tableLayout: 'auto' }}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ minWidth: 130 }} />
            <col style={{ width: 36 }} />
            <col style={{ width: 68 }} />
            {yearLabels.map((_, i) => <col key={i} style={{ minWidth: 72 }} />)}
          </colgroup>

          <thead>
            <tr>
              <th className="bg-[#1e3a5f] border border-[#1e3a5f]" />
              <th className="bg-[#1e3a5f] border border-[#1e3a5f]" />
              <th className="bg-[#1e3a5f] border border-[#1e3a5f]" />
              <th className="bg-[#1e3a5f] border border-[#1e3a5f]" />
              {yearLabels.map((yr) => (
                <th key={yr}
                    className="bg-[#1e3a5f] text-white text-xs font-semibold
                               text-center px-2 py-2 border border-[#1e3a5f] whitespace-nowrap">
                  {yr}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <TitleRow />
            <SectionHeader label="Ground-Based Towers" />

            {/* ── New Tower Adds ── */}
            <SubHeader label="New Tower Adds" />
            <MetricBlock
              selApr26Edit="sel_tower_apr26"
              selApr27Edit="sel_tower_apr27"
              selSeries={allSeries.sel_tower}
              baseSeries={allSeries.base_tower}
              bp25Series={allSeries.bp25_tower}
              inputRows={scenarioRows}
            />

            <tr>
              <td colSpan={totalCols} className="bg-white border-0 border-b border-slate-200"
                  style={{ height: 10 }} />
            </tr>

            {/* ── Dismantle Sites ── */}
            <SubHeader label="Dismantle Sites" />
            <MetricBlock
              selApr26Edit="sel_dm_apr26"
              selApr27Edit="sel_dm_apr27"
              selSeries={allSeries.sel_dm}
              baseSeries={allSeries.base_dm}
              bp25Series={allSeries.bp25_dm}
              inputRows={dismantleRows}
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}
