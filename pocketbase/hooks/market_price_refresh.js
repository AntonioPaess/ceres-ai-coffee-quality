// HONESTY NOTE (audit): this endpoint does NOT call any external quotation provider.
// It re-reads the last cached value from `market_price_cache`. The cache is populated outside
// this export (e.g. by a hosted agent / external job), so freshness depends on that process.
// Units: rawValue is returned in R$/kg (cached R$/saca of 60 kg divided by 60).
routerAdd(
  'POST',
  '/backend/v1/market-price/refresh',
  (e) => {
    try {
      var records = $app.findRecordsByFilter('market_price_cache', '', '-fetchedAt', 1, 0)
      var perSaca = 0
      var r = null
      if (records.length > 0) {
        r = records[0]
        var v = parseFloat(r.getString('rawValue'))
        if (!isNaN(v) && v > 0) perSaca = v
      }
      var usedFallback = perSaca === 0
      if (usedFallback) perSaca = 1650.0 // static fallback, same as analyze_coffee.js
      return e.json(200, {
        success: true,
        refreshed: false,
        source: usedFallback ? 'fallback' : r.getString('source') || 'cache',
        fetchedAt: usedFallback ? '' : r.getString('fetchedAt'),
        rawValue: perSaca / 60,
        message: usedFallback
          ? 'Sem cotação em cache; usando valor de referência fixo (não é cotação de mercado).'
          : 'Exibindo o último valor em cache; nenhuma consulta externa foi feita.',
      })
    } catch (err) {
      return e.json(500, { error: 'failed to read market price cache' })
    }
  },
  $apis.requireAuth(),
)
