migrate(
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'coop@ceres.com')
      app.delete(record)
    } catch (_) {}
  },
  (app) => {},
)
