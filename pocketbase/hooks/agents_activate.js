routerAdd(
  'POST',
  '/backend/v1/agents/{agentId}/activate',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const agentId = e.request.pathValue('agentId')
    let agent
    try {
      agent = $app.findRecordById('agents', agentId)
    } catch (_) {
      return e.notFoundError('agent not found')
    }

    if (agent.getString('slug') === 'albert') {
      return e.json(200, { ok: true, message: 'Albert is always active' })
    }

    const allUAs = $app.findRecordsByFilter('user_agents', "user_id = '" + userId + "'", '', 0, 0)
    let activeCount = 0
    for (let i = 0; i < allUAs.length; i++) {
      if (!allUAs[i].getBool('status')) continue
      try {
        const a = $app.findRecordById('agents', allUAs[i].getString('agent_id'))
        if (a.getString('slug') !== 'albert') activeCount++
      } catch (_) {}
    }

    if (activeCount >= 3) {
      return e.json(400, {
        error:
          'Você já possui 3 agentes ativos. Para ativar um novo agente, desative um dos atuais.',
      })
    }

    let userAgent = null
    for (let j = 0; j < allUAs.length; j++) {
      if (allUAs[j].getString('agent_id') === agentId) {
        userAgent = allUAs[j]
        break
      }
    }

    if (!userAgent) {
      const col = $app.findCollectionByNameOrId('user_agents')
      userAgent = new Record(col)
      userAgent.set('user_id', userId)
      userAgent.set('agent_id', agentId)
      userAgent.set('config', {})
    }

    userAgent.set('status', true)
    const freq = agent.getString('defaultFrequency') || 'daily'
    const now = new Date()
    let ms = 24 * 60 * 60 * 1000
    if (freq === 'weekly') ms = 7 * 24 * 60 * 60 * 1000
    if (freq === 'continuous') ms = 6 * 60 * 60 * 1000
    userAgent.set('nextRun', new Date(now.getTime() + ms).toISOString())
    $app.save(userAgent)

    try {
      const logsCol = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(logsCol)
      log.set('user_id', userId)
      log.set('actionType', 'activate_agent')
      log.set('toolCalled', 'activate_agent')
      log.set('toolResult', { agentId: agentId, agentName: agent.getString('name') })
      log.set('status', 'success')
      $app.save(log)
    } catch (_) {}

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
