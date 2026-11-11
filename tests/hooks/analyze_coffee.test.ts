/**
 * Runs the REAL pocketbase/hooks/analyze_coffee.js against mocked PocketBase globals and a
 * mocked Roboflow. Proves control flow & persistence — NOT computer-vision accuracy.
 */
import { describe, expect, it } from 'vitest'
import { loadHook, makeRecord } from '../helpers/pb-harness'

const SECRETS = { ROBOFLOW_API_KEY: 'rf_SECRET', PB_INSTANCE_URL: 'https://pb.example' }

function run(http?: Parameters<typeof loadHook>[1]['http'], secrets: Record<string, string> = SECRETS, cachePerSaca?: number) {
  const sample = makeRecord('samples', { user_id: 'u1', image: 'bean.jpg', status: 'pending' }, 'sampleid0000001')
  const records: Record<string, ReturnType<typeof makeRecord>[]> = { samples: [sample] }
  if (cachePerSaca) records.market_price_cache = [makeRecord('market_price_cache', { rawValue: cachePerSaca, source: 'CEPEA' })]
  const h = loadHook('analyze_coffee.js', { secrets, http, records })
  h.handlers.recordAfterCreate!({ record: sample, next: () => undefined })
  const logs = h.store.action_logs || []
  return { sample, h, logs }
}

const ok = (json: unknown) => () => ({ statusCode: 200, json })

describe('analyze_coffee hook', () => {
  it('persists a completed analysis with deterministic score/grade/price', () => {
    const { sample, h } = run(
      ok({ image: { width: 800, height: 600 }, predictions: Array(5).fill({ class: 'black', confidence: 0.9, x: 1, y: 1, width: 2, height: 2 }) }),
      SECRETS,
      1800,
    )
    expect(sample.data).toMatchObject({ status: 'completed', grade: 'B', score: 78, imageOriginalWidth: 800 })
    expect(sample.data.price as number).toBeCloseTo((1800 / 60) * 1.15)
    expect(h.httpCalls[0].url).toContain('detect.roboflow.com/coffee-bean-defects-nbrvd/1')
  })

  it('uses the fallback price when there is no cache', () => {
    const { sample } = run(ok({ image: { width: 1, height: 1 }, predictions: [] }))
    expect(sample.data.price as number).toBeCloseTo((1650 / 60) * 1.4)
    expect((sample.data.defects as { warnings: string[] }).warnings).toContain('no_detections')
  })

  it.each([
    ['API unavailable (503)', () => ({ statusCode: 503, body: 'down api_key=rf_SECRET' })],
    ['empty response', () => ({ statusCode: 200, json: null })],
    ['invalid response', ok({ message: 'not an inference' })],
    ['network failure', () => { throw new Error('dial tcp: timeout ?api_key=rf_SECRET') }],
  ])('marks the sample as error on %s, never leaking the key', (_n, http) => {
    const { sample, h, logs } = run(http as never)
    expect(sample.data).toMatchObject({ status: 'error', grade: 'Erro', score: 0, price: 0 })
    const persisted = JSON.stringify([sample.data, logs.map((l) => l.data), h.logs])
    expect(persisted).not.toContain('rf_SECRET')
  })

  it('fails safely when the Roboflow key is not configured (no external call)', () => {
    const { sample, h } = run(undefined, { PB_INSTANCE_URL: 'x' })
    expect(sample.data.status).toBe('error')
    expect(h.httpCalls).toHaveLength(0)
  })
})
