import { PRIORITIES, STATUSES } from '../constants'
import { IconSearch, IconPlus, IconPrinter, IconRefresh } from './icons'

// Top control bar: search, priority/status filters, and page-level actions.
// The whole bar is hidden when printing (no-print).
export default function ControlBar({
  search, setSearch,
  filterPriority, setFilterPriority,
  filterStatus, setFilterStatus,
  onAddMatter, onAddSection, onReset, onPrint,
}) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch size={16} />
          </span>
          <input
            type="text"
            placeholder="Search matters & tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="control w-full !rounded-full"
            style={{ paddingLeft: 38 }}
          />
        </div>

        {/* Filters */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="control"
          title="Filter by priority"
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="control"
          title="Filter by status"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Thin divider keeps filters and actions visually separate */}
        <span className="mx-1 hidden h-6 w-px self-center bg-slate-200 sm:block" aria-hidden />

        {/* Actions */}
        <button onClick={onAddMatter} className="btn"><IconPlus size={15} />Add Matter</button>
        <button onClick={onAddSection} className="btn"><IconPlus size={15} />Add Section</button>
        <button onClick={onReset} className="btn" title="Restore the original agenda data">
          <IconRefresh size={15} />Reset
        </button>
        <button onClick={onPrint} className="btn btn-primary"><IconPrinter size={15} />Print / Export PDF</button>
      </div>
    </div>
  )
}
