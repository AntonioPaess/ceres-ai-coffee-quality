/**
 * LIVE authorization tests against a real PocketBase with this repo's migrations applied.
 * Skipped unless PB_TEST_URL and two DISPOSABLE test accounts are provided. Never point at production.
 *   PB_TEST_URL=http://127.0.0.1:8090 PB_TEST_USER_A=a@test.local PB_TEST_USER_B=b@test.local \
 *   PB_TEST_PASSWORD=... pnpm test:live
 */
import PocketBase from 'pocketbase'
import { describe, expect, it } from 'vitest'

const { PB_TEST_URL, PB_TEST_USER_A, PB_TEST_USER_B, PB_TEST_PASSWORD } = process.env
const enabled = !!(PB_TEST_URL && PB_TEST_USER_A && PB_TEST_USER_B && PB_TEST_PASSWORD)
const PNG = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))], { type: 'image/png' })

async function login(email: string) {
  const pb = new PocketBase(PB_TEST_URL)
  await pb.collection('users').authWithPassword(email, PB_TEST_PASSWORD!)
  return pb
}
const form = (o: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) f.append(k, v)
  f.append('image', PNG, 'x.png')
  return f
}

describe.skipIf(!enabled)('PocketBase authorization (live)', () => {
  it('owner can create; spoofed owner, forged score and anonymous access are rejected', async () => {
    const a = await login(PB_TEST_USER_A!)
    const b = await login(PB_TEST_USER_B!)
    const anon = new PocketBase(PB_TEST_URL)
    const mine = await a.collection('samples').create(form({ user_id: a.authStore.record!.id, name: 'live-test', variety: 'Arábica' }))
    await expect(a.collection('samples').create(form({ user_id: b.authStore.record!.id, name: 'spoof' }))).rejects.toBeTruthy()
    await expect(a.collection('samples').create(form({ user_id: a.authStore.record!.id, name: 'x', score: '100' }))).rejects.toBeTruthy()
    await expect(b.collection('samples').getOne(mine.id)).rejects.toBeTruthy()
    await expect(b.collection('samples').update(mine.id, { name: 'hijack' })).rejects.toBeTruthy()
    await expect(b.collection('samples').delete(mine.id)).rejects.toBeTruthy()
    await expect(a.collection('samples').update(mine.id, { grade: 'A' })).rejects.toBeTruthy()
    await expect(a.collection('samples').update(mine.id, { user_id: b.authStore.record!.id })).rejects.toBeTruthy()
    await expect(anon.collection('samples').getList()).resolves.toMatchObject({ totalItems: 0 })
    await expect(anon.collection('samples').create(form({ user_id: a.authStore.record!.id, name: 'anon' }))).rejects.toBeTruthy()
    await a.collection('samples').delete(mine.id)
  })
})
