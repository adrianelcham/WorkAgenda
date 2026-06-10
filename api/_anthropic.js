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
