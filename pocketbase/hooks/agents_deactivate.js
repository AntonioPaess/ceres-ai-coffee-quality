routerAdd(
  'POST',
  '/backend/v1/agents/{agentId}/deactivate',
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
      return e.badRequestError('Albert não pode ser desativado')
    }

    const allUAs = $app.findRecordsByFilter('user_agents', "user_id = '" + userId + "'", '', 0, 0)
    let userAgent = null
    for (let i = 0; i < allUAs.length; i++) {
      if (allUAs[i].getString('agent_id') === agentId) {
        userAgent = allUAs[i]
        break
      }
    }

    if (!userAgent) {
      return e.json(200, { ok: true })
    }

    userAgent.set('status', false)
    $app.save(userAgent)

    try {
      const logsCol = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(logsCol)
      log.set('user_id', userId)
      log.set('actionType', 'deactivate_agent')
      log.set('toolCalled', 'deactivate_agent')
      log.set('toolResult', { agentId: agentId, agentName: agent.getString('name') })
      log.set('status', 'success')
      $app.save(log)
    } catch (_) {}

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
