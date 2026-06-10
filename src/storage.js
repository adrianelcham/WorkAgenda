// Tiny localStorage wrapper.
// Bump the version number in the key if you ever change the data shape and
// want existing browsers to start fresh.
export const STORAGE_KEY = 'work-agenda-v1'

// Returns the saved data object, or null if nothing has been saved yet.
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Persists the whole data object. Called on every change (auto-save).
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Ignore (e.g. storage full, or disabled in private mode).
  }
}
