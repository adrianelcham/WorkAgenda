// Dropdown options + the small colour dots shown next to them.
// Edit these arrays to change what appears in the priority/status pickers.

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'Waiting']

export const STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting on Client',
  'Waiting on Counsel',
  'Waiting on Other Side',
  'Filed',
  'Completed',
]

export const PRIORITY_COLORS = {
  Critical: '#dc2626', // red
  High: '#ea580c',     // orange
  Medium: '#ca8a04',   // amber
  Low: '#16a34a',      // green
  Waiting: '#6b7280',  // grey
}

export const STATUS_COLORS = {
  'Not Started': '#9ca3af',
  'In Progress': '#2563eb',
  'Waiting on Client': '#d97706',
  'Waiting on Counsel': '#d97706',
  'Waiting on Other Side': '#d97706',
  Filed: '#7c3aed',
  Completed: '#16a34a',
}
