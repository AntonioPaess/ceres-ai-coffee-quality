routerAdd(
  'GET',
  '/backend/v1/market-price',
  (e) => {
    try {
      var records = $app.findRecordsByFilter('market_price_cache', '', '-fetchedAt', 1, 0)
      if (records.length === 0) {
        return e.json(200, null)
      }
      var r = records[0]
      var rawValue = parseFloat(r.getString('rawValue'))
      if (isNaN(rawValue)) rawValue = 0
      return e.json(200, {
        source: r.getString('source'),
        rawValue: rawValue / 60,
        fetchedAt: r.getString('fetchedAt'),
        referenceDate: r.getString('referenceDate'),
      })
    } catch (err) {
      return e.json(500, { error: 'failed to fetch market price' })
    }
  },
  $apis.requireAuth(),
)
