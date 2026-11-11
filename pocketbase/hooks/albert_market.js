routerAdd(
  'GET',
  '/backend/v1/albert/market',
  (e) => {
    var brlPerKg = 0
    var coffeeDate = ''
    var coffeeSource = 'STATIC_FALLBACK'

    try {
      var records = $app.findRecordsByFilter('market_price_cache', '', '-fetchedAt', 1, 0)
      if (records.length > 0) {
        var r = records[0]
        var val = parseFloat(r.getString('rawValue'))
        if (!isNaN(val) && val > 0) {
          brlPerKg = val / 60
          coffeeDate = r.getString('referenceDate') || ''
          coffeeSource = r.getString('source') || 'cache'
        }
      }
    } catch (err) {
      $app.logger().error('albert_market cache read error', 'err', err.message)
    }

    if (brlPerKg <= 0) {
      var fallbackBag = $os.getenv('COFFEE_FALLBACK_PRICE') || ''
      if (fallbackBag) {
        var fbVal = parseFloat(fallbackBag)
        if (!isNaN(fbVal) && fbVal > 0) brlPerKg = fbVal / 60
      }
      if (brlPerKg <= 0) brlPerKg = 27.5
      coffeeSource = 'STATIC_FALLBACK'
    }

    var brlPer60kg = brlPerKg * 60

    return e.json(200, {
      available: brlPerKg > 0,
      usdPerLb: 0,
      usdBrl: 0,
      brlPer60kg: brlPer60kg,
      brlPerKg: brlPerKg,
      date: coffeeDate,
      change: null,
      coffeeSource: coffeeSource,
      usdBrlSource: 'N/A',
    })
  },
  $apis.requireAuth(),
)
