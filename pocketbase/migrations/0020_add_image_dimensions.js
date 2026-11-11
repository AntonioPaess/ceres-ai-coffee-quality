migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    if (!col.fields.getByName('imageOriginalWidth')) {
      col.fields.add(new NumberField({ name: 'imageOriginalWidth' }))
    }
    if (!col.fields.getByName('imageOriginalHeight')) {
      col.fields.add(new NumberField({ name: 'imageOriginalHeight' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    col.fields.removeByName('imageOriginalWidth')
    col.fields.removeByName('imageOriginalHeight')
    app.save(col)
  },
)
