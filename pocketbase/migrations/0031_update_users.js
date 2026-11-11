migrate(
  (app) => {
    // This migration was redundant — users collection already exists from 0001.
    // Fixed to be a safe no-op so it applies cleanly.
    try {
      app.findCollectionByNameOrId('_pb_users_auth_')
    } catch (_) {}
  },
  (app) => {},
)
