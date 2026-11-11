migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('stateName')) {
      users.fields.add(new TextField({ name: 'stateName' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('stateName')
    app.save(users)
  },
)
