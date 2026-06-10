// Serverless route (Vercel-style) that proxies chat requests to Anthropic.
// The ANTHROPIC_API_KEY stays on the server and is never sent to the browser.
//
// Deploys automatically on Vercel as POST /api/chat. For local `npm run dev`
// the same path is served by a Vite middleware (see vite.config.js).
import { callAnthropic } from './_anthropic.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { reply } = await callAnthropic({
      apiKey,
      model: process.env.ANTHROPIC_MODEL,
      messages: body.messages,
      agenda: body.agenda,
    })
    res.status(200).json({ reply })
  } catch (e) {
    res.status(502).json({ error: 'Rachel could not reach Anthropic', detail: e?.detail || String(e?.message || e) })
  }
}
