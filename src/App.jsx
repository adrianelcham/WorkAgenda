import { useEffect, useMemo, useState } from 'react'
import { makeSeedData } from './seedData'
import { loadData, saveData } from './storage'
import { normalizeData } from './agenda/model'
import * as agenda from './agenda/actions'
import ControlBar from './components/ControlBar'
import MatterRow from './components/MatterRow'
import Editable from './components/Editable'
import AgendaAssistant from './components/AgendaAssistant'
import { IconTrash, IconPlus } from './components/icons'

export default function App() {
  // ---- Single source of truth for the whole page -------------------------
  // data = { meta, sections, matters }. On first load we read from localStorage
  // (falling back to the seed), then normalise it (see agenda/model.js).
  // All the actual agenda logic lives in agenda/actions.js — the handlers below
  // are thin wrappers that feed the current data through those pure functions.
  const [data, setData] = useState(() => normalizeData(loadData() || makeSeedData()))

  // Auto-save: whenever `data` changes, write it back to localStorage.
  useEffect(() => { saveData(data) }, [data])

  // ---- Control-bar UI state (not persisted) -------------------------------
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Update the page meta (title / month / names).
  const setMeta = (patch) => setData((d) => agenda.setMeta(d, patch))

  // ---- Editing actions passed down to the rows ----------------------------
  // Side effects that belong to the UI (confirm/alert) stay here; the data
  // transformation is delegated to the pure functions in agenda/actions.js.
  const actions = {
    updateMatterField: (id, field, value) => setData((d) => agenda.updateMatterField(d, id, field, value)),

    addTask: (id, listKey) => setData((d) => agenda.addTask(d, id, listKey)),
    updateTask: (id, listKey, taskId, patch) => setData((d) => agenda.updateTask(d, id, listKey, taskId, patch)),
    deleteTask: (id, listKey, taskId) => setData((d) => agenda.deleteTask(d, id, listKey, taskId)),

    // Ticking a Next Step instantly moves it to Previous Action (no confirm).
    completeNextStep: (id, taskId) => setData((d) => agenda.completeNextStep(d, id, taskId)),

    addMatter: (sectionId) => setData((d) => agenda.addMatter(d, sectionId)),

    deleteMatter: (id) => {
      if (!confirm('Delete this matter?')) return
      setData((d) => agenda.deleteMatter(d, id))
    },

    duplicateMatter: (id) => setData((d) => agenda.duplicateMatter(d, id)),
    moveMatter: (id, dir) => setData((d) => agenda.moveMatter(d, id, dir)),
    moveMatterToSection: (id, sectionId) => setData((d) => agenda.moveMatterToSection(d, id, sectionId)),

    addSection: () => setData((d) => agenda.addSection(d)),
    renameSection: (id, title) => setData((d) => agenda.renameSection(d, id, title)),

    deleteSection: (id) =>
      setData((d) => {
        if (!agenda.sectionIsEmpty(d, id)) {
          alert('Move or delete the matters in this section first — a section can only be deleted when empty.')
          return d
        }
        if (!confirm('Delete this empty section?')) return d
        return agenda.removeSection(d, id)
      }),
  }

  // ---- Reset everything back to the original agenda data ------------------
  const resetDemoData = () => {
    if (!confirm('Reset everything back to the original agenda data? This wipes your changes.')) return
    setData(normalizeData(makeSeedData()))
    setSearch(''); setFilterPriority('all'); setFilterStatus('all')
  }

  // ---- Search + filter ----------------------------------------------------
  const q = search.trim().toLowerCase()
  const isFiltering = q !== '' || filterPriority !== 'all' || filterStatus !== 'all'

  const matterMatches = (m) => {
    if (filterPriority !== 'all' && m.priority !== filterPriority) return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    if (q) {
      const haystack = [
        m.matterNumber, m.matterName, m.matterType, m.nextCourtDate, m.notes,
        ...m.previousActions.map((t) => t.text),
        ...m.nextSteps.map((t) => t.text),
      ].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  }

  // Sections in display order.
  const sectionsOrdered = useMemo(
    () => [...data.sections].sort((a, b) => a.order - b.order),
    [data.sections],
  )

  // Control-bar "Add Matter" drops a blank matter into the first section.
  const handleAddMatter = () => {
    if (!sectionsOrdered[0]) { alert('Add a section first.'); return }
    actions.addMatter(sectionsOrdered[0].id)
  }

  return (
    <div className="min-h-screen">
      <ControlBar
        search={search} setSearch={setSearch}
        filterPriority={filterPriority} setFilterPriority={setFilterPriority}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        onAddMatter={handleAddMatter}
        onAddSection={actions.addSection}
        onReset={resetDemoData}
        onPrint={() => window.print()}
      />

      <div className="max-w-[1280px] mx-auto px-4 py-5">
        {/* Document header — mirrors the top of the PDF, cleaned up */}
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-baseline gap-3">
            <Editable
              value={data.meta.title}
              onChange={(v) => setMeta({ title: v })}
              autoWidth
              className="text-2xl font-bold tracking-tight text-slate-900"
            />
            <Editable
              value={data.meta.month}
              onChange={(v) => setMeta({ month: v })}
              autoWidth
              className="text-base font-medium text-slate-500"
            />
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-right text-sm font-semibold text-slate-700">
              {data.meta.names.map((n, i) => (
                <Editable
                  key={i}
                  value={n}
                  onChange={(v) => setMeta({ names: data.meta.names.map((x, j) => (j === i ? v : x)) })}
                  className="text-right"
                />
              ))}
            </div>
            {/* Subtle auto-save indicator */}
            <div
              className="no-print flex items-center gap-1.5 text-xs text-slate-400"
              title="Changes save automatically to this browser. Use Reset to restore the original agenda."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Saved locally
            </div>
          </div>
        </header>

        {/* The agenda table sits in a soft white "document" card. The inner
            wrapper lets the table scroll horizontally on narrow screens
            (laptop-first; mobile just needs to be usable) while the header and
            control bar stay put. min-width keeps columns legible. */}
        <div className="agenda-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="agenda-scroll overflow-x-auto">
        <table className="agenda-table w-full min-w-[820px] border-collapse text-sm">
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50">
              {['Matter', 'Previous Action', 'Next Steps', 'Next Court Date'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sectionsOrdered.map((section) => {
              const matters = data.matters.filter(
                (m) => m.sectionId === section.id && matterMatches(m),
              )
              // While filtering, hide sections that have no matching matters.
              if (isFiltering && matters.length === 0) return null
              return (
                <SectionGroup
                  key={section.id}
                  section={section}
                  matters={matters}
                  sections={sectionsOrdered}
                  actions={actions}
                />
              )
            })}
          </tbody>
        </table>
        </div>
        </div>
      </div>

      {/* Floating local chat assistant. Reads the agenda for Q&A; only edits it
          when the user confirms a PDF-extraction proposal (Apply). */}
      <AgendaAssistant
        data={data}
        onApplyExtraction={(matterId, proposal) => setData((d) => agenda.applyExtraction(d, matterId, proposal))}
      />
    </div>
  )
}

// A section heading row, its matter rows, and an "+ Add matter" row.
function SectionGroup({ section, matters, sections, actions }) {
  return (
    <>
      {/* Section heading row — a clean left-aligned label band */}
      <tr className="section-row">
        <td colSpan={4} className="bg-slate-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-slate-300" aria-hidden />
            <Editable
              value={section.title}
              onChange={(v) => actions.renameSection(section.id, v)}
              autoWidth
              className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600"
            />
            <button
              className="icon-btn danger no-print h-5 w-5"
              title="Delete section (must be empty)"
              onClick={() => actions.deleteSection(section.id)}
            >
              <IconTrash size={13} />
            </button>
          </div>
        </td>
      </tr>

      {matters.map((m) => (
        <MatterRow key={m.id} matter={m} sections={sections} actions={actions} />
      ))}

      {/* Add a matter directly to this section */}
      <tr className="no-print">
        <td colSpan={4} className="px-2 py-1">
          <button className="btn-ghost" onClick={() => actions.addMatter(section.id)}>
            <IconPlus size={14} />
            Add matter to {section.title || 'this section'}
          </button>
        </td>
      </tr>
    </>
  )
}
