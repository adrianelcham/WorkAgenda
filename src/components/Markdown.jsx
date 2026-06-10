// Minimal, dependency-free Markdown renderer for Rachel's chat bubbles.
// Supports just what Rachel returns: **bold**, numbered lists, bullet lists,
// and line breaks. It builds React elements (no dangerouslySetInnerHTML), so
// it's XSS-safe. User messages are rendered as plain text, not through this.

// Inline: split on **bold** spans, leaving everything else as text.
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  )
}

export default function Markdown({ text }) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n')

  // Group lines into paragraph / ordered-list / unordered-list blocks.
  const blocks = []
  let list = null
  const flush = () => { if (list) { blocks.push(list); list = null } }

  lines.forEach((line) => {
    if (!line.trim()) { flush(); return } // blank line ends a list / paragraph run
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    const ul = line.match(/^\s*[-*•]\s+(.*)$/)
    if (ol) {
      if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [] } }
      list.items.push(ol[1])
    } else if (ul) {
      if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] } }
      list.items.push(ul[1])
    } else {
      flush()
      blocks.push({ type: 'p', text: line })
    }
  })
  flush()

  return (
    <div className="space-y-1.5">
      {blocks.map((b, i) => {
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
            </ol>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
            </ul>
          )
        }
        return <p key={i}>{renderInline(b.text)}</p>
      })}
    </div>
  )
}
