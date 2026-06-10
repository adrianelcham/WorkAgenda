import { uid } from '../utils'

// ---------------------------------------------------------------------------
// Agenda data model: factories + safe normalisation.
//
// This is the single place that knows the shape of a matter / task / section.
// Several "future-ready" fields are added quietly here (not yet shown in the
// UI) so the next stage can populate them without another data migration.
// ---------------------------------------------------------------------------

// ISO timestamp helper (browser only). Used for the lastUpdatedAt fields.
export const now = () => new Date().toISOString()

// A new, empty task. `done` only matters in Next Steps (ticking moves it).
export function newTask(text = '') {
  return {
    id: uid('t'),
    text,
    done: false,
    // future-ready (unused by the UI for now):
    dueDate: null,
    sourceDocument: null,
    aiImported: false,
    lastUpdatedAt: now(),
  }
}

// A new, empty matter dropped into a section.
export function newMatter(sectionId) {
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
    // future-ready:
    aliases: [],
    sourceDocuments: [],
    importHistory: [],
    lastUpdatedAt: now(),
  }
}

export function newSection(title = 'NEW SECTION', order = 0) {
  return { id: uid('s'), title, order }
}

// ---- Safe normalisation --------------------------------------------------
// Make any (older) saved data match the current shape. Idempotent.

function ensureTask(t) {
  return {
    done: false,
    dueDate: null,
    sourceDocument: null,
    aiImported: false,
    lastUpdatedAt: null, // don't fabricate timestamps for pre-existing data
    ...t,
    id: t.id || uid('t'),
    text: t.text ?? '',
  }
}

function ensureMatter(m) {
  const base = {
    matterNumber: '',
    matterName: '',
    matterType: '',
    priority: 'Medium',
    status: 'Not Started',
    nextCourtDate: '',
    notes: '',
    order: 0,
    aliases: [],
    sourceDocuments: [],
    importHistory: [],
    lastUpdatedAt: null,
    ...m,
    id: m.id || uid('m'),
  }

  const prev = (m.previousActions || []).map(ensureTask)
  const steps = (m.nextSteps || []).map(ensureTask)

  // Workflow rule: completed Next Steps belong in Previous Action (history).
  const done = steps.filter((t) => t.done)
  const open = steps.filter((t) => !t.done)

  return {
    ...base,
    previousActions: [...prev, ...done.map((t) => ({ ...t, done: true }))],
    nextSteps: open.map((t) => ({ ...t, done: false })),
  }
}

// Normalise a whole data object ({ meta, sections, matters }).
export function normalizeData(data) {
  if (!data || !Array.isArray(data.matters)) return data
  return {
    meta: data.meta || { title: 'WORK AGENDA', month: '', names: [] },
    sections: Array.isArray(data.sections) ? data.sections : [],
    matters: data.matters.map(ensureMatter),
  }
}
