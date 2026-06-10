import Editable from './Editable'
import { IconPlus, IconClose, IconCheck } from './icons'

// One list, two variants:
//   variant="steps"   (Next Steps)      -> a checkbox; ticking instantly MOVES
//                                           the item to Previous Action.
//   variant="history" (Previous Action) -> no checkbox; a done/history bullet.
//
// Both variants keep: editable text, delete, and an add button.
export default function TaskList({ matterId, listKey, tasks, actions, emptyLabel, variant }) {
  const isSteps = variant === 'steps'

  return (
    <div className="space-y-2">
      {tasks.length === 0 && (
        <p className="no-print text-[13px] italic text-slate-400 leading-snug">{emptyLabel}</p>
      )}

      {tasks.map((t) => (
        <div key={t.id} className="flex items-start gap-2 group">
          {isSteps ? (
            <input
              type="checkbox"
              checked={false}
              onChange={() => actions.completeNextStep(matterId, t.id)}
              title="Mark done — moves to Previous Action"
              className="mt-[3px] h-[15px] w-[15px] shrink-0 cursor-pointer rounded"
            />
          ) : (
            <>
              {/* completed marker on screen … */}
              <span className="no-print mt-[2px] shrink-0 text-emerald-500" aria-hidden>
                <IconCheck size={14} />
              </span>
              {/* … and a plain bullet when printed */}
              <span className="print-only mt-[1px] shrink-0 text-slate-500" aria-hidden>•</span>
            </>
          )}

          <Editable
            multiline
            value={t.text}
            onChange={(v) => actions.updateTask(matterId, listKey, t.id, { text: v })}
            placeholder={isSteps ? 'Task…' : 'Action…'}
            className={isSteps ? 'text-slate-700' : 'text-slate-600'}
          />

          <button
            className="icon-btn danger no-print h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            title="Delete"
            onClick={() => actions.deleteTask(matterId, listKey, t.id)}
          >
            <IconClose size={13} />
          </button>
        </div>
      ))}

      <button
        className="btn-ghost no-print ml-[26px]"
        onClick={() => actions.addTask(matterId, listKey)}
      >
        <IconPlus size={13} />
        {isSteps ? 'Add task' : 'Add item'}
      </button>
    </div>
  )
}
