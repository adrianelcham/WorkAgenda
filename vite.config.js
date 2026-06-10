import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { callAnthropic } from './api/_anthropic.js'

// Dev-only middleware so POST /api/chat works under `npm run dev` exactly like
// the Vercel serverless function does in production. The API key is read from
// the environment / .env here (server side) and never reaches the browser.
function anthropicDevApi(env) {
  return {
    name: 'anthropic-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        const json = (status, obj) => {
          res.statusCode = status
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(obj))
        }
        if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

        const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
        if (!apiKey) return json(500, { error: 'ANTHROPIC_API_KEY is not configured' })

        try {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const { reply } = await callAnthropic({
            apiKey,
            model: env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL,
            messages: body.messages,
            agenda: body.agenda,
          })
          json(200, { reply })
        } catch (e) {
          json(502, { error: 'Anthropic error', detail: e?.detail || String(e?.message || e) })
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
