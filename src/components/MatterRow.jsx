import Editable from './Editable'
import TaskList from './TaskList'
import { PRIORITIES, STATUSES, PRIORITY_COLORS, STATUS_COLORS } from '../constants'

// One matter = one table row with the four agenda columns.
export default function MatterRow({ matter, sections, actions }) {
  const m = matter
  const set = (field, value) => actions.updateMatterField(m.id, field, value)

  return (
    <tr className="align-top">
      {/* --- Matter: number, name, type, priority, status, row controls --- */}
      <td className="border border-black p-2">
        <Editable
          value={m.matterNumber}
          onChange={(v) => set('matterNumber', v)}
          placeholder="Matter no."
          autoWidth
          className="block text-xs text-gray-500 font-mono"
        />
        <Editable
          value={m.matterName}
          onChange={(v) => set('matterName', v)}
          placeholder="Matter name"
          className="block font-bold"
        />
        <Editable
          value={m.matterType}
          onChange={(v) => set('matterType', v)}
          placeholder="Matter type"
          className="block text-xs text-gray-600 italic"
        />

        {/* Priority + status pickers (each with a small colour dot) */}
        <div className="flex flex-wrap gap-2 pt-1.5">
          <Picker value={m.priority} onChange={(v) => set('priority', v)}
            options={PRIORITIES} colors={PRIORITY_COLORS} />
          <Picker value={m.status} onChange={(v) => set('status', v)}
            options={STATUSES} colors={STATUS_COLORS} />
        </div>

        {/* Row controls — hidden when printing */}
        <div className="no-print flex flex-wrap items-center gap-1 pt-1.5 text-gray-500">
          <IconBtn title="Move up" onClick={() => actions.moveMatter(m.id, -1)}>↑</IconBtn>
          <IconBtn title="Move down" onClick={() => actions.moveMatter(m.id, +1)}>↓</IconBtn>
          <IconBtn title="Duplicate" onClick={() => actions.duplicateMatter(m.id)}>⧉</IconBtn>
          <IconBtn title="Delete" onClick={() => actions.deleteMatter(m.id)} danger>🗑</IconBtn>
          <select
            value={m.sectionId}
            onChange={(e) => actions.moveMatterToSection(m.id, e.target.value)}
            title="Move to section"
            className="border border-gray-300 rounded text-xs px-1 py-0.5 bg-white max-w-[120px]"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </td>

      {/* --- Previous Action --- */}
      <td className="border border-black p-2">
        <TaskList matterId={m.id} listKey="previousActions" tasks={m.previousActions} actions={actions} />
      </td>

      {/* --- Next Steps --- */}
      <td className="border border-black p-2">
        <TaskList matterId={m.id} listKey="nextSteps" tasks={m.nextSteps} actions={actions} />
      </td>

      {/* --- Next Court Date (free text, may span multiple lines) --- */}
      <td className="border border-black p-2">
        <Editable multiline value={m.nextCourtDate} onChange={(v) => set('nextCourtDate', v)} placeholder="—" />
      </td>
    </tr>
  )
}

// Small dropdown with a colour dot in front. On screen it's a <select>;
// on the printout it shows as a plain coloured label (see .print-only / .no-print).
function Picker({ value, onChange, options, colors }) {
  const color = colors[value] || '#6b7280'
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="no-print text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span className="print-only text-xs" style={{ color }}>{value}</span>
    </span>
  )
}

// Tiny icon button used in the matter row controls.
function IconBtn({ children, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={'px-1 rounded hover:bg-gray-100 ' + (danger ? 'hover:text-red-600' : 'hover:text-black')}
    >
      {children}
    </button>
  )
}
