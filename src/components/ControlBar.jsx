import { PRIORITIES, STATUSES } from '../constants'

// Top control bar: search, priority/status filters, and page-level actions.
// The whole bar is hidden when printing (no-print).
export default function ControlBar({
  search, setSearch,
  filterPriority, setFilterPriority,
  filterStatus, setFilterStatus,
  onAddMatter, onAddSection, onReset, onPrint,
}) {
  return (
    <div className="no-print sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
      <div className="max-w-[1200px] mx-auto px-4 py-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search matters & tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-400 rounded px-2 py-1 text-sm flex-1 min-w-[180px] bg-white"
        />

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-gray-400 rounded px-2 py-1 text-sm bg-white"
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-400 rounded px-2 py-1 text-sm bg-white"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <button onClick={onAddMatter} className="btn">+ Add Matter</button>
        <button onClick={onAddSection} className="btn">+ Add Section</button>
        <button onClick={onReset} className="btn">Reset Demo Data</button>
        <button onClick={onPrint} className="btn btn-primary">Print / Export PDF</button>
      </div>
    </div>
  )
}
