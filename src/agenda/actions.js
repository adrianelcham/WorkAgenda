import { uid } from '../utils'
import { newMatter, newTask, newSection, now } from './model'

// ---------------------------------------------------------------------------
// Pure agenda actions: each takes the current `data` and returns NEW `data`.
// No React, no side effects (confirm/alert live in the UI). This keeps the
// agenda logic testable and out of App.jsx, ready for the next stage.
// ---------------------------------------------------------------------------

// Keep each item's `order` field in sync with its array position.
const reindex = (arr) => arr.map((item, i) => ({ ...item, order: i }))

// Replace one matter (by id) via an updater function.
const mapMatter = (data, id, fn) => ({
  ...data,
  matters: data.matters.map((m) => (m.id === id ? fn(m) : m)),
})

// ---- Meta ----------------------------------------------------------------
export const setMeta = (data, patch) => ({ ...data, meta: { ...data.meta, ...patch } })

// ---- Matter fields -------------------------------------------------------
export const updateMatterField = (data, id, field, value) =>
  mapMatter(data, id, (m) => ({ ...m, [field]: value, lastUpdatedAt: now() }))

// ---- Tasks (previousActions | nextSteps) ---------------------------------
export const addTask = (data, id, listKey) =>
  mapMatter(data, id, (m) => ({ ...m, [listKey]: [...m[listKey], newTask()], lastUpdatedAt: now() }))

export const updateTask = (data, id, listKey, taskId, patch) =>
  mapMatter(data, id, (m) => ({
    ...m,
    [listKey]: m[listKey].map((t) =>
      t.id === taskId ? { ...t, ...patch, lastUpdatedAt: now() } : t,
    ),
  }))

export const deleteTask = (data, id, listKey, taskId) =>
  mapMatter(data, id, (m) => ({ ...m, [listKey]: m[listKey].filter((t) => t.id !== taskId) }))

// Ticking a Next Step instantly moves it to Previous Action (history).
export const completeNextStep = (data, id, taskId) =>
  mapMatter(data, id, (m) => {
    const task = m.nextSteps.find((t) => t.id === taskId)
    if (!task) return m
    return {
      ...m,
      nextSteps: m.nextSteps.filter((t) => t.id !== taskId),
      previousActions: [...m.previousActions, { ...task, done: true, lastUpdatedAt: now() }],
      lastUpdatedAt: now(),
    }
  })

// ---- Matter row functions ------------------------------------------------
export const addMatter = (data, sectionId) =>
  ({ ...data, matters: reindex([...data.matters, newMatter(sectionId)]) })

export const deleteMatter = (data, id) =>
  ({ ...data, matters: reindex(data.matters.filter((m) => m.id !== id)) })

export const duplicateMatter = (data, id) => {
  const idx = data.matters.findIndex((m) => m.id === id)
  if (idx < 0) return data
  const src = data.matters[idx]
  const copy = {
    ...src,
    id: uid('m'),
    matterName: src.matterName ? src.matterName + ' (copy)' : '',
    // Fresh ids so the copied tasks edit independently.
    previousActions: src.previousActions.map((t) => ({ ...t, id: uid('t') })),
    nextSteps: src.nextSteps.map((t) => ({ ...t, id: uid('t') })),
    lastUpdatedAt: now(),
  }
  const matters = [...data.matters]
  matters.splice(idx + 1, 0, copy)
  return { ...data, matters: reindex(matters) }
}

// Move a matter up/down among the matters that share its section.
export const moveMatter = (data, id, dir) => {
  const matters = [...data.matters]
  const idx = matters.findIndex((m) => m.id === id)
  if (idx < 0) return data
  const sec = matters[idx].sectionId
  let swap = -1
  if (dir < 0) {
    for (let i = idx - 1; i >= 0; i--) if (matters[i].sectionId === sec) { swap = i; break }
  } else {
    for (let i = idx + 1; i < matters.length; i++) if (matters[i].sectionId === sec) { swap = i; break }
  }
  if (swap < 0) return data
  ;[matters[idx], matters[swap]] = [matters[swap], matters[idx]]
  return { ...data, matters: reindex(matters) }
}

export const moveMatterToSection = (data, id, sectionId) =>
  mapMatter(data, id, (m) => ({ ...m, sectionId, lastUpdatedAt: now() }))

// ---- Section functions ---------------------------------------------------
export const addSection = (data) =>
  ({ ...data, sections: reindex([...data.sections, newSection('NEW SECTION', data.sections.length)]) })

export const renameSection = (data, id, title) =>
  ({ ...data, sections: data.sections.map((s) => (s.id === id ? { ...s, title } : s)) })

export const sectionIsEmpty = (data, id) => !data.matters.some((m) => m.sectionId === id)

export const removeSection = (data, id) =>
  ({ ...data, sections: reindex(data.sections.filter((s) => s.id !== id)) })
