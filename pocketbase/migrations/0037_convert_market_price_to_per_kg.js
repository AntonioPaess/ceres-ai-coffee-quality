migrate(
  (app) => {
    try {
      var records = app.findRecordsByFilter('market_price_cache', '', '', 100, 0)
      for (var i = 0; i < records.length; i++) {
        var record = records[i]
        var src = record.getString('source')
        var val = parseFloat(record.getString('rawValue'))

        if (src === 'ALPHA_VANTAGE' && !isNaN(val) && val > 0) {
          record.set('rawValue', val / 60)
          app.save(record)
        }
      }
    } catch (_) {}
  },
  (app) => {},
)
