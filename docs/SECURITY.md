# Security

## Reporting

This is a hackathon prototype. Please report vulnerabilities privately to the repository owner
via GitHub (do not open public issues containing exploit details or credentials).

## Secrets and configuration

No secret belongs in Git. The frontend only needs a **public** value; everything else is a backend
secret configured in Skip (`$secrets`) or the PocketBase process environment (`$os.getenv`).

| Name | Where | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_POCKETBASE_URL` | `.env` (frontend, public) | yes | Backend URL. Template: `.env.example`. |
| `ROBOFLOW_API_KEY` | Skip secrets | for analysis | Roboflow Hosted Inference key. |
| `PB_INSTANCE_URL` | Skip secrets | for analysis | Public base URL of the PocketBase instance (image URL for Roboflow). |
| `PB_SUPERUSER_TOKEN` | Skip secrets | for analysis | Mints short-lived file tokens so Roboflow can read protected images. **High privilege** — rotate regularly, never log. |
| `TELEGRAM_BOT_TOKEN` | Skip secrets | for Telegram | Bot API token. |
| `TELEGRAM_WEBHOOK_SECRET` | Skip secrets | for Telegram | Must equal the `secret_token` passed to `setWebhook`. Webhook **rejects all requests** if unset. |
| `TELEGRAM_WEBHOOK_ALLOW_UNAUTHENTICATED` | Skip secrets | no | `true` disables the check above. Transitional only; never in production. |
| `SITE_URL` | Skip secrets | no | Frontend URL used in Telegram links. |
| `COFFEE_FALLBACK_PRICE` | env | no | Fallback reference in R$/saca (default 1650). |
| `CERES_SEED_DEMO_EMAIL` / `CERES_SEED_DEMO_PASSWORD` | env | no | Opt-in demo seed for **non-production** databases only. Without both, no demo user is created. |

### Registering the webhook secret (manual, requires authorization)

Generate a random value (1–256 chars, `A-Z a-z 0-9 _ -`), store it as `TELEGRAM_WEBHOOK_SECRET`,
then re-register the webhook **with the same value**:

```bash
curl -sS "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=<PB_INSTANCE_URL>/backend/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d 'allowed_updates=["message","callback_query"]'
```

Deploy order matters: set the secret and call `setWebhook` **before** deploying the new hook,
otherwise legitimate updates will be rejected (`401`) until both sides match.

## Hardening implemented in this audit

| Area | Change |
| --- | --- |
| Credentials | Removed demo e-mail/password from the login page; seed migrations `0005`/`0006` no longer contain passwords (opt-in via env). `.env` untracked; `.env.example` added; `.gitignore` no longer whitelists `.env`. |
| Authorization (`0042`) | `samples.createRule` enforces `user_id = @request.auth.id` (previously any authenticated user could create samples **owned by someone else**). Clients can no longer write `score`, `grade`, `defects`, `status`, image dimensions, or reassign `user_id` on update (previously users could forge their own results). `action_logs`, `agents`: server-only create. `user_agents`: create bound to caller. `alerts`: owner may only toggle `isRead`. |
| Telegram webhook | Secret-header verification (fail closed, constant-time compare); payload validation; private chats only; text length cap; `update_id` idempotency (`telegram_updates`, unique index); photo size cap (10 MB) and `file_id` format check; sample name length cap; bot token redacted from logged errors. |
| Agent actions | Deterministic schema/type validation, field whitelist (fixes mass assignment of arbitrary fields), 10-minute confirmation TTL, ownership re-check, audit log of rejections. |
| Inference | Roboflow key and file tokens redacted from persisted errors and logs. |
| Misc | Page-size bound on `/albert/chats`; honest `/market-price/refresh` (no fake “updated”). |
| Dependencies | Patch-level upgrades for `react-router`, `zod`, `postcss`, `vite`, `vitest`; `pnpm` overrides for `tinypool` and `postcss-selector-parser`. `pnpm audit` reports no known vulnerabilities at the time of the audit. |

## Deployment checklist

1. Never enable the demo seed (`CERES_SEED_DEMO_*`) on a production database; rotate any credential
   that was ever committed or shared.
2. Configure `TELEGRAM_WEBHOOK_SECRET` and re-register the webhook (above) **before** deploying the
   webhook hook.
3. Keep `PB_SUPERUSER_TOKEN` short-lived and rotate it regularly.
4. Apply migrations in order on a staging copy first (`0042`–`0044` are additive; see
   [LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md)), run the live authorization tests, then production.

This public repository starts from a clean snapshot of the audited code. A scan of the original
history (Roboflow/Telegram/OpenAI/Google/GitHub key patterns, JWTs, private keys, hardcoded
`setPassword`) found **no API keys or tokens**.

## Residual risks

* Backend filters are built by string concatenation with server-side record ids (not user input);
  safe today but should move to parameterised filters (`{:id}`).
* Conversation ownership (`/albert/chats/{id}/messages`) relies on Skip's `$ai` API enforcing the
  `user_id` passed by the hook.
* Prompt injection can still influence *what Albert says*; it cannot bypass the deterministic gates.
* Roboflow receives user photos; a privacy notice should be shown to users before production use.
* `telegram_updates` grows unbounded until a cleanup job is added.
