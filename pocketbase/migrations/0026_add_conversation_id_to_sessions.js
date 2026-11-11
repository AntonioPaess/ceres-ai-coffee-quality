migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('sessions')
    if (!col.fields.getByName('conversationId')) {
      col.fields.add(new TextField({ name: 'conversationId' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('sessions')
    if (col.fields.getByName('conversationId')) {
      col.fields.remove('conversationId')
    }
    app.save(col)
  },
)
