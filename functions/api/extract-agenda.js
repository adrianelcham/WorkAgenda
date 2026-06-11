// Cloudflare Pages Function — POST /api/extract-agenda
// File-based routing: functions/api/extract-agenda.js -> /api/extract-agenda
//
// Sends extracted PDF text + matter list to Anthropic and returns a structured
// agenda proposal as JSON. Only the extracted text is sent (never the file).
// The key is a Cloudflare secret (env.ANTHROPIC_API_KEY), never in the browser.
import { extractAgenda } from '../../api/_anthropic.js'

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)

  try {
    const body = await request.json().catch(() => ({}))
    const { result } = await extractAgenda({
      apiKey,
      model: env.ANTHROPIC_MODEL,
      text: body.text,
      matters: body.matters,
    })
    return json({ result })
  } catch (e) {
    return json({ error: 'Extraction failed', detail: e?.detail || String(e?.message || e) }, 502)
  }
}
