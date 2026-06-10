// Local, in-browser PDF handling for the Agenda Assistant.
//   extractPdfText(file)            -> reads the PDF text with pdf.js
//   buildProposal(text, name, …)    -> applies simple rules/regex to propose
//                                      agenda updates (dates, matter match)
//
// Everything runs locally. No API, no upload, no AI. pdf.js is lazy-loaded so
// it stays out of the main bundle until a PDF is actually processed.

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise

  let text = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    text += content.items.map((it) => (it && it.str) || '').join(' ') + '\n'
  }
  return text.replace(/[ \t]+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Date detection
// ---------------------------------------------------------------------------
const MONTHS =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|' +
  'aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'

const DATE_PATTERNS = [
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\s+\\d{4}\\b`, 'gi'), // 24 June 2026
  new RegExp(`\\b(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, 'gi'), // June 24, 2026
  /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, // 24/06/2026
]

// Keywords that hint a date is a court event vs a deadline.
const COURT_KW = [
  'directions hearing', 'pre-trial review', 'pre-trial', 'pretrial', 'first return',
  'return date', 'directions', 'direction', 'hearing', 'mention', 'callover',
  'call-over', 'conference', 'review', 'listed', 'trial', 'return',
]
const DEADLINE_KW = [
  'no later than', 'points of', 'file evidence', 'filed', 'filing', 'file', 'lodge',
  'lodged', 'serve', 'served', 'service', 'evidence', 'affidavit', 'submissions',
  'submission', 'reply', 'defence', 'due', 'before', 'by',
]

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Classify a single date by the nearest keyword before it, and build a phrase
// (from that keyword up to the date) suitable for a task / court-date label.
function classifyDate(raw, index, text) {
  const start = Math.max(0, index - 80)
  const ctx = text.slice(start, index + raw.length)
  const lc = ctx.toLowerCase()

  // The keyword NEAREST the date decides whether it's a court date or deadline.
  let best = null
  for (const [type, words] of [['court', COURT_KW], ['deadline', DEADLINE_KW]]) {
    for (const kw of words) {
      const idx = lc.lastIndexOf(kw)
      if (idx >= 0 && (!best || idx > best.idx)) best = { type, kw, idx }
    }
  }

  if (!best) return { raw, kind: 'other', label: 'Date', phrase: raw }

  // For a fuller, clearer label, start the phrase at the EARLIEST keyword of
  // that same type within the context (e.g. "Directions hearing listed for …"
  // rather than just "listed for …").
  const words = best.type === 'court' ? COURT_KW : DEADLINE_KW
  let phraseStart = best.idx
  for (const kw of words) {
    const i = lc.indexOf(kw)
    if (i >= 0 && i < phraseStart) phraseStart = i
  }

  let phrase = ctx.slice(phraseStart).replace(/\s+/g, ' ').trim()
  if (phrase.length > 90) phrase = phrase.slice(0, 90).trim() + '…'
  return { raw, kind: best.type, label: cap(best.kw), phrase: cap(phrase) }
}

function detectDates(text) {
  const seen = new Set()
  const out = []
  for (const re of DATE_PATTERNS) {
    let m
    re.lastIndex = 0
    while ((m = re.exec(text)) !== null) {
      const key = `${m.index}:${m[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(classifyDate(m[0], m.index, text))
    }
  }
  return out.sort((a, b) => text.indexOf(a.raw) - text.indexOf(b.raw))
}

// ---------------------------------------------------------------------------
// Matter matching (matter number / name / aliases / loose token overlap)
// ---------------------------------------------------------------------------
function scoreMatter(m, text, lc) {
  let score = 0
  const reasons = []

  const num = (m.matterNumber || '').trim()
  if (num.length >= 4 && text.includes(num)) { score += 6; reasons.push(`matter no. ${num}`) }

  const name = (m.matterName || '').trim().toLowerCase()
  if (name.length >= 3 && lc.includes(name)) { score += 4; reasons.push(`name “${m.matterName}”`) }

  for (const a of m.aliases || []) {
    const alias = (a || '').trim().toLowerCase()
    if (alias.length >= 3 && lc.includes(alias)) { score += 3; reasons.push(`alias “${a}”`) }
  }

  // Loose: individual significant words from the matter name appearing in text.
  if (name && !lc.includes(name)) {
    let hits = 0
    for (const w of name.split(/\s+/)) if (w.length >= 4 && lc.includes(w)) hits++
    if (hits) { score += Math.min(hits, 2); reasons.push('loose name match') }
  }

  return { score, reasons }
}

function confidenceFor(score) {
  if (score >= 6) return 'high'
  if (score >= 3) return 'medium'
  if (score >= 1) return 'low'
  return 'none'
}

// Optional: a guessed title when nothing matches (for display only).
function guessTitle(text) {
  const m =
    text.match(/in the matter of\s+([A-Za-z0-9][\w &.'-]{2,40})/i) ||
    text.match(/\bre:?\s+([A-Za-z0-9][\w &.'-]{2,40})/i)
  return m ? m[1].trim() : null
}

// Build the proposal object the chat card renders.
export function buildProposal(text, fileName, matters) {
  const lc = (text || '').toLowerCase()
  const dates = detectDates(text || '')

  const court = dates.filter((d) => d.kind === 'court')
  const deadlines = dates.filter((d) => d.kind === 'deadline')

  const courtDate = court.length ? court[0].phrase : null
  const steps = deadlines.map((d) => ({ text: d.phrase, dueDate: d.raw }))

  // Best matter match
  let best = null
  for (const m of matters || []) {
    const s = scoreMatter(m, text || '', lc)
    if (!best || s.score > best.score) best = { id: m.id, name: m.matterName || m.matterNumber, ...s }
  }
  const confidence = best ? confidenceFor(best.score) : 'none'
  const matchId = confidence === 'none' ? null : best.id

  return {
    fileName,
    matchId,
    matchName: matchId ? best.name : null,
    confidence,
    reasons: best ? best.reasons : [],
    guessedTitle: guessTitle(text || ''),
    courtDate,
    steps,
    dates,
    hasUpdates: Boolean(courtDate) || steps.length > 0,
  }
}
