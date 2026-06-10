import Editable from './Editable'
import { IconPlus, IconClose } from './icons'

// A checkable bullet list, used for both "Previous Action" and "Next Steps".
// Each task row = checkbox (done) + editable text + delete.
// A quiet "Add task" button sits underneath.
//
//   listKey    is either 'previousActions' or 'nextSteps' (which list to mutate).
//   emptyLabel subtle placeholder shown when there are no tasks (screen only).
export default function TaskList({ matterId, listKey, tasks, actions, emptyLabel }) {
  return (
    <div className="space-y-1.5">
      {tasks.length === 0 && (
        <p className="no-print text-[13px] italic text-slate-400 leading-snug">{emptyLabel}</p>
      )}

      {tasks.map((t) => (
        <div key={t.id} className="flex items-start gap-2 group">
          <input
            type="checkbox"
            checked={t.done}
            onChange={() => actions.toggleTask(matterId, listKey, t.id)}
            className="mt-[3px] h-4 w-4 shrink-0 rounded-sm cursor-pointer"
          />
          <Editable
            multiline
            value={t.text}
            onChange={(v) => actions.updateTask(matterId, listKey, t.id, { text: v })}
            placeholder="Task…"
            className={t.done ? 'line-through text-slate-400' : 'text-slate-700'}
          />
          <button
            className="icon-btn danger no-print h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            title="Delete task"
            onClick={() => actions.deleteTask(matterId, listKey, t.id)}
          >
            <IconClose size={13} />
          </button>
        </div>
      ))}

      <button
        className="btn-ghost no-print ml-6"
        onClick={() => actions.addTask(matterId, listKey)}
      >
        <IconPlus size={13} />
        Add task
      </button>
    </div>
  )
}
