migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('sessions')
    if (!col.fields.getByName('tempName')) {
      col.fields.add(new TextField({ name: 'tempName' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('sessions')
    col.fields.removeByName('tempName')
    app.save(col)
  },
)
