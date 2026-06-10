// Serverless route (Vercel-style) that asks Anthropic to analyse extracted PDF
// text + existing matters and return a structured agenda proposal as JSON.
// Only the extracted text is sent — never the PDF file. The key stays server-side.
import { extractAgenda } from './_anthropic.js'

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
    const { result } = await extractAgenda({
      apiKey,
      model: process.env.ANTHROPIC_MODEL,
      text: body.text,
      matters: body.matters,
    })
    res.status(200).json({ result })
  } catch (e) {
    res.status(502).json({ error: 'Extraction failed', detail: e?.detail || String(e?.message || e) })
  }
}
