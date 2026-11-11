migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          values: ['pending', 'completed', 'error'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)

    app
      .db()
      .newQuery(
        "UPDATE samples SET status = 'completed' WHERE grade IS NOT NULL AND grade != '' AND grade != 'Erro'",
      )
      .execute()
    app.db().newQuery("UPDATE samples SET status = 'error' WHERE grade = 'Erro'").execute()
    app
      .db()
      .newQuery(
        "UPDATE samples SET status = 'pending' WHERE (grade IS NULL OR grade = '') AND status IS NULL",
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    col.fields.removeByName('status')
    app.save(col)
  },
)
