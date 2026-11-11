cronAdd('agents_run', '0 * * * *', () => {
  const botToken = $secrets.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return

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

  const sendTelegram = (chatId, text) => {
    const formatted = formatToHtml(text)
    const maxLen = 3500
    const lines = formatted.split('\n')
    let current = ''
    for (let i = 0; i < lines.length; i++) {
      if ((current + '\n' + lines[i]).length > maxLen) {
        if (current) {
          try {
            $http.send({
              url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: current.trim(), parse_mode: 'HTML' }),
            })
          } catch (err) {
            $app.logger().error('Erro ao enviar mensagem Telegram', 'err', err.message)
          }
        }
        current = lines[i]
      } else {
        current = current ? current + '\n' + lines[i] : lines[i]
      }
    }
    if (current) {
      try {
        $http.send({
          url: 'https://api.telegram.org/bot' + botToken + '/sendMessage',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: current.trim(), parse_mode: 'HTML' }),
        })
      } catch (err) {
        $app.logger().error('Erro ao enviar mensagem Telegram', 'err', err.message)
      }
    }
  }

  const logError = (userId, agentSlug, errorType, errorDetails) => {
    try {
      const col = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(col)
      log.set('user_id', userId)
      log.set('actionType', 'agent_run_error')
      log.set('toolCalled', agentSlug)
      log.set('toolResult', { errorType, error: errorDetails, timestamp: new Date().toISOString() })
      log.set('status', 'error')
      $app.save(log)
    } catch (err) {
      $app.logger().error('Erro na execução do agente', 'err', err.message)
    }
  }

  const fetchCoffeePrice = () => {
    const instUrl = $secrets.get('PB_INSTANCE_URL')
    const suToken = $secrets.get('PB_SUPERUSER_TOKEN')
    if (!instUrl || !suToken)
      return { skipped: true, data: null, error: 'PB_INSTANCE_URL or PB_SUPERUSER_TOKEN missing' }
    try {
      const res = $http.send({
        url: instUrl + '/backend/v1/albert/market',
        method: 'GET',
        headers: { Authorization: suToken },
        timeout: 30,
      })
      if (res.statusCode === 200 && res.json && res.json.available) {
        const d = res.json
        let changeStr = ''
        if (d.change) {
          changeStr = ' (variação: ' + (d.change.diff >= 0 ? '+' : '') + d.change.pct + '%)'
        }
        var brlPer60kg = d.brlPer60kg || 0
        var brlPerKg = d.brlPerKg || 0
        if (brlPerKg > 500) {
          brlPer60kg = brlPerKg
          brlPerKg = brlPer60kg / 60
        }
        return {
          skipped: false,
          data: {
            centsPerLb: d.usdPerLb ? d.usdPerLb * 100 : 0,
            usdPerLb: d.usdPerLb || 0,
            usdBrl: d.usdBrl || 0,
            brlPer60kg: brlPer60kg,
            brlPerKg: brlPerKg,
            date: d.date || '',
            change: changeStr,
          },
          error: null,
        }
      }
      return {
        skipped: false,
        data: null,
        error: 'Market data unavailable, status: ' + res.statusCode,
      }
    } catch (err) {
      return { skipped: false, data: null, error: err.message }
    }
  }

  const fetchWeatherData = (lat, lon) => {
    try {
      const res = $http.send({
        url:
          'https://api.open-meteo.com/v1/forecast?latitude=' +
          lat +
          '&longitude=' +
          lon +
          '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,uv_index,weather_code' +
          '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max&timezone=America/Sao_Paulo&forecast_days=3',
        method: 'GET',
        timeout: 15,
      })
      if (res.statusCode === 200 && res.json) return res.json
      return null
    } catch (err) {
      $app.logger().error('Erro na execução do agente', 'err', err.message)
      return null
    }
  }

  const now = new Date()
  const computeNextRun = (freq) => {
    let ms = 86400000
    if (freq === 'weekly') ms = 604800000
    if (freq === 'continuous') ms = 21600000
    return new Date(now.getTime() + ms).toISOString()
  }

  const allUAs = $app.findRecordsByFilter('user_agents', "id != ''", '', 0, 0)

  for (let i = 0; i < allUAs.length; i++) {
    const ua = allUAs[i]
    if (!ua.getBool('status')) continue
    const nextRunStr = ua.getString('nextRun')
    if (nextRunStr && new Date(nextRunStr) > now) continue

    const agentId = ua.getString('agent_id')
    const userId = ua.getString('user_id')
    let agent, user
    try {
      agent = $app.findRecordById('agents', agentId)
      user = $app.findRecordById('users', userId)
    } catch (err) {
      $app.logger().error('Erro na execução do agente', 'err', err.message)
      continue
    }
    if (agent.getString('slug') === 'albert') continue

    const chatId = user.getString('telegramChatId')
    if (!chatId) continue

    const agentSlug = agent.getString('slug')
    const agentName = agent.getString('name')

    let samples = []
    try {
      samples = $app.findRecordsByFilter('samples', "user_id = '" + userId + "'", '-created', 10, 0)
    } catch (err) {
      $app.logger().error('Erro ao gerenciar sessão', 'err', err.message)
    }
    let samplesSummary = ''
    for (let s = 0; s < samples.length; s++)
      samplesSummary +=
        '- ' +
        samples[s].getString('name') +
        ': nota ' +
        samples[s].getInt('score') +
        ', grade ' +
        samples[s].getString('grade') +
        '\n'

    let prompt = ''
    let skipMessage = false
    let errorType = null
    let errorDetails = null

    if (agentSlug === 'mercurio') {
      let marketContext = ''
      let hasData = false
      const coffeeResult = fetchCoffeePrice()
      if (coffeeResult.skipped) {
        errorType = 'api_key_missing'
        errorDetails = 'ALPHA_VANTAGE_API_KEY is PENDING or missing'
        skipMessage = true
      } else if (coffeeResult.data && coffeeResult.data.brlPer60kg > 0) {
        marketContext +=
          'Preço de referência: R$ ' +
          coffeeResult.data.brlPer60kg.toFixed(2) +
          ' por saca de 60kg\n'
        marketContext += 'Equivalente: R$ ' + coffeeResult.data.brlPerKg.toFixed(2) + '/kg\n'
        marketContext +=
          'Índice global: US$ ' +
          coffeeResult.data.usdPerLb.toFixed(2) +
          '/lb' +
          coffeeResult.data.change +
          '\n' +
          'Cotação do dólar: R$ ' +
          coffeeResult.data.usdBrl.toFixed(2) +
          '\n' +
          'Data do índice: ' +
          coffeeResult.data.date +
          '\n'
        marketContext += '[REGRAS DE CLASSIFICAÇÃO DE PREÇO - OBRIGATÓRIO]\n'
        marketContext +=
          '- Para responder a perguntas de cotação ou preço, é OBRIGATÓRIO exibir uma tabela ou lista com os preços por kg e por saca para todas as classificações:\n'
        marketContext += '- Grade A (10% acima): Preço kg e Saca\n'
        marketContext += '- Grade B (Referência, 0%): Preço kg e Saca\n'
        marketContext += '- Grade C (10% abaixo): Preço kg e Saca\n'
        marketContext += '- Grade D (30% abaixo): Preço kg e Saca\n'
        marketContext += '[FIM DAS REGRAS]\n'
        hasData = true
      } else {
        errorType = 'api_error'
        errorDetails = coffeeResult.error
        skipMessage = true
      }
      if (!skipMessage && hasData) {
        prompt =
          'Como Mercúrio, gere um insight sobre o mercado de café verde brasileiro hoje. Dados:\n' +
          marketContext +
          '\nFoque no impacto financeiro para o bolso do produtor. O preço principal deve ser em R$ por saca de 60kg.\n' +
          'NUNCA invente notícias, causas ou análises que não estão nos dados. Se não puder explicar uma variação, apenas informe os números.\n' +
          'Máximo 200 palavras. Em português.'
      }
    } else if (agentSlug === 'eolo') {
      const lat = user.getString('latitude')
      const lon = user.getString('longitude')
      if (!lat || !lon) {
        errorType = 'geocoding_missing'
        errorDetails = 'User has no latitude/longitude'
        skipMessage = true
      } else {
        const weather = fetchWeatherData(lat, lon)
        if (!weather) {
          errorType = 'api_error'
          errorDetails = 'Weather data fetch failed'
          skipMessage = true
        } else {
          var wDaily = weather.daily
          var wCurrent = weather.current
          var wCtx = 'Dados meteorológicos atuais:\n'
          if (wCurrent) {
            wCtx +=
              '- Temperatura: ' +
              (wCurrent.temperature_2m !== undefined ? wCurrent.temperature_2m : 'N/A') +
              '°C\n'
            wCtx +=
              '- Sensação térmica: ' +
              (wCurrent.apparent_temperature !== undefined
                ? wCurrent.apparent_temperature
                : 'N/A') +
              '°C\n'
            wCtx +=
              '- Humidade: ' +
              (wCurrent.relative_humidity_2m !== undefined
                ? wCurrent.relative_humidity_2m
                : 'N/A') +
              '%\n'
            wCtx +=
              '- Precipitação: ' +
              (wCurrent.precipitation !== undefined ? wCurrent.precipitation : 'N/A') +
              'mm\n'
            wCtx +=
              '- Pressão: ' +
              (wCurrent.surface_pressure !== undefined ? wCurrent.surface_pressure : 'N/A') +
              ' hPa\n'
            wCtx +=
              '- Vento: ' +
              (wCurrent.wind_speed_10m !== undefined ? wCurrent.wind_speed_10m : 'N/A') +
              ' km/h\n'
            wCtx += '- UV: ' + (wCurrent.uv_index !== undefined ? wCurrent.uv_index : 'N/A') + '\n'
          }
          if (wDaily && wDaily.time && wDaily.temperature_2m_min && wDaily.precipitation_sum) {
            wCtx += '\nPrevisão:\n'
            for (let d = 0; d < wDaily.time.length; d++)
              wCtx +=
                '- ' +
                wDaily.time[d] +
                ': mínima ' +
                wDaily.temperature_2m_min[d] +
                '°C, precipitação ' +
                wDaily.precipitation_sum[d] +
                'mm\n'
          }
          var frost = false,
            drought = false,
            highWind = false,
            extremeUV = false
          if (wDaily && wDaily.temperature_2m_min)
            for (let d = 0; d < wDaily.temperature_2m_min.length; d++)
              if (wDaily.temperature_2m_min[d] <= 5) frost = true
          if (wDaily && wDaily.precipitation_sum)
            for (let d = 0; d < wDaily.precipitation_sum.length; d++)
              if (wDaily.precipitation_sum[d] < 1) drought = true
          if (wCurrent && wCurrent.wind_speed_10m >= 30) highWind = true
          if (wCurrent && wCurrent.uv_index >= 8) extremeUV = true
          prompt =
            'Como Éolo, analise os dados meteorológicos:\n' +
            wCtx +
            '\n' +
            (frost ? '⚠️ Risco de geada!\n' : '') +
            (drought ? '⚠️ Risco de seca!\n' : '') +
            (highWind ? '⚠️ Vento forte (' + wCurrent.wind_speed_10m + ' km/h)!\n' : '') +
            (extremeUV ? '⚠️ UV extremo (índice ' + wCurrent.uv_index + ')!\n' : '') +
            (!frost && !drought && !highWind && !extremeUV ? 'Condições normais.\n' : '') +
            'Só alerte se houver algo importante. Máximo 150 palavras. Em português.'
        }
      }
    } else if (agentSlug === 'jano') {
      prompt =
        'Como Jano, feche a semana com um resumo. Uma face olha para trás: análises, nota média, melhor e pior lote. A outra olha para frente. Amostras:\n' +
        samplesSummary +
        '\nMáximo 200 palavras. Em português.'
    } else if (agentSlug === 'flora') {
      prompt =
        'Como Flora, acompanhe a evolução da qualidade do café. Aponte tendências e defeitos recorrentes. Amostras:\n' +
        samplesSummary +
        '\nMáximo 200 palavras. Em português.'
    } else if (agentSlug === 'minerva') {
      const topics = [
        'classificação de café verde',
        'identificação de defeitos',
        'boas práticas de secagem',
        'fermentação adequada',
        'armazenamento correto',
        'colheita seletiva',
        'pós-colheita',
      ]
      prompt =
        'Como Minerva, traga uma dica sobre: ' +
        topics[Math.floor(Math.random() * topics.length)] +
        '. Amostras:\n' +
        samplesSummary +
        '\nMáximo 150 palavras. Em português.'
    } else if (agentSlug === 'apolo') {
      prompt =
        'Como Apolo, analise as amostras e dê recomendações práticas. Amostras:\n' +
        samplesSummary +
        '\nMáximo 200 palavras. Em português.'
    } else {
      const config = ua.get('config') || {}
      prompt =
        'Objetivo: ' +
        (config.objective || agent.getString('description')) +
        '\nAmostras:\n' +
        samplesSummary +
        '\nGere uma mensagem proativa. Máximo 200 palavras. Em português.'
    }

    if (skipMessage) {
      logError(userId, agentSlug, errorType, errorDetails)
      ua.set('lastRun', now.toISOString())
      ua.set('nextRun', computeNextRun(agent.getString('defaultFrequency') || 'daily'))
      $app.save(ua)
      continue
    }

    try {
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um agente IA da Ceres AI chamado ' +
              agentName +
              '. Seja conciso e útil.\n' +
              'REGRAS DE VERACIDADE:\n' +
              '- NUNCA invente dados, preços, cotações, notícias ou condições climáticas.\n' +
              '- Use APENAS os dados fornecidos no contexto da mensagem.\n' +
              '- Se não puder explicar uma variação com base nos dados fornecidos, apenas informe os números sem justificativa especulativa.\n' +
              '- Não cite fontes externas ou notícias não fornecidas pelo sistema.',
          },
          { role: 'user', content: prompt },
        ],
      })
      const content = reply.choices[0].message.content
      sendTelegram(chatId, '🤖 *' + agentName + '*\n\n' + content)
    } catch (err) {
      logError(userId, agentSlug, 'ai_chat_error', err.message)
    }

    ua.set('lastRun', now.toISOString())
    ua.set('nextRun', computeNextRun(agent.getString('defaultFrequency') || 'daily'))
    $app.save(ua)
  }
})
