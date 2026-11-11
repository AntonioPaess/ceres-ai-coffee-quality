# Testing

Before the audit, `pnpm test` printed “there are no tests” and exited 0. It now runs real checks
with [Vitest](https://vitest.dev).

| Suite | Path | Command | Needs network / services |
| --- | --- | --- | --- |
| Unit — business rules | `tests/unit/coffee_rules.test.ts` | `pnpm test` | No |
| Unit — agent action & Telegram payload validation | `tests/unit/action_validation.test.ts` | `pnpm test` | No |
| Unit — dashboard aggregations | `tests/unit/stats.test.ts` | `pnpm test` | No |
| Static — final API rules after all migrations | `tests/unit/access_rules.test.ts` | `pnpm test` | No |
| Hook integration (mocked runtime) | `tests/hooks/*.test.ts` | `pnpm test` | No |
| Live authorization | `tests/integration/access_rules.live.test.ts` | `pnpm test:live` | **Staging PocketBase** (skipped without env vars) |
| Manual | checklist below | — | Skip project, Telegram, Roboflow |

## What is covered

* **Classification & pricing:** grade boundaries (0, 4, 5, 12, 13, 26, 27, 160, 10 000 equivalents),
  equivalence ratios, single / multiple / unknown classes, A–D multipliers, saca ↔ kg conversion,
  cache vs fallback reference, extreme and invalid values.
* **Roboflow handling:** valid response, zero detections, empty / invalid / non-object payloads,
  workflow-style outputs, malformed predictions, missing image size, low confidence, HTTP 503,
  network exception, missing API key (no outbound call) — and that **the API key never appears**
  in persisted data or logs.
* **Agent actions:** whitelisted fields only; attempts to change `user_id`, `score`, `grade`,
  `defects`, `status`, `image`, `__proto__` are rejected; unknown types, injected ids, invalid
  weight/price/variety/slug; confirmation TTL.
* **Telegram webhook (real hook file, mocked runtime):** missing/wrong secret → 401 with no side
  effects; fail-closed when unconfigured; group chats and malformed updates ignored; duplicate
  `update_id` processed once; mass-assignment blocked; whitelisted update applied after “sim”;
  cannot delete another user's sample even by exact id; `delete_all` limited to own samples;
  expired confirmation not executed; “não” cancels.
* **Authorization rules:** executes every migration against a recording mock and asserts the
  *final* rules (owner binding on create, server-field locks, server-only collections, no
  hardcoded passwords). Verified to **fail** when migration `0042` is removed.
* **Dashboard:** total defects = sum of occurrences (regression for the category-count bug);
  average score ignores pending/error samples.

## What the tests do **not** prove

* Real computer-vision accuracy (all inference responses are mocked; see the evaluation procedure
  in [AI_INTEGRATIONS](AI_INTEGRATIONS.md#accuracy--evaluation)).
* PocketBase's own rule engine (only the live suite exercises it).
* Skip `$ai` behaviour, LLM answer quality, or prompt-injection resistance of the model.
* React component rendering (no component tests yet).

## Manual checklist (staging)

1. Sign up, sign in, sign out; expired session redirects to login.
2. New analysis with a valid photo → pending state → result with boxes and experimental notice.
3. Upload a non-coffee photo → `no_detections` warning shown.
4. Remove `ROBOFLOW_API_KEY` → sample ends in error state with a readable message.
5. Dashboard totals match the sum of defects in History.
6. The market-price refresh button shows the cache notice (no claim of live data).
7. Telegram: link account, send photo with name/weight, choose variety, receive result.
8. Telegram: ask Albert to rename a sample → confirm “sim” → name changes; ask to change the
   score → refused.
9. Telegram: replay the same update payload → processed once.
10. `curl` the webhook without the secret header → `401`.
