import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { callAnthropic, extractAgenda } from './api/_anthropic.js'

// Dev-only middleware so POST /api/chat and /api/extract-agenda work under
// `npm run dev` exactly like the Vercel serverless functions do in production.
// The API key is read from the environment / .env here (server side) and never
// reaches the browser.
function anthropicDevApi(env) {
  const key = () => env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  const model = () => env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL
  const readBody = async (req) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  }
  const json = (res, status, obj) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(obj))
  }

  return {
    name: 'anthropic-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
        if (!key()) return json(res, 500, { error: 'ANTHROPIC_API_KEY is not configured' })
        try {
          const body = await readBody(req)
          const { reply } = await callAnthropic({ apiKey: key(), model: model(), messages: body.messages, agenda: body.agenda })
          json(res, 200, { reply })
        } catch (e) {
          json(res, 502, { error: 'Anthropic error', detail: e?.detail || String(e?.message || e) })
        }
      })

      server.middlewares.use('/api/extract-agenda', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
        if (!key()) return json(res, 500, { error: 'ANTHROPIC_API_KEY is not configured' })
        try {
          const body = await readBody(req)
          const { result } = await extractAgenda({ apiKey: key(), model: model(), text: body.text, matters: body.matters })
          json(res, 200, { result })
        } catch (e) {
          json(res, 502, { error: 'Extraction failed', detail: e?.detail || String(e?.message || e) })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files (incl. non-VITE_ vars) for the dev middleware only.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), anthropicDevApi(env)],
  }
})
