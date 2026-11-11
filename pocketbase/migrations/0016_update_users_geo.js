migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('latitude')) {
      users.fields.add(new TextField({ name: 'latitude' }))
    }
    if (!users.fields.getByName('longitude')) {
      users.fields.add(new TextField({ name: 'longitude' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('latitude')
    users.fields.removeByName('longitude')
    app.save(users)
  },
)
