migrate(
  (app) => {
    const collection = new Collection({
      name: 'sessions',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'chatId', type: 'text', required: true },
        { name: 'currentStep', type: 'text' },
        { name: 'tempPhotoFileId', type: 'text' },
        { name: 'tempWeight', type: 'number' },
        { name: 'tempVariety', type: 'text' },
        { name: 'currentAnalysisId', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_sessions_chatId ON sessions (chatId)'],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('sessions')
    app.delete(collection)
  },
)
