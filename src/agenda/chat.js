// Client helper: call the secure /api/chat route. Throws on any failure so the
// caller can fall back to the local answer engine. The API key lives only on
// the server — this just posts the conversation + agenda context.
export async function askRachel(messages, agenda) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, agenda }),
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error || '' } catch { /* ignore */ }
    throw new Error(detail || `chat route failed (${res.status})`)
  }
  const data = await res.json()
  if (!data.reply) throw new Error('empty reply')
  return data.reply
}
