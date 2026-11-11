migrate(
  (app) => {
    const agentsCol = app.findCollectionByNameOrId('agents')

    var seedAgents = [
      {
        slug: 'market',
        name: 'Market',
        description: 'Monitora o mercado de café verde e envia insights sobre preços e tendências.',
        defaultFrequency: 'daily',
        type: 'system',
      },
      {
        slug: 'executive',
        name: 'Executive',
        description: 'Gera resumos executivos da qualidade das suas amostras e indicadores-chave.',
        defaultFrequency: 'daily',
        type: 'system',
      },
      {
        slug: 'evolution',
        name: 'Evolution',
        description:
          'Acompanha a evolução da qualidade do seu café ao longo do tempo e identifica padrões.',
        defaultFrequency: 'weekly',
        type: 'system',
      },
      {
        slug: 'alerts',
        name: 'Alerts',
        description: 'Detecta quedas de qualidade e anomalias, enviando alertas proativos.',
        defaultFrequency: 'continuous',
        type: 'system',
      },
      {
        slug: 'educator',
        name: 'Educator',
        description:
          'Envia dicas educativas sobre cultivo, secagem, fermentação e classificação de café.',
        defaultFrequency: 'weekly',
        type: 'system',
      },
      {
        slug: 'consultant',
        name: 'Consultant',
        description: 'Fornece recomendações consultivas baseadas no histórico das suas amostras.',
        defaultFrequency: 'weekly',
        type: 'system',
      },
      {
        slug: 'albert',
        name: 'Albert',
        description:
          'Assistente principal da Ceres AI. Sempre ativo para análises, dúvidas e gestão via Telegram.',
        defaultFrequency: 'continuous',
        type: 'system',
      },
    ]

    for (var i = 0; i < seedAgents.length; i++) {
      var a = seedAgents[i]
      try {
        app.findFirstRecordByData('agents', 'slug', a.slug)
      } catch (_) {
        var r = new Record(agentsCol)
        r.set('slug', a.slug)
        r.set('name', a.name)
        r.set('description', a.description)
        r.set('defaultFrequency', a.defaultFrequency)
        r.set('type', a.type)
        app.save(r)
      }
    }

    try {
      var user = app.findAuthRecordByEmail('users', $os.getenv('CERES_SEED_DEMO_EMAIL') || '__no_demo_user__')
      var albertAgent = app.findFirstRecordByData('agents', 'slug', 'albert')
      var userAgentsCol = app.findCollectionByNameOrId('user_agents')

      var existingUA = null
      try {
        existingUA = app.findFirstRecordByData('user_agents', 'user_id', user.id)
      } catch (_) {}

      var hasAlbert = false
      if (existingUA) {
        var allUAs = app.findRecordsByFilter('user_agents', "user_id = '" + user.id + "'", '', 0, 0)
        for (var j = 0; j < allUAs.length; j++) {
          if (allUAs[j].getString('agent_id') === albertAgent.id) {
            hasAlbert = true
            break
          }
        }
      }

      if (!hasAlbert) {
        var ua = new Record(userAgentsCol)
        ua.set('user_id', user.id)
        ua.set('agent_id', albertAgent.id)
        ua.set('status', true)
        ua.set('config', {})
        app.save(ua)
      }
    } catch (_) {}
  },
  (app) => {},
)
