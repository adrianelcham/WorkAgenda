import Editable from './Editable'
import TaskList from './TaskList'
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '../constants'
import { IconChevronUp, IconChevronDown, IconDuplicate, IconTrash, IconChevronDown as Caret } from './icons'

// One matter = one table row with the four agenda columns.
export default function MatterRow({ matter, sections, actions }) {
  const m = matter
  const set = (field, value) => actions.updateMatterField(m.id, field, value)

  return (
    <tr className="matter-row align-top">
      {/* --- Matter: number, name, type, priority, status, row controls --- */}
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-1">
          <Editable
            value={m.matterNumber}
            onChange={(v) => set('matterNumber', v)}
            placeholder="Matter no."
            autoWidth
            className="block text-xs text-slate-400 font-mono tracking-tight"
          />
          <Editable
            value={m.matterName}
            onChange={(v) => set('matterName', v)}
            placeholder="Matter name"
            className="block text-[15px] font-semibold text-slate-900 leading-tight"
          />
          <Editable
            value={m.matterType}
            onChange={(v) => set('matterType', v)}
            placeholder="Matter type"
            className="block text-xs text-slate-500"
          />
        </div>

        {/* Priority + status as compact pill dropdowns */}
        <div className="flex flex-wrap gap-1.5 pt-2.5">
          <Badge value={m.priority} onChange={(v) => set('priority', v)}
            options={PRIORITIES} colors={PRIORITY_COLORS} />
          <Badge value={m.status} onChange={(v) => set('status', v)}
            options={STATUSES} colors={STATUS_COLORS} />
        </div>

        {/* Row controls — hidden when printing */}
        <div className="no-print flex flex-wrap items-center gap-0.5 pt-2.5">
          <button className="icon-btn" title="Move up" onClick={() => actions.moveMatter(m.id, -1)}>
            <IconChevronUp size={15} />
          </button>
          <button className="icon-btn" title="Move down" onClick={() => actions.moveMatter(m.id, +1)}>
            <IconChevronDown size={15} />
          </button>
          <button className="icon-btn" title="Duplicate matter" onClick={() => actions.duplicateMatter(m.id)}>
            <IconDuplicate size={14} />
          </button>
          <button className="icon-btn danger" title="Delete matter" onClick={() => actions.deleteMatter(m.id)}>
            <IconTrash size={14} />
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
          <select
            value={m.sectionId}
            onChange={(e) => actions.moveMatterToSection(m.id, e.target.value)}
            title="Move to section"
            className="mini-select"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </td>

      {/* --- Previous Action --- */}
      <td className="px-3 py-2.5">
        <TaskList matterId={m.id} listKey="previousActions" tasks={m.previousActions}
          actions={actions} emptyLabel="No previous actions" />
      </td>

      {/* --- Next Steps --- */}
      <td className="px-3 py-2.5">
        <TaskList matterId={m.id} listKey="nextSteps" tasks={m.nextSteps}
          actions={actions} emptyLabel="No next steps" />
      </td>

      {/* --- Next Court Date (free text, may span multiple lines) --- */}
      <td className="px-3 py-2.5">
        <Editable
          multiline
          value={m.nextCourtDate}
          onChange={(v) => set('nextCourtDate', v)}
          placeholder="No court date"
          className="text-slate-700 text-[13px]"
        />
      </td>
    </tr>
  )
}

// Priority / status as a pill-shaped dropdown: a colour dot, the value, and a
// caret. On screen it's a real <select>; on the printout it prints as plain
// coloured text (see .print-only / .no-print).
function Badge({ value, onChange, options, colors }) {
  const color = colors[value] || '#64748b'
  return (
    <span className="relative inline-flex items-center">
      <span
        className="no-print pointer-events-none absolute left-[7px] h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="badge-select no-print"
        style={{ color, backgroundColor: color + '1f', borderColor: color + '40' }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ color: '#1e293b' }}>{o}</option>
        ))}
      </select>
      <span className="no-print pointer-events-none absolute right-[5px]" style={{ color }} aria-hidden>
        <Caret size={10} strokeWidth={2.2} />
      </span>
      <span className="print-only text-xs font-medium" style={{ color }}>{value}</span>
    </span>
  )
}
