routerAdd('POST', '/backend/v1/telegram-webhook', (e) => {
  // Pure validation helpers (unit-tested): _lib/action_validation.js, _lib/coffee_rules.js
  const guard = require(`${__hooks}/_lib/action_validation.js`)
  const rules = require(`${__hooks}/_lib/coffee_rules.js`)

  const botToken = $secrets.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return e.json(200, { ok: false, error: 'No token' })

  // 1) Origin check: Telegram echoes the `secret_token` given to setWebhook in this header.
  //    Fail closed when TELEGRAM_WEBHOOK_SECRET is not configured (see docs/SECURITY.md).
  const headerSecret = e.request.header.get('X-Telegram-Bot-Api-Secret-Token') || ''
  const allowUnauth = $secrets.get('TELEGRAM_WEBHOOK_ALLOW_UNAUTHENTICATED') === 'true'
  if (!guard.checkWebhookSecret($secrets.get('TELEGRAM_WEBHOOK_SECRET'), headerSecret, allowUnauth)) {
    $app.logger().warn('Telegram webhook rejected: invalid or missing secret token')
    return e.json(401, { ok: false })
  }

  const body = e.requestInfo().body || {}

  // 2) Structural validation (only private chats, bounded text, numeric update_id).
  const upd = guard.validateTelegramUpdate(body)
  if (!upd.ok) return e.json(200, { ok: true })

  // 3) Idempotency: ignore re-deliveries of the same update_id (unique index).
  try {
    const dupCol = $app.findCollectionByNameOrId('telegram_updates')
    const dup = new Record(dupCol)
    dup.set('updateId', String(upd.updateId))
    $app.save(dup)
  } catch (err) {
    const msg = String(err && err.message ? err.message : err)
    if (msg.toLowerCase().indexOf('unique') >= 0 || msg.toLowerCase().indexOf('already') >= 0) {
      return e.json(200, { ok: true, duplicate: true })
    }
    $app.logger().error('telegram_updates dedup failure', 'err', msg)
  }

  const formatToHtml = (text) => {
    let h = text
    h = h.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    h = h.replace(/^###\s+(.+)$/gm, '📌 <b>$1</b>')
    h = h.replace(/^##\s+(.+)$/gm, '📋 <b>$1</b>')
    h = h.replace(/^#\s+(.+)$/gm, '📊 <b>$1</b>')
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    h = h.replace(/^\|[\s\-:|]+\|$/gm, '')
    h = h.replace(
      /^\|(.+)\|$/gm,
      (m, c) =>
        '• ' +
        c
          .split('|')
          .map((x) => x.trim())
          .filter((x) => x)
          .join(' — '),
    )
    h = h.replace(/^[-*]\s+(.+)$/gm, '• $1')
    h = h.replace(/\n{3,}/g, '\n\n')
    return h.trim()
  }

  const sendMsg = (chatId, text, replyMarkup) => {
    try {
      const formatted = formatToHtml(text)
      const maxLen = 3500
      const lines = formatted.split('\n')
      let current = ''
      for (let i = 0; i < lines.length; i++) {
        if ((current + '\n' + lines[i]).length > maxLen) {
          if (current) {
            $http.send({
              url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: current.trim(), parse_mode: 'HTML' }),
            })
          }
          current = lines[i]
        } else {
          current = current ? current + '\n' + lines[i] : lines[i]
        }
      }
      if (current) {
        const payload = { chat_id: chatId, text: current.trim(), parse_mode: 'HTML' }
        if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup)
        $http.send({
          url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
    } catch (err) {
      $app.logger().error('Telegram send error', 'err', err.message)
    }
  }

  const answerCb = (callbackId) => {
    try {
      $http.send({
        url: 'https://api.telegram.org/bot' + botToken + '/answerCallbackQuery',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId }),
      })
    } catch (err) {
      $app.logger().error('Erro ao enviar mensagem Telegram', 'err', err.message)
    }
  }

  const sendTyping = (chatId) => {
    try {
      $http.send({
        url: 'https://api.telegram.org/bot' + botToken + '/sendChatAction',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      })
    } catch (err) {
      $app.logger().error('Erro ao enviar mensagem Telegram', 'err', err.message)
    }
  }

  const getFrontendUrl = () => {
    let url = $secrets.get('SITE_URL') || 'https://ceres-ai-cafe-87c6b.goskip.app'
    if (url.endsWith('/')) url = url.slice(0, -1)
    return url
  }

  const extractWeight = (text) => {
    if (!text) return 0
    let match = text.match(/(\d+)\s*(kg|g|gramas?)\b/i)
    if (match) {
      const num = parseInt(match[1], 10)
      if (match[2].toLowerCase().indexOf('kg') === 0) return num * 1000
      return num
    }
    match = text.match(/^\s*(\d{2,5})\s*$/)
    if (match) return parseInt(match[1], 10)
    return 0
  }

  const extractVariety = (text) => {
    if (!text) return null
    const lower = text.toLowerCase()
    if (lower.indexOf('arábica') >= 0 || lower.indexOf('arabica') >= 0) return 'arabica'
    if (lower.indexOf('robusta') >= 0 || lower.indexOf('conilon') >= 0) return 'robusta'
    return null
  }

  const varietyLabel = (v) => {
    if (v === 'arabica') return 'Arábica'
    if (v === 'robusta') return 'Robusta (Conilon)'
    return 'Misto'
  }

  const extractAction = (text) => {
    if (!text) return { action: null, content: text || '' }
    const marker = '__ACTION__'
    const markerIndex = text.indexOf(marker)
    if (markerIndex === -1) return { action: null, content: text }
    const afterMarker = text.substring(markerIndex + marker.length)
    const firstBrace = afterMarker.indexOf('{')
    if (firstBrace === -1) return { action: null, content: text }
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace === -1 || lastBrace < markerIndex + marker.length + firstBrace) {
      return { action: null, content: text }
    }
    const jsonStr = text.substring(markerIndex + marker.length + firstBrace, lastBrace + 1)
    let action = null
    try {
      action = JSON.parse(jsonStr)
    } catch (err) {
      $app.logger().error('Erro ao fazer parse da Ação', 'err', err.message, 'json', jsonStr)
      const beforeAction = text.substring(0, markerIndex).trim()
      const afterAction = text
        .substring(lastBrace + 1)
        .replace(/^_+/, '')
        .trim()
      const cleanContent = (beforeAction + ' ' + afterAction).trim()
      return { action: null, content: cleanContent }
    }
    const beforeAction = text.substring(0, markerIndex).trim()
    const afterAction = text
      .substring(lastBrace + 1)
      .replace(/^_+/, '')
      .trim()
    const content = (beforeAction + ' ' + afterAction).trim()
    return { action, content }
  }

  const varietyKeyboard = {
    inline_keyboard: [
      [
        { text: '🟢 Arábica', callback_data: 'variety_arabica' },
        { text: '🟤 Robusta', callback_data: 'variety_robusta' },
        { text: '❓ Não sei', callback_data: 'variety_unknown' },
      ],
    ],
  }

  const downloadTelegramPhoto = (fileId) => {
    let filePath = ''
    try {
      const fileRes = $http.send({
        url: 'https://api.telegram.org/bot' + botToken + '/getFile?file_id=' + encodeURIComponent(fileId),
        method: 'GET',
        timeout: 15,
      })
      if (fileRes.statusCode === 200 && fileRes.json && fileRes.json.result) {
        filePath = fileRes.json.result.file_path || ''
      }
    } catch (err) {
      $app.logger().error('Failed to get Telegram file path', 'err', rules.redactSecrets(err.message))
      return null
    }
    if (!filePath) return null
    const imageUrl = 'https://api.telegram.org/file/bot' + botToken + '/' + filePath
    try {
      return $filesystem.fileFromURL(imageUrl, 30)
    } catch (err) {
      $app.logger().error('Failed to download Telegram image', 'err', rules.redactSecrets(err.message))
      return null
    }
  }

  const logAction = (userId, actionType, toolCalled, toolResult, status) => {
    try {
      const logsCol = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(logsCol)
      log.set('user_id', userId)
      log.set('actionType', actionType)
      log.set('toolCalled', toolCalled)
      log.set('toolResult', toolResult)
      log.set('status', status)
      $app.save(log)
    } catch (err) {
      $app.logger().error('Failed to log action', 'err', err.message)
    }
  }

  const executePendingAction = (session, user, chatId, pa) => {
    // Deterministic gate: the LLM only *proposes*; the backend validates shape, TTL and fields.
    const check = guard.validateAction(pa)
    if (!check.ok || guard.isPendingExpired(pa, Date.now())) {
      logAction(user.id, 'rejected_action', String(pa && pa.type), { reason: check.error || 'expired' }, 'rejected')
      sendMsg(chatId, 'Não foi possível validar essa operação (inválida ou expirada). Peça novamente.')
      session.set('pendingAction', '')
      $app.save(session)
      return
    }
    const actionType = pa.type
    let targetId = pa.targetId
    const targetLabel = typeof pa.targetLabel === 'string' ? pa.targetLabel : ''

    if (actionType === 'delete_all') {
      try {
        const allSamples = $app.findRecordsByFilter(
          'samples',
          "user_id = '" + user.id + "'",
          '',
          0,
          0,
        )
        for (let i = 0; i < allSamples.length; i++) {
          $app.delete(allSamples[i])
        }
        logAction(
          user.id,
          'delete_all',
          'delete_all_samples',
          { count: allSamples.length },
          'success',
        )
        sendMsg(chatId, '✅ Todas as tuas amostras foram excluídas com sucesso do inventário.')
      } catch (err) {
        $app.logger().error('delete_all error', 'err', err.message)
        sendMsg(chatId, 'Erro ao excluir as amostras. Tente novamente.')
      }
      session.set('pendingAction', '')
      $app.save(session)
      return
    }

    if (targetId && /^[a-zA-Z0-9]{15}$/.test(targetId)) {
      try {
        const record = $app.findRecordById('samples', targetId)
        if (record.getString('user_id') !== user.id) {
          targetId = null
        }
      } catch (err) {
        $app.logger().error('Erro ao buscar amostra por ID', 'err', err.message)
        targetId = null
      }
    } else {
      targetId = null
    }

    if (!targetId) {
      if (targetLabel) {
        try {
          const userSamples = $app.findRecordsByFilter(
            'samples',
            "user_id = '" + user.id + "'",
            '-created',
            0,
            0,
          )
          for (let i = 0; i < userSamples.length; i++) {
            if (userSamples[i].getString('name').toLowerCase() === targetLabel.toLowerCase()) {
              targetId = userSamples[i].id
              break
            }
          }
          if (!targetId) {
            for (let i = 0; i < userSamples.length; i++) {
              const sName = userSamples[i].getString('name').toLowerCase()
              if (
                sName.indexOf(targetLabel.toLowerCase()) >= 0 ||
                targetLabel.toLowerCase().indexOf(sName) >= 0
              ) {
                targetId = userSamples[i].id
                break
              }
            }
          }
        } catch (err) {
          $app.logger().error('Erro ao gerenciar sessão', 'err', err.message)
        }
      }

      if (!targetId) {
        sendMsg(
          chatId,
          'Erro: Não consegui identificar a amostra a partir da nossa conversa. Pode repetir o nome exato do lote que deseja editar?',
        )
        session.set('pendingAction', '')
        $app.save(session)
        return
      }
    }

    try {
      if (actionType === 'delete') {
        const sample = $app.findRecordById('samples', targetId)
        if (sample.getString('user_id') !== user.id) {
          sendMsg(chatId, 'Erro: você não tem permissão para excluir esta amostra.')
        } else {
          $app.delete(sample)
          logAction(
            user.id,
            'delete',
            'delete_sample',
            { sampleId: targetId, name: targetLabel },
            'success',
          )
          sendMsg(chatId, '✅ Amostra "' + targetLabel + '" excluída com sucesso!')
        }
      } else if (actionType === 'update') {
        const sample = $app.findRecordById('samples', targetId)
        if (sample.getString('user_id') !== user.id) {
          sendMsg(chatId, 'Erro: você não tem permissão para editar esta amostra.')
        } else {
          const changes = check.changes // whitelisted: name, variety, weight, price only
          const keys = Object.keys(changes)
          for (let i = 0; i < keys.length; i++) {
            sample.set(keys[i], changes[keys[i]])
          }
          $app.save(sample)
          logAction(
            user.id,
            'update',
            'update_sample',
            { sampleId: targetId, changes: changes },
            'success',
          )
          sendMsg(chatId, '✅ Amostra "' + targetLabel + '" atualizada com sucesso!')
        }
      }
    } catch (err) {
      $app.logger().error('Pending action error', 'err', err.message)
      sendMsg(chatId, 'Erro ao executar a ação. Tente novamente.')
    }

    session.set('pendingAction', '')
    $app.save(session)
  }

  const handleAgentAction = (actionData, userId, chatId, session) => {
    const slug = actionData.agentSlug
    if (actionData.type === 'activate_agent') {
      try {
        const agent = $app.findFirstRecordByData('agents', 'slug', slug)
        if (agent.getString('slug') === 'albert') {
          sendMsg(chatId, 'Albert está sempre ativo!')
          return
        }
        const allUAs = $app.findRecordsByFilter(
          'user_agents',
          "user_id = '" + userId + "'",
          '',
          0,
          0,
        )
        let activeCount = 0
        let existing = null
        for (let i = 0; i < allUAs.length; i++) {
          if (allUAs[i].getString('agent_id') === agent.id) existing = allUAs[i]
          if (allUAs[i].getBool('status')) {
            try {
              const a = $app.findRecordById('agents', allUAs[i].getString('agent_id'))
              if (a.getString('slug') !== 'albert') activeCount++
            } catch (err) {
              $app.logger().error('Erro na execução do agente', 'err', err.message)
            }
          }
        }
        if (activeCount >= 3) {
          sendMsg(
            chatId,
            'Você já possui 3 agentes ativos. Para ativar um novo, desative um dos atuais.',
          )
          return
        }
        if (!existing) {
          const col = $app.findCollectionByNameOrId('user_agents')
          existing = new Record(col)
          existing.set('user_id', userId)
          existing.set('agent_id', agent.id)
          existing.set('config', {})
        }
        existing.set('status', true)
        const freq = agent.getString('defaultFrequency') || 'daily'
        const now = new Date()
        let ms = 24 * 60 * 60 * 1000
        if (freq === 'weekly') ms = 7 * 24 * 60 * 60 * 1000
        if (freq === 'continuous') ms = 6 * 60 * 60 * 1000
        existing.set('nextRun', new Date(now.getTime() + ms).toISOString())
        $app.save(existing)
        logAction(userId, 'activate_agent', 'activate_agent', { agentSlug: slug }, 'success')
        sendMsg(chatId, '✅ Agente "' + agent.getString('name') + '" ativado!')
      } catch (err) {
        $app.logger().error('Erro na execução do agente', 'err', err.message)
        sendMsg(chatId, 'Agente não encontrado.')
      }
    } else if (actionData.type === 'deactivate_agent') {
      try {
        const agent = $app.findFirstRecordByData('agents', 'slug', slug)
        if (agent.getString('slug') === 'albert') {
          sendMsg(chatId, 'Albert não pode ser desativado.')
          return
        }
        const allUAs = $app.findRecordsByFilter(
          'user_agents',
          "user_id = '" + userId + "'",
          '',
          0,
          0,
        )
        for (let i = 0; i < allUAs.length; i++) {
          if (allUAs[i].getString('agent_id') === agent.id) {
            allUAs[i].set('status', false)
            $app.save(allUAs[i])
            logAction(
              userId,
              'deactivate_agent',
              'deactivate_agent',
              { agentSlug: slug },
              'success',
            )
            sendMsg(chatId, '✅ Agente "' + agent.getString('name') + '" desativado!')
            return
          }
        }
        sendMsg(chatId, 'Agente não estava ativo.')
      } catch (err) {
        $app.logger().error('Erro na execução do agente', 'err', err.message)
        sendMsg(chatId, 'Agente não encontrado.')
      }
    }
  }

  const chatWithAlbert = (uid, message, chatId, showVarietyKeyboard, session) => {
    try {
      const lowerMsg = message.toLowerCase()

      const marketKeywords = [
        'preço',
        'preco',
        'cotação',
        'cotacao',
        'valor do café',
        'valor do cafe',
        'valor',
        'kg',
        'mercado',
        'saca',
        'dólar',
        'dolar',
      ]
      const weatherKeywords = [
        'geada',
        'seca',
        'chuva',
        'clima',
        'temperatura',
        'tempo',
        'frio',
        'calor',
        'previsão',
        'previsao',
        'tempo agora',
        'como está o tempo',
        'clima agora',
        'vento',
        'uv',
        'umidade',
        'humidade',
        'pressão',
        'pressao',
        'sensação',
        'sensacao',
        'dados',
        'semana',
      ]

      const hasMarketIntent = marketKeywords.some(function (kw) {
        return lowerMsg.indexOf(kw) >= 0
      })
      const hasWeatherIntent = weatherKeywords.some(function (kw) {
        return lowerMsg.indexOf(kw) >= 0
      })
      const locationKeywords = [
        'minha cidade',
        'minha localiza',
        'onde estou',
        'qual a minha cidade',
        'meu endere',
      ]
      const hasLocationIntent = locationKeywords.some(function (kw) {
        return lowerMsg.indexOf(kw) >= 0
      })

      let enhancedMessage = message
      let contextPrefix = ''

      try {
        const userSamples = $app.findRecordsByFilter(
          'samples',
          "user_id = '" + uid + "'",
          '-created',
          15,
          0,
        )
        if (userSamples && userSamples.length > 0) {
          let samplesList = ''
          for (let i = 0; i < userSamples.length; i++) {
            const s = userSamples[i]
            const sName = s.getString('name') || ''
            const sId = s.id || ''
            const sVariety = s.getString('variety') || 'misto'
            const sWeight = s.get('weight') || 0
            const sScore = s.getInt('score')
            const sPriceRaw = s.get('price')
            const sPrice = typeof sPriceRaw === 'number' ? sPriceRaw : 0
            const sCreated = s.getString('created') || ''
            const sDate = sCreated ? sCreated.substring(0, 10) : ''
            samplesList +=
              '- ID Interno: ' +
              sId +
              ' | Nome: ' +
              sName +
              ' | Variedade: ' +
              sVariety +
              ' | Peso: ' +
              sWeight +
              'g' +
              ' | Nota: ' +
              sScore +
              ' | Preço/kg: R$ ' +
              sPrice.toFixed(2) +
              ' | Data: ' +
              sDate +
              '\n'
          }
          contextPrefix += '[INVENTÁRIO DE AMOSTRAS DO USUÁRIO]\n'
          contextPrefix +=
            'Aqui estão as últimas amostras cadastradas (usa SEMPRE estes dados para responder, não inventes):\n'
          contextPrefix += samplesList
          contextPrefix += '[FIM DO INVENTÁRIO]\n\n'
        } else {
          contextPrefix += '[INVENTÁRIO DE AMOSTRAS DO USUÁRIO]\n'
          contextPrefix += 'O utilizador não tem nenhuma amostra cadastrada no momento.\n'
          contextPrefix += '[FIM DO INVENTÁRIO]\n\n'
        }
      } catch (err) {
        $app.logger().error('Erro ao buscar amostras para contexto', 'err', err.message)
      }

      if (hasMarketIntent) {
        const instUrl = $secrets.get('PB_INSTANCE_URL')
        const suToken = $secrets.get('PB_SUPERUSER_TOKEN')
        if (instUrl && suToken) {
          try {
            const marketRes = $http.send({
              url: instUrl + '/backend/v1/albert/market',
              method: 'GET',
              headers: { Authorization: suToken },
              timeout: 30,
            })
            if (marketRes.statusCode === 200 && marketRes.json && marketRes.json.available) {
              const m = marketRes.json
              const usdPerLb = m.usdPerLb || 0
              const usdBrl = m.usdBrl || 0
              const showUsd = usdPerLb > 0 && usdBrl > 0
              var sacaPrice = m.brlPer60kg || 0
              var kgPrice = m.brlPerKg || (sacaPrice > 0 ? sacaPrice / 60 : 0)
              if (kgPrice > 500) {
                sacaPrice = kgPrice
                kgPrice = sacaPrice / 60
              }
              contextPrefix += '[DADOS DE MERCADO ATUALIZADOS]\n'
              contextPrefix +=
                '- Preço de referência: R$ ' + sacaPrice.toFixed(2) + ' por saca de 60kg\n'
              contextPrefix += '- Equivalente: R$ ' + kgPrice.toFixed(2) + '/kg\n'
              if (showUsd) {
                contextPrefix += '- Índice global: US$ ' + usdPerLb.toFixed(2) + '/lb\n'
                contextPrefix += '- Cotação do dólar: R$ ' + usdBrl.toFixed(2) + '\n'
              }
              contextPrefix += '- Data do índice: ' + (m.date || '') + '\n'
              contextPrefix += '[REGRAS DE CLASSIFICAÇÃO DE PREÇO - OBRIGATÓRIO]\n'
              contextPrefix +=
                '- Para responder a perguntas de cotação ou preço, é OBRIGATÓRIO exibir uma tabela ou lista com os preços por kg e por saca para todas as classificações:\n'
              contextPrefix += '- Grade A (10% acima): Preço kg e Saca\n'
              contextPrefix += '- Grade B (Referência, 0%): Preço kg e Saca\n'
              contextPrefix += '- Grade C (10% abaixo): Preço kg e Saca\n'
              contextPrefix += '- Grade D (30% abaixo): Preço kg e Saca\n'
              contextPrefix += '[FIM DAS REGRAS]\n'
              contextPrefix += '[FIM DOS DADOS DE MERCADO]\n\n'
            }
          } catch (err) {
            $app.logger().error('Erro na execução do agente', 'err', err.message)
          }
        }
      }

      if (hasLocationIntent || hasWeatherIntent) {
        let ctxUser = null
        try {
          ctxUser = $app.findRecordById('users', uid)
        } catch (err) {
          $app.logger().error('Erro na execução do agente', 'err', err.message)
        }

        const userCity = ctxUser ? ctxUser.getString('cityName') : ''

        if (userCity) {
          contextPrefix +=
            '[DADOS DO USUÁRIO] A cidade atual cadastrada do usuário é: ' + userCity + '. '
          contextPrefix +=
            'Se ele perguntar qual é a sua cidade ou localização, responda com este nome e diga que pode ser alterado nas Configurações da plataforma web. '
          contextPrefix += '[FIM DOS DADOS]\n\n'
        } else {
          contextPrefix +=
            '[DADOS DO USUÁRIO] O usuário não tem nenhuma cidade cadastrada. Diga para ele atualizar o perfil nas Configurações da plataforma web. [FIM DOS DADOS]\n\n'
        }
      }

      if (hasWeatherIntent || hasLocationIntent) {
        let weatherUser = null
        try {
          weatherUser = $app.findRecordById('users', uid)
        } catch (err) {
          $app.logger().error('Erro na execução do agente', 'err', err.message)
        }

        const lat = weatherUser ? weatherUser.getString('latitude') : ''
        const lon = weatherUser ? weatherUser.getString('longitude') : ''

        if (!lat || !lon) {
          contextPrefix += '[AVISO DE LOCALIZAÇÃO]\n'
          contextPrefix += 'O usuário perguntou sobre clima, mas não tem localização cadastrada. '
          contextPrefix += 'Oriente-o a atualizar o perfil com sua cidade em Configurações.\n'
          contextPrefix += '[FIM DO AVISO]\n\n'
        } else {
          try {
            const wRes = $http.send({
              url:
                'https://api.open-meteo.com/v1/forecast?latitude=' +
                lat +
                '&longitude=' +
                lon +
                '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,uv_index,weather_code' +
                '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max&timezone=America/Sao_Paulo&forecast_days=3',
              method: 'GET',
              timeout: 10,
            })
            var c = null
            var w = null
            if (wRes.statusCode === 200 && wRes.json) {
              c = wRes.json.current
              w = wRes.json.daily
            } else {
              var fbToday = new Date()
              var fbDates = []
              for (var fd = 0; fd < 3; fd++) {
                var fdt = new Date(fbToday.getTime() + fd * 24 * 60 * 60 * 1000)
                fbDates.push(fdt.toISOString().substring(0, 10))
              }
              c = {
                temperature_2m: 23,
                relative_humidity_2m: 60,
                apparent_temperature: 24,
                precipitation: 0,
                surface_pressure: 1013,
                wind_speed_10m: 12,
                uv_index: 6,
                weather_code: 2,
              }
              w = {
                time: fbDates,
                temperature_2m_min: [16, 15, 17],
                temperature_2m_max: [29, 28, 30],
                precipitation_sum: [0, 1.5, 3],
                weather_code: [1, 61, 63],
                wind_speed_10m_max: [15, 18, 20],
                uv_index_max: [8, 7, 6],
              }
              contextPrefix +=
                '[AVISO: Dados meteorológicos de fallback - taxa de requisicoes excedida]\n'
            }
            if (c || w) {
              contextPrefix += '[DADOS METEOROLÓGICOS ATUALIZADOS]\n'
              if (c) {
                contextPrefix += '[CLIMA ATUAL]\n'
                contextPrefix +=
                  '- Temperatura atual: ' +
                  (c.temperature_2m !== undefined ? c.temperature_2m : 'N/A') +
                  '°C\n'
                contextPrefix +=
                  '- Sensação térmica: ' +
                  (c.apparent_temperature !== undefined ? c.apparent_temperature : 'N/A') +
                  '°C\n'
                contextPrefix +=
                  '- Humidade relativa: ' +
                  (c.relative_humidity_2m !== undefined ? c.relative_humidity_2m : 'N/A') +
                  '%\n'
                contextPrefix +=
                  '- Precipitação: ' +
                  (c.precipitation !== undefined ? c.precipitation : 'N/A') +
                  'mm\n'
                contextPrefix +=
                  '- Pressão atmosférica: ' +
                  (c.surface_pressure !== undefined ? c.surface_pressure : 'N/A') +
                  ' hPa\n'
                contextPrefix +=
                  '- Velocidade do vento: ' +
                  (c.wind_speed_10m !== undefined ? c.wind_speed_10m : 'N/A') +
                  ' km/h\n'
                contextPrefix +=
                  '- Índice UV: ' + (c.uv_index !== undefined ? c.uv_index : 'N/A') + '\n'
                contextPrefix += '[FIM DO CLIMA ATUAL]\n'
              }
              if (w && w.time) {
                for (let d = 0; d < w.time.length; d++) {
                  contextPrefix +=
                    '- ' +
                    w.time[d] +
                    ': mínima ' +
                    (w.temperature_2m_min ? w.temperature_2m_min[d] : 'N/A') +
                    '°C'
                  if (w.temperature_2m_max)
                    contextPrefix += ', máxima ' + w.temperature_2m_max[d] + '°C'
                  if (w.precipitation_sum)
                    contextPrefix += ', precipitação ' + w.precipitation_sum[d] + 'mm'
                  contextPrefix += '\n'
                }
              }
              var frostRisk = false
              var droughtRisk = false
              var highWindRisk = false
              var extremeUVRisk = false
              if (w && w.temperature_2m_min) {
                for (let d = 0; d < w.temperature_2m_min.length; d++) {
                  if (w.temperature_2m_min[d] <= 5) frostRisk = true
                }
              }
              if (w && w.precipitation_sum) {
                for (let d = 0; d < w.precipitation_sum.length; d++) {
                  if (w.precipitation_sum[d] < 1) droughtRisk = true
                }
              }
              if (c && c.wind_speed_10m >= 30) highWindRisk = true
              if (c && c.uv_index >= 8) extremeUVRisk = true
              contextPrefix += '- Risco de geada: ' + (frostRisk ? 'SIM' : 'Não') + '\n'
              contextPrefix += '- Risco de seca: ' + (droughtRisk ? 'SIM' : 'Não') + '\n'
              contextPrefix += '- Risco de vento forte: ' + (highWindRisk ? 'SIM' : 'Não') + '\n'
              contextPrefix += '- Risco de UV extremo: ' + (extremeUVRisk ? 'SIM' : 'Não') + '\n'
              contextPrefix += '[FIM DOS DADOS METEOROLÓGICOS]\n\n'
            }
          } catch (err) {
            $app.logger().error('Erro na execução do agente', 'err', err.message)
          }
        }
      }

      if (contextPrefix) {
        enhancedMessage = contextPrefix + message
      }

      const existingConvId = session.getString('conversationId') || ''
      const result = $ai.agent('albert').chat({
        user_id: uid,
        conversation_id: existingConvId || null,
        message: enhancedMessage,
      })
      if (!existingConvId && result.conversation_id) {
        session.set('conversationId', result.conversation_id)
        $app.save(session)
      }

      const { action: actionData, content: cleanContent } = extractAction(result.content)
      if (actionData) {
        if (actionData.type === 'activate_agent' || actionData.type === 'deactivate_agent') {
          handleAgentAction(actionData, uid, chatId, session)
          return
        }
        if (
          (actionData.type === 'delete' || actionData.type === 'update') &&
          !actionData.targetLabel &&
          !actionData.targetId
        ) {
          sendMsg(
            chatId,
            'Desculpe, não consegui identificar qual a amostra que pretendes alterar. Podes dizer-me o nome exato do lote?',
          )
          return
        }
        const proposed = guard.validateAction(actionData)
        if (!proposed.ok) {
          $app.logger().warn('Rejected malformed Albert action', 'reason', proposed.error)
          sendMsg(chatId, 'Não consegui validar essa operação com segurança. Pode reformular o pedido?')
          return
        }
        actionData.attempts = 0
        actionData.createdAt = new Date().toISOString()
        session.set('pendingAction', JSON.stringify(actionData))
        $app.save(session)
        const label =
          actionData.type === 'delete' || actionData.type === 'delete_all'
            ? 'exclusão'
            : 'atualização'
        sendMsg(
          chatId,
          'Confirma ' +
            label +
            ' de "' +
            (actionData.targetLabel || '') +
            '"? Responda sim ou não.',
        )
        return
      }
      if (showVarietyKeyboard) {
        sendMsg(chatId, cleanContent, varietyKeyboard)
      } else {
        sendMsg(chatId, cleanContent)
      }
    } catch (err) {
      $app.logger().error('Albert chat error', 'err', err.message)
      if (showVarietyKeyboard) {
        sendMsg(chatId, 'Não entendi. Qual a variedade do seu café?', varietyKeyboard)
      } else {
        sendMsg(
          chatId,
          'Olá! Envie uma foto do seu café para análise, ou me pergunte sobre café, defeitos ou classificações.',
        )
      }
    }
  }

  const performAnalysis = (session, user, chatId) => {
    const fileId = session.getString('tempPhotoFileId')
    const weight = session.get('tempWeight') || 0
    const variety = session.getString('tempVariety') || 'misto'

    if (!fileId) {
      sendMsg(chatId, 'Erro: nenhuma foto encontrada. Envie uma foto do seu café.')
      session.set('currentStep', 'idle')
      $app.save(session)
      return
    }

    const fileObj = downloadTelegramPhoto(fileId)
    if (fileObj && fileObj.size > guard.MAX_PHOTO_BYTES) {
      sendMsg(chatId, 'A imagem excede o limite de 10 MB. Envie uma foto menor.')
      session.set('currentStep', 'idle')
      $app.save(session)
      return
    }
    if (!fileObj) {
      sendMsg(chatId, 'Erro ao baixar a imagem. Tente enviar a foto novamente.')
      session.set('currentStep', 'idle')
      $app.save(session)
      return
    }

    sendMsg(chatId, '🔍 Analisando sua amostra com IA...')

    try {
      const samplesCol = $app.findCollectionByNameOrId('samples')
      const s = new Record(samplesCol)
      s.set('user_id', user.id)
      s.set('name', session.getString('tempName') || 'Amostra Telegram')
      s.set('variety', variety)
      if (weight > 0) s.set('weight', weight)
      s.set('image', fileObj)
      $app.save(s)

      const updated = $app.findRecordById('samples', s.id)
      const score = updated.getInt('score')
      const grade = updated.getString('grade')
      let priceVal = updated.get('price')
      if (typeof priceVal !== 'number') priceVal = 0
      const price = priceVal
      let defects = updated.get('defects')
      if (typeof defects === 'string') {
        try {
          defects = JSON.parse(defects)
        } catch (_) {
          defects = null
        }
      }

      let analysisContext = 'A análise da amostra foi concluída:\n'
      analysisContext += '- Nota: ' + score + '/100\n'
      analysisContext += '- Classificação: ' + grade + '\n'
      analysisContext +=
        '- Preço Sugerido: R$ ' +
        price.toFixed(2) +
        '/kg (R$ ' +
        (price * 60).toFixed(2) +
        '/saca)\n'
      if (defects && defects.categories && Array.isArray(defects.categories)) {
        const detected = defects.categories.filter((c) => c.count > 0)
        if (detected.length > 0) {
          analysisContext += '- Defeitos: '
          for (let i = 0; i < detected.length; i++) {
            analysisContext += detected[i].label + ' (' + detected[i].count + ')'
            if (i < detected.length - 1) analysisContext += ', '
          }
          analysisContext += '\n- Total: ' + (defects.totalDefects || 0) + '\n'
        } else {
          analysisContext += '- Nenhum defeito detectado\n'
        }
      }
      analysisContext += '- Laudo: ' + getFrontendUrl() + '/producer/report/' + s.id + '\n'
      analysisContext +=
        '\nApresente os resultados naturalmente. Inclua o link do laudo e uma dica baseada na nota.'

      try {
        const existingConvId = session.getString('conversationId') || ''
        const result = $ai.agent('albert').chat({
          user_id: user.id,
          conversation_id: existingConvId || null,
          message: analysisContext,
        })
        if (!existingConvId && result.conversation_id) {
          session.set('conversationId', result.conversation_id)
          $app.save(session)
        }
        const presParsed = extractAction(result.content)
        sendMsg(chatId, presParsed.content || 'Análise concluída!')
      } catch (aiErr) {
        $app.logger().error('Albert presentation error', 'err', aiErr.message)
        let msg = '✅ Análise concluída!\n\n📊 Nota: ' + score + '/100\n'
        msg +=
          '🏆 Classificação: ' +
          grade +
          '\n💰 Preço Sugerido: R$ ' +
          price.toFixed(2) +
          '/kg (R$ ' +
          (price * 60).toFixed(2) +
          '/saca)\n'
        msg += '\n📄 Laudo: ' + getFrontendUrl() + '/producer/report/' + s.id
        sendMsg(chatId, msg)
      }

      session.set('currentStep', 'idle')
      session.set('currentAnalysisId', s.id)
      session.set('tempPhotoFileId', '')
      session.set('tempName', '')
      session.set('tempWeight', 0)
      session.set('tempVariety', '')
      $app.save(session)
    } catch (err) {
      $app.logger().error('Failed to create sample from Telegram', 'err', err.message)
      sendMsg(chatId, 'Erro ao criar a amostra. Tente novamente.')
      session.set('currentStep', 'idle')
      $app.save(session)
    }
  }

  if (body.callback_query) {
    const cq = body.callback_query
    const cbChatId = cq.message ? cq.message.chat.id : null
    const cbData = cq.data || ''
    answerCb(cq.id)
    if (!cbChatId) return e.json(200, { ok: true })

    let cbUser = null
    try {
      cbUser = $app.findFirstRecordByData('users', 'telegramChatId', String(cbChatId))
    } catch (_) {
      sendMsg(cbChatId, 'Sua conta não está vinculada. Acesse a plataforma Ceres AI para conectar.')
      return e.json(200, { ok: true })
    }

    let cbSession = null
    try {
      cbSession = $app.findFirstRecordByData('sessions', 'chatId', String(cbChatId))
    } catch (err) {
      $app.logger().error('Erro ao gerenciar sessão', 'err', err.message)
      return e.json(200, { ok: true })
    }

    if (cbData.indexOf('variety_') === 0) {
      const v = cbData.replace('variety_', '')
      const mappedV = v === 'unknown' ? 'misto' : v
      cbSession.set('tempVariety', mappedV)
      const hasPhoto = cbSession.getString('tempPhotoFileId') !== ''
      const hasWeight = cbSession.get('tempWeight') > 0
      const hasName = cbSession.getString('tempName') !== ''
      if (hasPhoto && hasWeight && hasName) {
        cbSession.set('currentStep', 'analyzing')
        $app.save(cbSession)
        sendTyping(cbChatId)
        performAnalysis(cbSession, cbUser, cbChatId)
      } else {
        $app.save(cbSession)
        let cbMsg = 'O usuário selecionou a variedade ' + varietyLabel(mappedV) + '. '
        if (!hasName) cbMsg += 'Ainda falta o nome da amostra. Pergunte naturalmente. '
        if (!hasWeight) cbMsg += 'Ainda falta o peso em gramas. Pergunte naturalmente.'
        sendTyping(cbChatId)
        chatWithAlbert(cbUser.id, cbMsg, cbChatId, false, cbSession)
      }
    }
    return e.json(200, { ok: true })
  }

  const msg = body.message
  if (!msg) return e.json(200, { ok: true })

  const chatId = msg.chat.id
  const text = (msg.text || msg.caption || '').trim()

  let user = null
  try {
    user = $app.findFirstRecordByData('users', 'telegramChatId', String(chatId))
  } catch (_) {
    if (text.indexOf('/start') === 0) {
      const parts = text.split(' ')
      if (parts.length > 1) {
        const tokenValue = parts[1]
        try {
          const tokenRecord = $app.findFirstRecordByData('connection_tokens', 'token', tokenValue)
          if (tokenRecord.getBool('used')) {
            sendMsg(chatId, 'Este link já foi utilizado. Gere um novo na plataforma.')
            return e.json(200, { ok: true })
          }
          const expiresAt = new Date(tokenRecord.getString('expiresAt'))
          if (new Date() > expiresAt) {
            sendMsg(chatId, 'Este link expirou. Gere um novo na plataforma.')
            return e.json(200, { ok: true })
          }
          const u = $app.findRecordById('users', tokenRecord.getString('user_id'))
          u.set('telegramChatId', String(chatId))
          $app.save(u)
          tokenRecord.set('used', true)
          $app.save(tokenRecord)
          sendMsg(chatId, 'Conta conectada com sucesso! 🎉')
          return e.json(200, { ok: true })
        } catch (err) {
          $app.logger().error('Erro ao gerenciar sessão', 'err', err.message)
          sendMsg(chatId, 'Link inválido. Acesse a plataforma Ceres AI para gerar um novo link.')
          return e.json(200, { ok: true })
        }
      }
    }
    sendMsg(
      chatId,
      'Bem-vindo ao Ceres AI! 🌱\n\nAcesse a plataforma e clique em "Conversar com Albert" para vincular sua conta.',
    )
    return e.json(200, { ok: true })
  }

  let session = null
  try {
    session = $app.findFirstRecordByData('sessions', 'chatId', String(chatId))
  } catch (err) {
    $app.logger().error('Erro ao gerenciar sessão', 'err', err.message)
    const sessionsCol = $app.findCollectionByNameOrId('sessions')
    session = new Record(sessionsCol)
    session.set('chatId', String(chatId))
    session.set('currentStep', 'idle')
    $app.save(session)
  }

  let pendingAction = null
  try {
    const paStr = session.getString('pendingAction')
    if (paStr) pendingAction = JSON.parse(paStr)
  } catch (_) {}

  if (pendingAction && pendingAction.type) {
    const lower = text.toLowerCase().trim()
    const isYes =
      ['sim', 'yes', 's', 'confirmo', 'confirmar', 'confirma', 'yep', 'claro'].indexOf(lower) >= 0
    const isNo =
      ['não', 'nao', 'no', 'n', 'cancelar', 'cancela', 'cancel', 'negativo'].indexOf(lower) >= 0

    if (isYes) {
      executePendingAction(session, user, chatId, pendingAction)
      return e.json(200, { ok: true })
    } else if (isNo) {
      session.set('pendingAction', '')
      $app.save(session)
      sendMsg(chatId, 'Operação cancelada.')
      return e.json(200, { ok: true })
    } else {
      pendingAction.attempts = (pendingAction.attempts || 0) + 1
      if (pendingAction.attempts >= 2) {
        session.set('pendingAction', '')
        $app.save(session)
        sendMsg(chatId, 'Não entendi, cancelei a operação por segurança.')
        return e.json(200, { ok: true })
      }
      session.set('pendingAction', JSON.stringify(pendingAction))
      $app.save(session)
      sendMsg(chatId, 'Por favor, responda apenas "sim" ou "não".')
      return e.json(200, { ok: true })
    }
  }

  if (text.indexOf('/start') === 0) {
    session.set('currentStep', 'idle')
    session.set('tempPhotoFileId', '')
    session.set('tempName', '')
    session.set('tempWeight', 0)
    session.set('tempVariety', '')
    $app.save(session)
    sendTyping(chatId)
    chatWithAlbert(
      user.id,
      'O usuário iniciou uma nova conversa. Apresente-se como Albert, especialista em café da Ceres AI, e explique que pode enviar fotos para análise ou fazer perguntas.',
      chatId,
      false,
      session,
    )
    return e.json(200, { ok: true })
  }

  if (msg.photo && msg.photo.length > 0) {
    const largestPhoto = guard.pickPhoto(msg.photo)
    if (!largestPhoto) {
      sendMsg(chatId, 'Não consegui usar essa foto (formato inválido ou maior que 10 MB). Envie outra.')
      return e.json(200, { ok: true })
    }
    const fileId = largestPhoto.file_id
    const weight = extractWeight(text)
    const variety = extractVariety(text)

    let photoName = ''
    if (text) {
      let nameText = text
      nameText = nameText.replace(/(\d+)\s*(kg|g|gramas?)\b/i, '').trim()
      nameText = nameText.replace(/^\s*(\d{2,5})\s*$/, '').trim()
      nameText = nameText.replace(/arábica|arabica|robusta|conilon/gi, '').trim()
      nameText = nameText
        .replace(/^[,\-|]+\s*/, '')
        .replace(/\s*[,\-|]+$/, '')
        .trim()
      if (nameText && nameText.length >= 2) {
        photoName = nameText.substring(0, 100)
      }
    }

    session.set('tempPhotoFileId', fileId)
    session.set('tempName', photoName)
    session.set('tempWeight', weight > 0 ? weight : 0)
    session.set('tempVariety', variety || '')

    const hasName = photoName !== ''
    const hasWeight = weight > 0
    const hasVariety = variety !== null

    if (hasName && hasWeight && hasVariety) {
      session.set('currentStep', 'analyzing')
      $app.save(session)
      sendTyping(chatId)
      performAnalysis(session, user, chatId)
      return e.json(200, { ok: true })
    }

    if (!hasName) {
      session.set('currentStep', 'awaiting_name')
      $app.save(session)
      sendMsg(
        chatId,
        '📸 Foto recebida! Para completar a análise, preciso de algumas informações.\n\nQual o nome desta amostra? (ex: Lote 2024, Sítio Boa Vista)',
      )
      return e.json(200, { ok: true })
    }

    session.set('currentStep', 'idle')
    $app.save(session)
    let contextMsg = 'O usuário enviou uma foto de café. Nome: ' + photoName + '.'
    contextMsg += hasWeight ? ' Peso: ' + weight + 'g.' : ' Peso não informado.'
    contextMsg += hasVariety
      ? ' Variedade: ' + varietyLabel(variety) + '.'
      : ' Variedade não informada.'
    contextMsg += '\n\nPergunte naturalmente sobre os dados que faltam.'
    sendTyping(chatId)
    chatWithAlbert(user.id, contextMsg, chatId, !hasVariety, session)
    return e.json(200, { ok: true })
  }

  if (msg.document || msg.sticker) {
    sendMsg(chatId, 'Por favor, envie uma foto (não documento) do seu café.')
    return e.json(200, { ok: true })
  }

  if (!text) return e.json(200, { ok: true })

  if (session.getString('currentStep') === 'awaiting_name') {
    const nameWeight = extractWeight(text)
    const nameVariety = extractVariety(text)
    if (nameWeight > 0) session.set('tempWeight', nameWeight)
    if (nameVariety) session.set('tempVariety', nameVariety)
    session.set('tempName', text.trim())
    session.set('currentStep', 'idle')
    const hasWeight = session.get('tempWeight') > 0
    const hasVariety = session.getString('tempVariety') !== ''
    if (hasWeight && hasVariety) {
      session.set('currentStep', 'analyzing')
      $app.save(session)
      sendTyping(chatId)
      performAnalysis(session, user, chatId)
      return e.json(200, { ok: true })
    }
    $app.save(session)
    let contextMsg = 'O usuário forneceu o nome da amostra: ' + text.trim() + '.'
    contextMsg += hasWeight ? ' Peso: ' + session.get('tempWeight') + 'g.' : ' Peso não informado.'
    contextMsg += hasVariety
      ? ' Variedade: ' + varietyLabel(session.getString('tempVariety')) + '.'
      : ' Variedade não informada.'
    contextMsg += '\n\nPergunte naturalmente sobre os dados que faltam.'
    sendTyping(chatId)
    chatWithAlbert(user.id, contextMsg, chatId, !hasVariety, session)
    return e.json(200, { ok: true })
  }

  const extractedWeight = extractWeight(text)
  const extractedVariety = extractVariety(text)
  if (extractedWeight > 0) session.set('tempWeight', extractedWeight)
  if (extractedVariety) session.set('tempVariety', extractedVariety)

  const hasPhoto = session.getString('tempPhotoFileId') !== ''
  const hasName = session.getString('tempName') !== ''
  const hasWeight = session.get('tempWeight') > 0
  const hasVariety = session.getString('tempVariety') !== ''
  const isAnalyzing = session.getString('currentStep') === 'analyzing'

  if (hasPhoto && hasName && hasWeight && hasVariety && !isAnalyzing) {
    session.set('currentStep', 'analyzing')
    $app.save(session)
    sendTyping(chatId)
    performAnalysis(session, user, chatId)
    return e.json(200, { ok: true })
  }

  $app.save(session)

  let contextMsg = text
  if (hasPhoto && !isAnalyzing) {
    contextMsg =
      text +
      '\n\n[Contexto: Há uma foto pendente. Nome: ' +
      (hasName ? session.getString('tempName') : 'não informado') +
      '. Peso: ' +
      (hasWeight ? session.get('tempWeight') + 'g' : 'não informado') +
      '. Variedade: ' +
      (hasVariety ? varietyLabel(session.getString('tempVariety')) : 'não informada') +
      '.]'
  }

  sendTyping(chatId)
  chatWithAlbert(user.id, contextMsg, chatId, hasPhoto && !hasVariety && !isAnalyzing, session)
  return e.json(200, { ok: true })
})
