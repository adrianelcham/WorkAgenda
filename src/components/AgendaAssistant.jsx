import { useEffect, useRef, useState } from 'react'
import { IconChat, IconChevronDown, IconClose, IconArrowUp, IconPaperclip, IconTrash } from './icons'
import { localAnswer } from '../agenda/assistant'

// Floating "Agenda Assistant": a small icon button that folds open into a
// modern chat panel. Local only — fake responses, no API, no real PDF parsing.
// Design inspired by 21st.dev's prompt box (rounded input, auto-resize, send +
// paperclip), rebuilt in plain JSX with the app's own icons (no new deps).

const GREETING = {
  role: 'assistant',
  text:
    "Hi — I'm your Agenda Assistant. Ask me about urgent matters, waiting matters, " +
    'upcoming court dates, or say “summarise <matter name>”. You can also drop a PDF here.',
}

let seq = 0
const mid = () => `am_${++seq}`

export default function AgendaAssistant({ data }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ id: mid(), ...GREETING }])
  const [input, setInput] = useState('')
  const [pdf, setPdf] = useState(null) // { name } | null
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const taRef = useRef(null)
  const endRef = useRef(null)
  const fileRef = useRef(null)
  const dragDepth = useRef(0)

  // Keep the latest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading, open])

  // Auto-resize the textarea (capped). Works fine outside a table cell.
  const adjust = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }

  const addMsg = (m) => setMessages((prev) => [...prev, { id: mid(), ...m }])

  const acceptPdf = (file) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) {
      addMsg({ role: 'assistant', text: 'Only PDF files are supported for now.' })
      return
    }
    setPdf({ name: file.name })
  }

  // --- drag & drop (PDF only) ---
  const onDragEnter = (e) => { e.preventDefault(); dragDepth.current += 1; setDragOver(true) }
  const onDragOver = (e) => { e.preventDefault() }
  const onDragLeave = () => { dragDepth.current -= 1; if (dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false) } }
  const onDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    acceptPdf(e.dataTransfer.files?.[0])
  }

  const send = () => {
    const text = input.trim()
    if ((!text && !pdf) || loading) return
    const attached = pdf
    addMsg({ role: 'user', text, pdfName: attached?.name })
    setInput('')
    setPdf(null)
    requestAnimationFrame(adjust)
    setLoading(true)

    const reply = attached
      ? 'PDF received. Real date extraction will be added in the next stage.'
      : localAnswer(text, data)

    // Fake "thinking" delay so the loading state is visible.
    window.setTimeout(() => {
      addMsg({ role: 'assistant', text: reply })
      setLoading(false)
    }, 550)
  }

  const clearChat = () => {
    setMessages([{ id: mid(), ...GREETING }])
    setInput('')
    setPdf(null)
    setLoading(false)
    requestAnimationFrame(adjust)
  }

  const canSend = (input.trim() || pdf) && !loading

  return (
    <div className="no-print">
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Minimise assistant' : 'Open Agenda Assistant'}
        aria-label={open ? 'Minimise Agenda Assistant' : 'Open Agenda Assistant'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:bg-[#1d4ed8] active:scale-95"
      >
        {open ? <IconChevronDown size={24} /> : <IconChat size={24} />}
      </button>

      {/* Chat panel (always mounted so it can animate open/closed) */}
      <div
        className="assistant-panel fixed bottom-[84px] right-5 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        style={{ height: 560, maxHeight: 'calc(100vh - 120px)' }}
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Agenda Assistant</div>
            <div className="text-[11px] text-slate-400">Local · reads your current agenda</div>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-ghost h-7 px-2 text-xs" onClick={clearChat} title="Clear chat">
              <IconTrash size={13} />
              Clear
            </button>
            <button className="icon-btn h-7 w-7" onClick={() => setOpen(false)} title="Minimise" aria-label="Minimise">
              <IconClose size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-3 py-3">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {loading && <TypingBubble />}
          <div ref={endRef} />

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 m-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--accent)] bg-blue-50/90 text-[var(--accent)]">
              <IconPaperclip size={22} />
              <div className="text-sm font-semibold">Drop PDF here</div>
            </div>
          )}
        </div>

        {/* Prompt box */}
        <div className="border-t border-slate-200 p-3">
          {pdf && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
              <IconPaperclip size={13} />
              <span className="flex-1 truncate">{pdf.name}</span>
              <button className="icon-btn h-5 w-5" title="Remove PDF" onClick={() => setPdf(null)}>
                <IconClose size={12} />
              </button>
            </div>
          )}

          <div className="assistant-prompt flex items-end gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1.5">
            <button
              className="icon-btn h-8 w-8 shrink-0"
              title="Attach PDF"
              aria-label="Attach PDF"
              onClick={() => fileRef.current?.click()}
            >
              <IconPaperclip size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { acceptPdf(e.target.files?.[0]); e.target.value = '' }}
            />
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              placeholder="Ask about your agenda…"
              onChange={(e) => { setInput(e.target.value); adjust() }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              className="max-h-[132px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-snug text-slate-800 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={send}
              disabled={!canSend}
              title="Send"
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition hover:bg-[#1d4ed8] active:scale-95 disabled:opacity-40"
            >
              <IconArrowUp size={16} />
            </button>
          </div>

          <div className="mt-1.5 px-1 text-[10px] text-slate-400">
            Enter to send · Shift+Enter for a new line · PDFs aren’t parsed yet
          </div>
        </div>
      </div>
    </div>
  )
}

// A single chat message bubble (assistant left, user right). Preserves newlines.
function Bubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ' +
          (isUser
            ? 'rounded-br-sm bg-[var(--accent)] text-white'
            : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700')
        }
      >
        {m.pdfName && (
          <div
            className={
              'mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ' +
              (isUser ? 'bg-white/20' : 'bg-slate-100')
            }
          >
            <IconPaperclip size={12} />
            <span className="truncate">{m.pdfName}</span>
          </div>
        )}
        {m.text}
      </div>
    </div>
  )
}

// Animated "typing…" indicator shown while a fake response is pending.
function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-3">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      </div>
    </div>
  )
}
