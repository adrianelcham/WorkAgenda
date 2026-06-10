import { useEffect, useRef, useState } from 'react'
import { IconChat, IconChevronDown, IconClose, IconArrowUp, IconPaperclip, IconTrash } from './icons'
import { localAnswer } from '../agenda/assistant'
import { extractPdfText, buildProposal } from '../agenda/pdf'

// Floating "Agenda Assistant": folds open into a modern chat panel.
// Local only — no API. Text questions are answered from the current agenda;
// dropping a PDF extracts its text in the browser and proposes agenda updates
// in a confirmation card (Apply / Cancel). Nothing changes without confirmation.

const GREETING = {
  role: 'assistant',
  text:
    "Hi — I'm your Agenda Assistant. Ask me about urgent matters, waiting matters, " +
    'upcoming court dates, or “summarise <matter name>”. Drop a PDF and I’ll read it ' +
    'locally and propose updates for you to confirm.',
}

let seq = 0
const mid = () => `am_${++seq}`

export default function AgendaAssistant({ data, onApplyExtraction }) {
  const matters = (data && data.matters) || []

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ id: mid(), ...GREETING }])
  const [input, setInput] = useState('')
  const [pdf, setPdf] = useState(null) // a File | null
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const taRef = useRef(null)
  const endRef = useRef(null)
  const fileRef = useRef(null)
  const dragDepth = useRef(0)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading, open])

  const adjust = () => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }

  const addMsg = (m) => setMessages((prev) => [...prev, { id: mid(), ...m }])
  const updateMsg = (id, patch) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  const acceptPdf = (file) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) {
      addMsg({ role: 'assistant', text: 'Only PDF files are supported for now.' })
      return
    }
    setPdf(file)
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

  const send = async () => {
    const text = input.trim()
    if ((!text && !pdf) || loading) return
    const file = pdf
    addMsg({ role: 'user', text, pdfName: file?.name })
    setInput('')
    setPdf(null)
    requestAnimationFrame(adjust)
    setLoading(true)

    if (file) {
      // Read the PDF locally and build a proposal (no API, no upload).
      try {
        const pdfText = await extractPdfText(file)
        const proposal = buildProposal(pdfText, file.name, matters)
        if (!proposal.hasUpdates && proposal.dates.length === 0) {
          addMsg({ role: 'assistant', text: `I read “${file.name}” but couldn’t find any dates or actions to propose.` })
        } else {
          addMsg({ role: 'assistant', kind: 'proposal', proposal })
        }
      } catch (err) {
        addMsg({
          role: 'assistant',
          text: `I couldn’t read text from “${file.name}”. It may be a scanned/image-only PDF.`,
        })
      }
      setLoading(false)
      return
    }

    // Text question → local answer (small fake delay so loading shows).
    const reply = localAnswer(text, data)
    window.setTimeout(() => {
      addMsg({ role: 'assistant', text: reply })
      setLoading(false)
    }, 450)
  }

  const applyProposal = (messageId, matterId, proposal) => {
    onApplyExtraction?.(matterId, proposal)
    const name = matters.find((m) => m.id === matterId)?.matterName || 'matter'
    const parts = []
    if (proposal.courtDate) parts.push('court date updated')
    if (proposal.steps.length) parts.push(`${proposal.steps.length} next step${proposal.steps.length > 1 ? 's' : ''} added`)
    updateMsg(messageId, { resolved: 'applied', summary: `Applied to ${name}${parts.length ? ' — ' + parts.join(', ') : ''}.` })
  }
  const cancelProposal = (messageId) => updateMsg(messageId, { resolved: 'cancelled', summary: 'Proposal discarded.' })

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
      <button
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Minimise assistant' : 'Open Agenda Assistant'}
        aria-label={open ? 'Minimise Agenda Assistant' : 'Open Agenda Assistant'}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition hover:bg-[#1d4ed8] active:scale-95"
      >
        {open ? <IconChevronDown size={24} /> : <IconChat size={24} />}
      </button>

      <div
        className="assistant-panel fixed bottom-[84px] right-5 z-50 flex w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        style={{ height: 580, maxHeight: 'calc(100vh - 120px)' }}
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Agenda Assistant</div>
            <div className="text-[11px] text-slate-400">Local · reads your agenda · proposes PDF updates</div>
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

        <div className="relative flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-3 py-3">
          {messages.map((m) =>
            m.kind === 'proposal' ? (
              <ProposalCard
                key={m.id}
                proposal={m.proposal}
                matters={matters}
                resolved={m.resolved}
                summary={m.summary}
                onApply={(matterId) => applyProposal(m.id, matterId, m.proposal)}
                onCancel={() => cancelProposal(m.id)}
              />
            ) : (
              <Bubble key={m.id} m={m} />
            ),
          )}
          {loading && <TypingBubble />}
          <div ref={endRef} />

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 m-2 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--accent)] bg-blue-50/90 text-[var(--accent)]">
              <IconPaperclip size={22} />
              <div className="text-sm font-semibold">Drop PDF here</div>
            </div>
          )}
        </div>

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
            Enter to send · Shift+Enter for a new line · PDFs are read locally, nothing is uploaded
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-relaxed ' +
          (isUser ? 'rounded-br-sm bg-[var(--accent)] text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-700')
        }
      >
        {m.pdfName && (
          <div className={'mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ' + (isUser ? 'bg-white/20' : 'bg-slate-100')}>
            <IconPaperclip size={12} />
            <span className="truncate">{m.pdfName}</span>
          </div>
        )}
        {m.text}
      </div>
    </div>
  )
}

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

// Confirmation card shown before any agenda change. Nothing is applied until
// the user picks a matter (if unsure) and clicks Apply.
const CONF_COLOR = { high: '#16a34a', medium: '#d97706', low: '#dc2626', none: '#dc2626' }

function ProposalCard({ proposal, matters, resolved, summary, onApply, onCancel }) {
  const [selectedId, setSelectedId] = useState(proposal.matchId || '')

  if (resolved) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-500">
        {summary || (resolved === 'applied' ? 'Applied.' : 'Proposal discarded.')}
      </div>
    )
  }

  const conf = proposal.confidence
  const confColor = CONF_COLOR[conf] || '#64748b'
  const unsure = conf === 'low' || conf === 'none'
  const canApply = Boolean(selectedId) && proposal.hasUpdates

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[13px] shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-slate-900">
        <span className="font-semibold">Proposed update from PDF</span>
      </div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        <IconPaperclip size={12} />
        <span className="truncate">{proposal.fileName}</span>
      </div>

      {/* Matter + confidence */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-slate-500">Detected matter</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
          style={{ color: confColor, backgroundColor: confColor + '1f' }}>
          {conf} confidence
        </span>
      </div>
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="control mb-2 h-9 w-full text-[13px]"
      >
        <option value="">{unsure ? 'Choose the matter…' : 'Select a matter…'}</option>
        {matters.map((m) => (
          <option key={m.id} value={m.id}>
            {(m.matterName || m.matterNumber || 'Untitled') + (m.matterNumber && m.matterName ? ` · ${m.matterNumber}` : '')}
          </option>
        ))}
      </select>
      {proposal.matchName && (
        <div className="mb-2 text-[11px] text-slate-400">
          Best guess: {proposal.matchName}{proposal.reasons.length ? ` (${proposal.reasons.join(', ')})` : ''}
        </div>
      )}

      {/* Extracted dates */}
      {proposal.dates.length > 0 && (
        <div className="mb-2">
          <div className="mb-1 text-[11px] font-medium text-slate-500">Extracted dates</div>
          <ul className="space-y-0.5">
            {proposal.dates.map((d, i) => (
              <li key={i} className="text-[12px] text-slate-600">
                <span className="text-slate-400">{d.kind === 'court' ? 'Court' : d.kind === 'deadline' ? 'Deadline' : 'Date'}:</span>{' '}
                {d.raw}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proposed updates */}
      <div className="mb-3 rounded-lg bg-slate-50 p-2">
        <div className="mb-1 text-[11px] font-medium text-slate-500">Proposed updates</div>
        {proposal.courtDate && (
          <div className="text-[12px] text-slate-700">• Next Court Date → <span className="font-medium">{proposal.courtDate}</span></div>
        )}
        {proposal.steps.map((s, i) => (
          <div key={i} className="text-[12px] text-slate-700">• Add next step: {s.text}</div>
        ))}
        {!proposal.hasUpdates && <div className="text-[12px] italic text-slate-400">No concrete updates detected.</div>}
      </div>

      <div className="flex items-center gap-2">
        <button className="btn btn-primary h-8" disabled={!canApply} onClick={() => onApply(selectedId)}>
          Apply
        </button>
        <button className="btn h-8" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
