import Editable from './Editable'

// A checkable bullet list, used for both "Previous Action" and "Next Steps".
// Each task row = checkbox (done) + editable text + delete (×).
// An "+ Add task" button sits underneath.
//
//   listKey is either 'previousActions' or 'nextSteps' (which list to mutate).
export default function TaskList({ matterId, listKey, tasks, actions }) {
  return (
    <div className="space-y-1">
      {tasks.map((t) => (
        <div key={t.id} className="flex items-start gap-1.5 group">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() => actions.toggleTask(matterId, listKey, t.id)}
            className="mt-1 shrink-0"
          />
          <Editable
            multiline
            value={t.text}
            onChange={(v) => actions.updateTask(matterId, listKey, t.id, { text: v })}
            placeholder="Task…"
            className={t.done ? 'line-through text-gray-400' : ''}
          />
          <button
            className="no-print opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 px-1 shrink-0"
            title="Delete task"
            onClick={() => actions.deleteTask(matterId, listKey, t.id)}
          >
            ×
          </button>
        </div>
      ))}

      <button
        className="no-print text-xs text-blue-600 hover:underline ml-5"
        onClick={() => actions.addTask(matterId, listKey)}
      >
        + Add task
      </button>
    </div>
  )
}
