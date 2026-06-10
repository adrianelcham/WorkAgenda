// Inline text editor that blends into the page until you click into it.
//
//   multiline = true   -> auto-growing <textarea> (used for tasks, court dates).
//                         Growth is CSS-only via the .grow-wrap mirror (see
//                         index.css), which is reliable inside table cells.
//   autoWidth = true   -> <input> sized to its content (used for short fields
//                         like matter number and the centred section title).
//
// Changes flow straight up via onChange; the parent persists to localStorage.
export default function Editable({
  value = '',
  onChange,
  multiline = false,
  autoWidth = false,
  placeholder = '',
  className = '',
}) {
  // Shared visual styling (transparent until focused, then a soft highlight).
  const look =
    'bg-transparent outline-none rounded-sm ' +
    'focus:bg-yellow-50 focus:ring-1 focus:ring-blue-300 ' +
    className

  if (multiline) {
    // The wrapper mirrors the text via data-val so the box grows to fit.
    return (
      <div className="grow-wrap" data-val={value + ' '}>
        <textarea
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={look}
        />
      </div>
    )
  }

  // Size the input to its text (+ a little slack) when autoWidth is on.
  const style = autoWidth
    ? { width: Math.max(value?.length || 0, placeholder.length, 3) + 2 + 'ch' }
    : undefined

  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      className={'px-1 -mx-1 ' + (autoWidth ? '' : 'w-full ') + look}
    />
  )
}
