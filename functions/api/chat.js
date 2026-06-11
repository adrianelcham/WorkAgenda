// Cloudflare Pages Function — POST /api/chat
// File-based routing: functions/api/chat.js -> /api/chat
//
// Proxies chat requests to Anthropic. The key is a Cloudflare secret
// (env.ANTHROPIC_API_KEY) and never reaches the browser. Reuses the same
// runtime-agnostic helper used by local dev and the Vercel-style route.
import { callAnthropic } from '../../api/_anthropic.js'

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })

export async function onRequestPost({ request, env }) {
  const apiKey = env.ANTHROPIC_API_KEY
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)

  try {
    const body = await request.json().catch(() => ({}))
    const { reply } = await callAnthropic({
      apiKey,
      model: env.ANTHROPIC_MODEL,
      messages: body.messages,
      agenda: body.agenda,
    })
    return json({ reply })
  } catch (e) {
    return json({ error: 'Rachel could not reach Anthropic', detail: e?.detail || String(e?.message || e) }, 502)
  }
}
