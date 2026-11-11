# Audit report — November 2026

Scope: full repository at `main@6c08dbf` (Skip export `v0.0.78`, deployed ref `2fc1262`), branch
`audit/ceres-security-quality-docs`. Method: manual code review of all hooks, migrations and
frontend pages listed in the brief, Git-history secret scan, dependency audit, and automated
tests written during the audit. Nothing was deployed, pushed, or changed on remote services.

## Original version (baseline)

* Commit `6c08dbf` on `main` (preserved; all work is on the audit branch).
* Production prototype: `https://ceres-ai-cafe-87c6b.goskip.app` — still running the baseline.

## Findings

Severity follows impact × exploitability for a public deployment.

### Critical

| # | Finding | Evidence | Status |
| --- | --- | --- | --- |
| C1 | Demo account e-mail **and password** displayed on the login page and hardcoded in seed migrations. | `src/pages/Index.tsx`, `migrations/0005`, `0006` | **Fixed in code.** Credential remains in Git history and on the live site → rotation required (owner). |
| C2 | Telegram webhook accepted **any** POST: no `secret_token` verification. Anyone knowing the URL could impersonate any linked chat id (e.g. confirm deletions). | `hooks/telegram_webhook.js` | **Fixed** (fail-closed secret header). Requires secret + `setWebhook` on deploy. |

### High

| # | Finding | Evidence | Status |
| --- | --- | --- | --- |
| H1 | `samples.createRule` did not bind `user_id` to the caller → create samples owned by other users (pollutes their history, triggers analysis/costs on their behalf). | `migrations/0002`, `0028`, `0031` | **Fixed** (`0042`). |
| H2 | Owners could write `score`, `grade`, `defects`, `status` and reassign `user_id` through the API → forged results / reports. | same | **Fixed** (`0042`). |
| H3 | Mass assignment via LLM: confirmed `update` actions wrote **every key** the model returned onto the sample (incl. `user_id`, `score`, `grade`). Prompt injection in a message/sample name could steer it. | `telegram_webhook.js` `executePendingAction` | **Fixed** (deterministic whitelist + validation). |
| H4 | Business rules described to Albert (base 92, −2/defect; A +10 %…D −30 %; Alpha Vantage) contradicted the code (COB equivalents; A +40 %…D −25 %; cache/fallback). Users received explanations inconsistent with their numbers. | `migrations/0036`, `0039`, `0040` vs `hooks/analyze_coffee.js` | **Fixed** (`0043`; code kept as source of truth). |

### Medium

| # | Finding | Status |
| --- | --- | --- |
| M1 | `.gitignore` whitelisted `.env` (tracked). Current content is public, but the pattern invites leaks. | **Fixed** (`.env` untracked, `.env.example`). |
| M2 | No idempotency for Telegram retries → duplicate analyses/actions. | **Fixed** (`telegram_updates` + unique index). |
| M3 | No validation of Telegram payload / chat type / sizes; group chats accepted. | **Fixed**. |
| M4 | `action_logs`, `agents`, `user_agents` creatable by any authenticated client (forged audit entries, catalogue spam, cross-user agent rows). | **Fixed** (`0042`). |
| M5 | Error bodies/logs could carry the Roboflow key or file token. | **Fixed** (`redactSecrets`). |
| M6 | Dashboard “Defeitos” counted categories, not occurrences. | **Fixed** + tests. |
| M7 | “Atualizar cotação” reported success without fetching anything; no writer for the cache exists. | **Fixed** (honest response/UI) + documented. |
| M8 | Invalid inference payload (no `predictions`) produced grade A. | **Fixed** (`inconclusive` → error). |
| M9 | Pending confirmations never expired. | **Fixed** (10-min TTL). |
| M10 | 8 production advisories (6 high: react-router, zod, nanoid, postcss, source-map-js) plus dev-tooling advisories (vite, vitest, tinypool, browserslist). | **Fixed** (patch-level bumps/overrides; `pnpm audit` clean). |

### Low

| # | Finding | Status |
| --- | --- | --- |
| L1 | `test` script always succeeded with no tests. | **Fixed** (85 tests). |
| L2 | Global store typed as `any`; 2 pre-existing TypeScript errors. | **Fixed** (`src/lib/types.ts`; typecheck clean). |
| L3 | Result page polled forever while pending. | **Fixed** (3-min cap + re-check). |
| L4 | “Compartilhar” toast claimed the link was copied without copying. | **Fixed**. |
| L5 | Wording overclaimed: “Nota SCA”, “standards follow official SCA (Specialty Coffee Association) guidelines”, “Laudo Técnico/de Classificação”, “Preço justo”, “>80 % = highly reliable”. The score is a project heuristic, not an SCA score. | **Fixed** (“Pontuação”, explicit non-SCA disclaimer, “Relatório … (experimental)”, “Preço estimado”, experimental notice). |
| L6 | Icon-only refresh button without accessible name. | **Fixed**. |
| L7 | Two lockfiles (`pnpm-lock.yaml`, `bun.lockb`). | **Fixed** (pnpm only). |
| L8 | Unbounded `limit` on `/albert/chats`. | **Fixed**. |
| L9 | Personal e-mail in migrations `0005/0006/0013/0017`. | **Fixed in the current tree**; still in the private repo's history → public repo published with a fresh history. |
| L10 | String-concatenated PocketBase filters (server ids only). | Open — documented. |
| L11 | Score-drop monitor never fires (create vs update). | Open — documented, behaviour unchanged. |

## Publication readiness

The repository is **private** and must stay so until every item below is ✅.

| # | Gate | Status |
| --- | --- | --- |
| 1 | Secret audit of current code and full Git history | ✅ Done — no API keys/tokens; demo password + personal e-mail present in history. |
| 2 | Exposed credentials revoked | ⛔ **Pending owner** — reset/disable the demo account on the hosted PocketBase; confirm the password is not reused. |
| 3 | All three authors agree to publish | ✅ Confirmed (reported by the repository owner, November 2026). |
| 4 | License approved by all authors | ✅ MIT, agreed by the three authors. |
| 5 | Tests and build pass | ✅ typecheck, lint (0 errors), 85 tests, production build, `pnpm audit` clean. |
| 6 | Docs and links validated | ✅ Internal links checked; external links point to project/platform pages only. Real, masked screenshots added (Telegram capture still missing). |
| 7 | Live prototype safe to advertise | ⛔ **Not yet** — it still shows the demo credentials and runs the pre-audit webhook. Deploy this branch (with secrets) first. |

### Recommendation on Git history

Because the demo password and a personal e-mail are in history, the safest path to a public repo is:

1. Keep this repository **private** as the archival original (full Skip history).
2. Create a **new public repository** from a single squashed commit of the audited tree
   (`git archive` of the approved branch → fresh `git init`), with a note in the README that the
   prototype was built in Skip and the private repo keeps the full history.
3. Alternatively rewrite history with `git filter-repo` — only with explicit approval, never
   force-pushing over the private original.

Either way, **rotate the credential first**: rewriting history does not un-leak a password.
