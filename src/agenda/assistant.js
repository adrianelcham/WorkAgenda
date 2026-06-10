// Local (no-AI) answer engine for the Agenda Assistant.
// Reads the current agenda data and answers a few simple questions.
// Pure: string question + data in, string answer out. No network, no parsing.

const nameOf = (m) => m.matterName || m.matterNumber || 'Untitled matter'
const oneLine = (s) => (s || '').replace(/\s*\n\s*/g, '; ').trim()

// Compact agenda context sent to Anthropic so Rachel can answer about matters,
// priorities, waiting items and dates. `extras` can carry e.g. the last
// extracted PDF text for follow-up questions.
export function buildAgendaContext(data, extras = {}) {
  const sectionTitle = (id) => (data?.sections?.find((s) => s.id === id)?.title) || ''
  return {
    month: data?.meta?.month,
    matters: (data?.matters || []).map((m) => ({
      section: sectionTitle(m.sectionId),
      number: m.matterNumber || undefined,
      name: m.matterName || undefined,
      type: m.matterType || undefined,
      priority: m.priority,
      status: m.status,
      nextCourtDate: m.nextCourtDate || undefined,
      previousActions: m.previousActions.map((t) => t.text).filter(Boolean),
      nextSteps: m.nextSteps.map((t) => t.text).filter(Boolean),
    })),
    ...extras,
  }
}

function summariseMatter(m) {
  const lines = [
    `${nameOf(m)}${m.matterType ? ' — ' + m.matterType : ''}`,
    `Matter no: ${m.matterNumber || '—'}`,
    `Priority: ${m.priority} · Status: ${m.status}`,
    `Next court date: ${oneLine(m.nextCourtDate) || 'none'}`,
    `Previous actions: ${m.previousActions.length} · Next steps: ${m.nextSteps.length}`,
  ]
  const steps = m.nextSteps.filter((t) => t.text.trim()).slice(0, 5)
  if (steps.length) lines.push('Next steps:\n' + steps.map((t) => '• ' + t.text).join('\n'))
  return lines.join('\n')
}

export function localAnswer(question, data) {
  const text = (question || '').trim().toLowerCase()
  const matters = (data && data.matters) || []

  if (!text) {
    return 'Ask me about urgent matters, waiting matters, upcoming court dates, or say “summarise <matter name>”.'
  }

  // Does the question name a specific matter?
  const matterHit = matters.find((m) => m.matterName && text.includes(m.matterName.toLowerCase()))
  const wantsSummary = /(summar|tell me about|brief me|overview|details? (on|for|about)|status of|what'?s (happening|going on))/.test(text)

  if (wantsSummary) {
    return matterHit ? summariseMatter(matterHit) : 'Which matter? Try the name, e.g. “summarise Wang”.'
  }

  // Urgent matters (Critical / High priority)
  if (/(urgent|critical|high priority|priorit)/.test(text)) {
    const urgent = matters.filter((m) => m.priority === 'Critical' || m.priority === 'High')
    if (!urgent.length) return 'No matters are marked Critical or High right now.'
    return `${urgent.length} urgent matter${urgent.length > 1 ? 's' : ''} (Critical/High):\n` +
      urgent.map((m) => `• ${nameOf(m)} — ${m.priority}${m.nextCourtDate ? ` (court: ${oneLine(m.nextCourtDate)})` : ''}`).join('\n')
  }

  // Waiting matters (status starts with "Waiting", or priority "Waiting")
  if (/wait/.test(text)) {
    const waiting = matters.filter((m) => /^waiting/i.test(m.status) || m.priority === 'Waiting')
    if (!waiting.length) return 'No matters are currently in a waiting state.'
    return `${waiting.length} waiting matter${waiting.length > 1 ? 's' : ''}:\n` +
      waiting.map((m) => `• ${nameOf(m)} — ${m.status}`).join('\n')
  }

  // Upcoming court dates
  if (/(court|hearing|upcoming|deadline|due date|dates?)/.test(text)) {
    const withDates = matters.filter((m) => m.nextCourtDate && m.nextCourtDate.trim())
    if (!withDates.length) return 'No upcoming court dates are recorded.'
    return `${withDates.length} matter${withDates.length > 1 ? 's' : ''} with a court date:\n` +
      withDates.map((m) => `• ${nameOf(m)} — ${oneLine(m.nextCourtDate)}`).join('\n')
  }

  // Bare matter name → summarise it
  if (matterHit) return summariseMatter(matterHit)

  // Fallback help
  return [
    'I can answer a few things from your current agenda:',
    '• “urgent matters” — Critical/High priority',
    '• “waiting matters” — anything waiting on someone',
    '• “upcoming court dates”',
    '• “summarise <matter name>” — e.g. summarise Wang',
    'You can also drop a PDF here (parsing comes later).',
  ].join('\n')
}
