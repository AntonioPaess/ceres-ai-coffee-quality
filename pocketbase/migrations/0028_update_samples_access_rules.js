migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    col.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('samples')
    col.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'cooperative')"
    col.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'cooperative')"
    col.createRule = "@request.auth.id != '' && @request.auth.role = 'producer'"
    col.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(col)
  },
)
