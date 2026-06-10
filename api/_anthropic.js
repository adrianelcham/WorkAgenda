// Shared server-side helper for talking to the Anthropic Messages API.
// Used by both the Vercel serverless function (api/chat.js) and the Vite dev
// middleware (vite.config.js). The API key is read from the environment by the
// caller and never reaches the browser.

const DEFAULT_MODEL = 'claude-sonnet-4-6'

export function buildSystemPrompt(agenda) {
  const persona = [
    'You are Rachel, the assistant for a legal work agenda — a live table of legal matters',
    'used by two solicitors to track matters, priorities, statuses, next steps and court dates.',
    'Be concise, professional and practical; plain text with short lists is ideal.',
    'Answer using the agenda data provided below. If something is not in the data, say so —',
    'never invent matter numbers, parties or court dates.',
    'You cannot edit the agenda directly; the app only changes it when the user confirms a',
    'PDF-extraction proposal (Apply). Do not claim to have made changes.',
  ].join(' ')

  let context = ''
  if (agenda) {
    // Keep the context bounded so requests stay small.
    context = '\n\nCURRENT AGENDA (JSON):\n' + JSON.stringify(agenda).slice(0, 12000)
  }
  return persona + context
}

export async function callAnthropic({ apiKey, model, messages, agenda }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 1024,
      system: buildSystemPrompt(agenda),
      messages: (messages || [])
        .filter((m) => m && m.content)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) })),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error('Anthropic API error ' + res.status)
    err.detail = detail.slice(0, 500)
    throw err
  }

  const data = await res.json()
  const reply = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  return { reply: reply || '(no response)' }
}

// Parse a JSON object out of a model response (tolerant of code fences / prose).
function parseJsonLoose(s) {
  let t = String(s || '').trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

// Analyse extracted PDF text + existing matters -> structured agenda proposal.
// Only the extracted TEXT is sent (never the PDF file). Returns parsed JSON.
export async function extractAgenda({ apiKey, model, text, matters }) {
  const system = [
    'You extract structured agenda updates from the text of a legal/court document.',
    'You are given the document text and a list of EXISTING matters (id, name, number, aliases).',
    'Identify which existing matter the document relates to (by party name, matter number or alias),',
    'and pull out court dates and action deadlines from the text only.',
    'Classify each date as "court" (hearing, directions, mention, pre-trial, callover, conference, listing),',
    '"deadline" (file/serve/lodge evidence, affidavits, submissions, etc.) or "other".',
    'Respond with ONLY a single valid JSON object (no markdown, no prose) of this exact shape:',
    '{"detectedMatterName": string|null, "detectedMatterNumber": string|null,',
    ' "matchedMatterId": string|null, "matchReason": string|null,',
    ' "confidence": "high"|"medium"|"low",',
    ' "extractedDates": [{"date": string, "label": string, "kind": "court"|"deadline"|"other"}],',
    ' "proposedCourtDateUpdate": string|null,',
    ' "proposedNextSteps": [{"text": string, "dueDate": string|null}],',
    ' "warnings": [string]}.',
    'proposedCourtDateUpdate: a short human-readable label combining the event and date',
    'as it should appear in the agenda, e.g. "Directions hearing — 24 June 2026", or null.',
    'proposedNextSteps[].text: a self-contained action that includes its deadline date in words,',
    'e.g. "File evidence by 23 June 2026"; dueDate is that same date.',
    'matchedMatterId MUST be one of the provided matter ids, or null if unsure.',
    'Never invent dates, parties or matter numbers that are not in the document text.',
  ].join(' ')

  const userContent =
    'EXISTING MATTERS:\n' + JSON.stringify(matters || []).slice(0, 6000) +
    '\n\nDOCUMENT TEXT:\n' + String(text || '').slice(0, 16000)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    const err = new Error('Anthropic API error ' + res.status)
    err.detail = detail.slice(0, 500)
    throw err
  }

  const data = await res.json()
  const raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  return { result: parseJsonLoose(raw) }
}
