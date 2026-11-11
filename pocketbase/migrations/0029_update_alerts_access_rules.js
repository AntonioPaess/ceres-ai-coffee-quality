migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('alerts')
    col.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.createRule = null
    col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('alerts')
    col.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'cooperative')"
    col.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'cooperative')"
    col.createRule = null
    col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(col)
  },
)
