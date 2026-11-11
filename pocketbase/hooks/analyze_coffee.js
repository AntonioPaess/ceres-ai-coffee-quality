onRecordAfterCreateSuccess((e) => {
  // Pure business rules live in _lib/coffee_rules.js (single source of truth, unit-tested).
  const rules = require(`${__hooks}/_lib/coffee_rules.js`)
  const record = e.record
  const imageFile = record.getString('image')
  if (!imageFile) return e.next()

  const setError = (status, body) => {
    const r = $app.findRecordById('samples', record.id)
    r.set('score', 0)
    r.set('grade', 'Erro')
    r.set('price', 0)
    r.set('status', 'error')
    r.set('defects', {
      error: true,
      roboflow_status: status,
      roboflow_body: rules.redactSecrets(body),
    })
    $app.save(r)
    try {
      const lc = $app.findCollectionByNameOrId('action_logs')
      const lg = new Record(lc)
      lg.set('user_id', record.getString('user_id'))
      lg.set('actionType', 'coffee_pricing')
      lg.set('toolCalled', 'analyze_coffee')
      lg.set('toolResult', { error: true, status: status, body: rules.redactSecrets(body) })
      lg.set('status', 'error')
      $app.save(lg)
    } catch (_) {}
  }

  const apiKey = $secrets.get('ROBOFLOW_API_KEY')
  if (!apiKey) {
    setError(0, 'Roboflow API key not configured')
    return e.next()
  }

  const instanceUrl = $secrets.get('PB_INSTANCE_URL')
  if (!instanceUrl) {
    setError(0, 'PB_INSTANCE_URL not configured')
    return e.next()
  }

  let fileToken = ''
  const superuserToken = $secrets.get('PB_SUPERUSER_TOKEN')
  if (superuserToken) {
    try {
      const tokenRes = $http.send({
        url: instanceUrl + '/api/files/token',
        method: 'GET',
        headers: { Authorization: superuserToken },
        timeout: 10,
      })
      if (tokenRes.statusCode === 200 && tokenRes.json) {
        fileToken = tokenRes.json.token || ''
      }
    } catch (err) {
      $app.logger().error('Failed to get file token', 'err', rules.redactSecrets(err.message))
    }
  }

  const imageUrl =
    instanceUrl +
    '/api/files/samples/' +
    record.id +
    '/' +
    imageFile +
    (fileToken ? '?token=' + fileToken : '')

  const roboflowUrl =
    'https://detect.roboflow.com/coffee-bean-defects-nbrvd/1?api_key=' +
    apiKey +
    '&image=' +
    encodeURIComponent(imageUrl)

  try {
    const res = $http.send({
      url: roboflowUrl,
      method: 'GET',
      timeout: 120,
    })

    if (res.statusCode !== 200) {
      let errorBody = ''
      try {
        if (res.body) errorBody = String(res.body)
        else if (res.json) errorBody = JSON.stringify(res.json)
      } catch (_) {}
      $app.logger().error(
        'Roboflow API error',
        'status',
        res.statusCode,
        'body',
        rules.redactSecrets(errorBody),
      )
      setError(res.statusCode, rules.redactSecrets(errorBody))
      return e.next()
    }

    const data = res.json
    if (!data) {
      setError(res.statusCode, 'Roboflow returned empty response')
      return e.next()
    }

    // Market reference (R$/saca of 60 kg in cache -> R$/kg). Falls back to a configured constant.
    let cachedPerSaca = null
    let cachedSource = ''
    try {
      const cached = $app.findRecordsByFilter('market_price_cache', '', '-fetchedAt', 1, 0)
      if (cached.length > 0) {
        cachedPerSaca = parseFloat(cached[0].getString('rawValue'))
        cachedSource = cached[0].getString('source')
      }
    } catch (_) {}
    const market = rules.resolveMarketReference(
      cachedPerSaca,
      cachedSource,
      parseFloat($os.getenv('COFFEE_FALLBACK_PRICE') || String(rules.DEFAULT_FALLBACK_PRICE_PER_SACA)),
    )
    const marketSource = market.source

    // All scoring / grading / pricing is deterministic and lives in the shared module.
    const result = rules.analyze(data, market.perKg)
    if (result.status !== 'completed') {
      setError(res.statusCode, 'Unusable inference response: ' + result.reason)
      return e.next()
    }
    const imageOriginalWidth = result.width
    const imageOriginalHeight = result.height
    const score = result.score
    const grade = result.grade
    const price = result.price
    const totalDefects = result.defects.totalDefects
    const totalEquivalents = result.defects.totalEquivalents
    for (let u = 0; u < result.defects.unknownClasses.length; u++) {
      $app.logger().warn('Unknown defect class detected', 'class', result.defects.unknownClasses[u])
    }

    const r = $app.findRecordById('samples', record.id)
    r.set('imageOriginalWidth', imageOriginalWidth)
    r.set('imageOriginalHeight', imageOriginalHeight)
    r.set('defects', result.defects)
    r.set('score', score)
    r.set('grade', grade)
    r.set('price', price)
    r.set('status', 'completed')
    $app.save(r)

    try {
      const logsCol = $app.findCollectionByNameOrId('action_logs')
      const log = new Record(logsCol)
      log.set('user_id', record.getString('user_id'))
      log.set('actionType', 'coffee_pricing')
      log.set('toolCalled', 'analyze_coffee')
      log.set('toolResult', {
        marketSource: marketSource,
        grade: grade,
        score: score,
        totalDefects: totalDefects,
        totalEquivalents: totalEquivalents,
        warnings: result.defects.warnings,
        finalPricePerKg: price,
      })
      log.set('status', 'success')
      $app.save(log)
    } catch (_) {}
  } catch (err) {
    $app.logger().error('Coffee analysis error', 'err', rules.redactSecrets(err.message))
    setError(0, rules.redactSecrets(err.message))
  }

  return e.next()
}, 'samples')
