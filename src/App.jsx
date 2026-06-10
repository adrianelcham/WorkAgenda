import { useEffect, useMemo, useState } from 'react'
import { makeSeedData } from './seedData'
import { loadData, saveData } from './storage'
import { uid } from './utils'
import ControlBar from './components/ControlBar'
import MatterRow from './components/MatterRow'
import Editable from './components/Editable'
import { IconTrash, IconPlus } from './components/icons'

export default function App() {
  // ---- Single source of truth for the whole page -------------------------
  // data = { meta, sections, matters }  (see seedData.js for the shape).
  // On first load we read from localStorage, falling back to the PDF data,
  // then normalise it for the current workflow (see normalize() below).
  const [data, setData] = useState(() => normalize(loadData() || makeSeedData()))

  // Auto-save: whenever `data` changes, write it back to localStorage.
  useEffect(() => { saveData(data) }, [data])

  // ---- Control-bar UI state (not persisted) -------------------------------
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // ---- Generic helpers ----------------------------------------------------
  // Keep each item's `order` field in sync with its array position.
  const reindex = (arr) => arr.map((item, i) => ({ ...item, order: i }))

  // Update one matter (by id) using an updater function.
  const updateMatter = (id, updater) =>
    setData((d) => ({ ...d, matters: d.matters.map((m) => (m.id === id ? updater(m) : m)) }))

  // Update the page meta (title / month / names).
  const setMeta = (patch) => setData((d) => ({ ...d, meta: { ...d.meta, ...patch } }))

  // ---- All the editing actions, passed down to the rows -------------------
  const actions = {
    // Matter fields (number, name, type, priority, status, court date, notes).
    updateMatterField: (id, field, value) =>
      updateMatter(id, (m) => ({ ...m, [field]: value })),

    // Tasks live in m.previousActions or m.nextSteps (listKey picks which).
    addTask: (id, listKey) =>
      updateMatter(id, (m) => ({ ...m, [listKey]: [...m[listKey], { id: uid('t'), text: '', done: false }] })),

    updateTask: (id, listKey, taskId, patch) =>
      updateMatter(id, (m) => ({
        ...m,
        [listKey]: m[listKey].map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      })),

    // Ticking a Next Step instantly moves it to Previous Action (history).
    // No confirmation; the item keeps its id/text and is marked done.
    completeNextStep: (id, taskId) =>
      updateMatter(id, (m) => {
        const task = m.nextSteps.find((t) => t.id === taskId)
        if (!task) return m
        return {
          ...m,
          nextSteps: m.nextSteps.filter((t) => t.id !== taskId),
          previousActions: [...m.previousActions, { ...task, done: true }],
        }
      }),

    deleteTask: (id, listKey, taskId) =>
      updateMatter(id, (m) => ({ ...m, [listKey]: m[listKey].filter((t) => t.id !== taskId) })),

    // ---- Matter row functions --------------------------------------------
    addMatter: (sectionId) =>
      setData((d) => ({ ...d, matters: reindex([...d.matters, blankMatter(sectionId)]) })),

    deleteMatter: (id) => {
      if (!confirm('Delete this matter?')) return
      setData((d) => ({ ...d, matters: reindex(d.matters.filter((m) => m.id !== id)) }))
    },

    duplicateMatter: (id) =>
      setData((d) => {
        const idx = d.matters.findIndex((m) => m.id === id)
        if (idx < 0) return d
        const src = d.matters[idx]
        const copy = {
          ...src,
          id: uid('m'),
          matterName: src.matterName ? src.matterName + ' (copy)' : '',
          // Give the copied tasks fresh ids so they edit independently.
          previousActions: src.previousActions.map((t) => ({ ...t, id: uid('t') })),
          nextSteps: src.nextSteps.map((t) => ({ ...t, id: uid('t') })),
        }
        const matters = [...d.matters]
        matters.splice(idx + 1, 0, copy)
        return { ...d, matters: reindex(matters) }
      }),

    // Move a matter up/down among the matters that share its section.
    moveMatter: (id, dir) =>
      setData((d) => {
        const matters = [...d.matters]
        const idx = matters.findIndex((m) => m.id === id)
        if (idx < 0) return d
        const sec = matters[idx].sectionId
        let swap = -1
        if (dir < 0) {
          for (let i = idx - 1; i >= 0; i--) if (matters[i].sectionId === sec) { swap = i; break }
        } else {
          for (let i = idx + 1; i < matters.length; i++) if (matters[i].sectionId === sec) { swap = i; break }
        }
        if (swap < 0) return d
        ;[matters[idx], matters[swap]] = [matters[swap], matters[idx]]
        return { ...d, matters: reindex(matters) }
      }),

    moveMatterToSection: (id, sectionId) =>
      updateMatter(id, (m) => ({ ...m, sectionId })),

    // ---- Section functions -----------------------------------------------
    addSection: () =>
      setData((d) => ({
        ...d,
        sections: reindex([...d.sections, { id: uid('s'), title: 'NEW SECTION', order: d.sections.length }]),
      })),

    renameSection: (id, title) =>
      setData((d) => ({ ...d, sections: d.sections.map((s) => (s.id === id ? { ...s, title } : s)) })),

    deleteSection: (id) =>
      setData((d) => {
        if (d.matters.some((m) => m.sectionId === id)) {
          alert('Move or delete the matters in this section first — a section can only be deleted when empty.')
          return d
        }
        if (!confirm('Delete this empty section?')) return d
        return { ...d, sections: reindex(d.sections.filter((s) => s.id !== id)) }
      }),
  }

  // ---- Reset everything back to the original PDF data ---------------------
  const resetDemoData = () => {
    if (!confirm('Reset everything back to the original agenda data? This wipes your changes.')) return
    setData(makeSeedData())
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

// Normalise data for the current workflow (runs once on load, idempotent):
// Next Steps is now a live checklist and Previous Action is a done/history list.
// So any *completed* Next Step from older saved data is moved into Previous
// Action. Open Next Steps stay put. Safe for the seed data (nothing is done).
function normalize(data) {
  if (!data || !Array.isArray(data.matters)) return data
  return {
    ...data,
    matters: data.matters.map((m) => {
      const steps = m.nextSteps || []
      const done = steps.filter((t) => t.done)
      const open = steps.filter((t) => !t.done)
      return {
        ...m,
        previousActions: [
          ...(m.previousActions || []),
          ...done.map((t) => ({ ...t, done: true })),
        ],
        nextSteps: open.map((t) => ({ ...t, done: false })),
      }
    }),
  }
}

// Factory for a new, empty matter (used by the Add Matter buttons).
function blankMatter(sectionId) {
  return {
    id: uid('m'),
    sectionId,
    matterNumber: '',
    matterName: '',
    matterType: '',
    priority: 'Medium',
    status: 'Not Started',
    previousActions: [],
    nextSteps: [],
    nextCourtDate: '',
    notes: '',
    order: 0,
  }
}
