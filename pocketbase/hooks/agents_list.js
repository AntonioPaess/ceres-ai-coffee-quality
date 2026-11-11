routerAdd(
  'GET',
  '/backend/v1/agents',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const agents = $app.findRecordsByFilter('agents', "id != ''", 'name', 0, 0)
    const agentsData = []
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i]
      agentsData.push({
        id: a.id,
        slug: a.getString('slug'),
        name: a.getString('name'),
        description: a.getString('description'),
        defaultFrequency: a.getString('defaultFrequency'),
        type: a.getString('type'),
      })
    }

    const userAgents = $app.findRecordsByFilter(
      'user_agents',
      "user_id = '" + userId + "'",
      '-created',
      0,
      0,
    )
    const userAgentsData = []
    for (let j = 0; j < userAgents.length; j++) {
      const ua = userAgents[j]
      userAgentsData.push({
        id: ua.id,
        agent_id: ua.getString('agent_id'),
        status: ua.getBool('status'),
        config: ua.get('config') || {},
        lastRun: ua.getString('lastRun'),
        nextRun: ua.getString('nextRun'),
      })
    }

    return e.json(200, { agents: agentsData, userAgents: userAgentsData })
  },
  $apis.requireAuth(),
)
