# Local development

## What runs where

| Part | Runs locally? | Notes |
| --- | --- | --- |
| Frontend (React/Vite) | **Yes** | Needs a reachable backend URL for anything beyond the login screen. |
| Unit + hook tests | **Yes** | Pure Node; external services and PocketBase globals are mocked. |
| Production build, typecheck, lint, audit | **Yes** | |
| PocketBase backend with these hooks | **No (blocked)** | The hooks use Skip-only runtime APIs: `$secrets`, `$ai` (`agents.define`, `agent().chat`, `chat`), `SkipAiError`/`SkipAiConfigError`/`SkipAiAgentsError`. Migrations `0004`, `0008`, `0010`, `0011`, `0014`, `0018`, `0023`, `0025`, `0036`, `0038`–`0040`, `0043` call `$ai.agents.define`. A vanilla PocketBase binary cannot run them as-is. |
| Telegram, Roboflow, LLM agents | Only against real services | Require credentials (see [SECURITY](SECURITY.md)). |

## Prerequisites

* Node.js ≥ 20 (tested with Node 25)
* pnpm 10 (`packageManager` is pinned in `package.json`; `npx pnpm@10 …` works without a global install)

`pnpm-lock.yaml` is the single lockfile. The unused `bun.lockb` was removed to avoid two
package managers resolving different trees.

## Frontend

```bash
cp .env.example .env          # set VITE_POCKETBASE_URL
pnpm install --frozen-lockfile
pnpm dev                      # http://localhost:5173 (Vite default)
```

Point `VITE_POCKETBASE_URL` to **your own** Skip/PocketBase environment. Do not point a local
frontend at the production prototype for testing.

## Quality gates

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # oxlint src
pnpm test        # vitest: unit + hook tests (no network)
pnpm build       # production bundle
pnpm check       # all of the above
pnpm audit       # dependency advisories
```

`pnpm format:check` (oxfmt) reports pre-existing formatting differences in most files exported
from Skip; the audit did not reformat the whole codebase to keep the diff reviewable.

## Running the backend

Two realistic options:

1. **Skip (recommended).** Import/sync this repository into a Skip project, configure the secrets
   from [SECURITY](SECURITY.md), and let Skip apply migrations. Test on a **non-production**
   project first.
2. **Vanilla PocketBase (partial, manual).** Possible only after porting: rename hooks to
   `*.pb.js`, replace `$secrets.get` with `$os.getenv`, and stub or replace the `$ai` calls with a
   direct LLM HTTP client. This port is **not** part of this repository.

### Applying the audit migrations safely

Migrations `0042` (access rules), `0043` (Albert prompt) and `0044` (`telegram_updates`) are
additive: no data is deleted or rewritten. Recommended procedure:

1. Back up the hosted database (`pb_data`) or snapshot the Skip project.
2. Apply on a staging copy, run the live authorization tests (below), and exercise the web and
   Telegram flows.
3. Configure `TELEGRAM_WEBHOOK_SECRET` + `setWebhook` **before** deploying the new webhook hook.
4. Deploy to production.

### Live authorization tests (optional)

Against a **staging** PocketBase with two disposable accounts:

```bash
PB_TEST_URL=https://staging.example PB_TEST_USER_A=a@test.local PB_TEST_USER_B=b@test.local \
PB_TEST_PASSWORD=... pnpm test:live
```

## Hook libraries

`pocketbase/hooks/_lib/*.js` are plain CommonJS modules (ES5-compatible, no PocketBase globals)
loaded from handlers with ``require(`${__hooks}/_lib/<file>.js`)``, which is the documented
PocketBase JSVM pattern. Assumption to verify on first deploy: that Skip's hook loader tolerates a
sub-directory of side-effect-free modules (they only assign `module.exports`).
