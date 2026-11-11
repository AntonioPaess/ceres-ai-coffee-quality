routerAdd(
  'POST',
  '/backend/v1/agents/test',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const slug = body.slug || ''
      const message = body.message || ''
      if (!slug) return e.badRequestError('slug is required')
      if (!message) return e.badRequestError('message is required')

      var sanitizedMessage = message
      var lowerMsg = message.toLowerCase()
      var marketKeywords = [
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
      var hasMarketIntent = marketKeywords.some(function (kw) {
        return lowerMsg.indexOf(kw) >= 0
      })

      if (hasMarketIntent) {
        var instUrl = $secrets.get('PB_INSTANCE_URL')
        var suToken = $secrets.get('PB_SUPERUSER_TOKEN')
        if (instUrl && suToken) {
          try {
            var marketRes = $http.send({
              url: instUrl + '/backend/v1/albert/market',
              method: 'GET',
              headers: { Authorization: suToken },
              timeout: 30,
            })
            if (marketRes.statusCode === 200 && marketRes.json && marketRes.json.available) {
              var m = marketRes.json
              var sacaPrice = m.brlPer60kg || 0
              var kgPrice = m.brlPerKg || (sacaPrice > 0 ? sacaPrice / 60 : 0)
              if (kgPrice > 500) {
                sacaPrice = kgPrice
                kgPrice = sacaPrice / 60
              }
              var ctx = '[DADOS DE MERCADO ATUALIZADOS]\n'
              ctx += '- Preço de referência: R$ ' + sacaPrice.toFixed(2) + ' por saca de 60kg\n'
              ctx += '- Equivalente: R$ ' + kgPrice.toFixed(2) + '/kg\n'
              ctx += '[REGRAS DE CLASSIFICAÇÃO DE PREÇO - OBRIGATÓRIO]\n'
              ctx +=
                '- Para responder a perguntas de cotação ou preço, é OBRIGATÓRIO exibir uma tabela ou lista com os preços por kg e por saca para todas as classificações:\n'
              ctx += '- Grade A (10% acima): Preço kg e Saca\n'
              ctx += '- Grade B (Referência, 0%): Preço kg e Saca\n'
              ctx += '- Grade C (10% abaixo): Preço kg e Saca\n'
              ctx += '- Grade D (30% abaixo): Preço kg e Saca\n'
              ctx += '[FIM DAS REGRAS]\n'
              ctx += '[FIM DOS DADOS DE MERCADO]\n\n'
              sanitizedMessage = ctx + message
            }
          } catch (mErr) {
            $app.logger().error('Market context fetch error in agents_test', 'err', mErr.message)
          }
        }
      }

      const result = $ai.agent(slug).chat({
        user_id: userId,
        conversation_id: null,
        message: sanitizedMessage,
      })

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
          $app
            .logger()
            .error(
              'Erro ao fazer parse da Ação no agents_test',
              'err',
              err.message,
              'json',
              jsonStr,
            )
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

      const { action, content } = extractAction(result.content)

      return e.json(200, {
        content: content,
        action: action,
        conversation_id: result.conversation_id,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporarily unavailable' })
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'agent request failed' : err.message })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, { error: status >= 500 ? 'AI temporarily unavailable' : err.message })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
