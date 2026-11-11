migrate(
  (app) => {
    const collection = new Collection({
      name: 'market_price_cache',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'source', type: 'text', required: true },
        { name: 'rawValue', type: 'number', required: true },
        { name: 'fetchedAt', type: 'date', required: true },
        { name: 'referenceDate', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_market_price_cache_source ON market_price_cache (source)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('market_price_cache')
    app.delete(collection)
  },
)
