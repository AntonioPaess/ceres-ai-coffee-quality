routerAdd(
  'POST',
  '/backend/v1/albert/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth ? e.auth.id : ''
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message || !body.message.trim()) return e.badRequestError('message is required')

      let enhancedMessage = body.message
      const lowerMsg = body.message.toLowerCase()

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

      let contextPrefix = ''

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
              contextPrefix += '[DADOS DE MERCADO ATUALIZADOS]\n'
              contextPrefix +=
                '- Preço de referência: R$ ' + m.brlPer60kg.toFixed(2) + ' por saca de 60kg\n'
              contextPrefix += '- Equivalente: R$ ' + m.brlPerKg.toFixed(2) + '/kg\n'
              if (showUsd) {
                contextPrefix += '- Índice global: US$ ' + usdPerLb.toFixed(2) + '/lb\n'
                contextPrefix += '- Cotação do dólar: R$ ' + usdBrl.toFixed(2) + '\n'
              }
              contextPrefix += '- Data do índice: ' + (m.date || '') + '\n'
              contextPrefix += '[FIM DOS DADOS DE MERCADO]\n\n'
            }
          } catch (_) {}
        }
      }

      if (hasLocationIntent || hasWeatherIntent) {
        let ctxUser = null
        try {
          ctxUser = $app.findRecordById('users', userId)
        } catch (_) {}

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
        let user = null
        try {
          user = $app.findRecordById('users', userId)
        } catch (_) {}

        const lat = user ? user.getString('latitude') : ''
        const lon = user ? user.getString('longitude') : ''

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
            if (wRes.statusCode === 200 && wRes.json) {
              var c = wRes.json.current
              var w = wRes.json.daily
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
          } catch (_) {}
        }
      }

      if (contextPrefix) {
        enhancedMessage = contextPrefix + body.message
      }

      const result = $ai.agent('albert').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: enhancedMessage,
      })

      var cleanText = result.content || ''
      var actMarker = '__ACTION__'
      var actIdx = cleanText.indexOf(actMarker)
      while (actIdx >= 0) {
        var jStart = actIdx + actMarker.length
        var jDepth = 0
        var jEnd = -1
        var jInStr = false
        var jEsc = false
        for (var ji = jStart; ji < cleanText.length; ji++) {
          var jch = cleanText[ji]
          if (jEsc) {
            jEsc = false
            continue
          }
          if (jch === '\\') {
            jEsc = true
            continue
          }
          if (jch === '"') {
            jInStr = !jInStr
            continue
          }
          if (jInStr) continue
          if (jch === '{') jDepth++
          else if (jch === '}') {
            jDepth--
            if (jDepth === 0) {
              jEnd = ji + 1
              break
            }
          }
        }
        if (jEnd < 0) break
        var afterJ = jEnd
        while (afterJ < cleanText.length && cleanText[afterJ] === ' ') afterJ++
        if (cleanText.substring(afterJ, afterJ + 2) === '__') afterJ += 2
        cleanText = (cleanText.substring(0, actIdx) + cleanText.substring(afterJ)).trim()
        actIdx = cleanText.indexOf(actMarker)
      }

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: cleanText.trim(),
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'AI temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'falha na requisição do agente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'AI temporariamente indisponível' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
