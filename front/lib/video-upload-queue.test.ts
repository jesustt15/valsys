import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock server-side modules so the queue module can be imported in Node test env.
vi.mock('@/lib/actions/inspection', () => ({
  uploadInspectionVideoAction: vi.fn(async () => ({
    success: true,
    data: { attachmentId: 'att-test' },
  })),
}))
vi.mock('@/lib/actions/video-error-log', () => ({
  logClientVideoErrorAction: vi.fn(async () => {}),
}))

// jsdom doesn't provide localStorage until we stub it; Node test env may lack it too.
const storage: Record<string, string> = {}
const localStorageStub = {
  getItem: (k: string) => (k in storage ? storage[k] : null),
  setItem: (k: string, v: string) => {
    storage[k] = v
  },
  removeItem: (k: string) => {
    delete storage[k]
  },
  clear: () => {
    for (const k of Object.keys(storage)) delete storage[k]
  },
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageStub,
  configurable: true,
})

// Reset the module between tests so the singleton doesn't leak state.
async function loadFreshQueue() {
  vi.resetModules()
  const mod = await import('@/lib/video-upload-queue')
  return mod.queue
}

function makeFile(name = 'v.mp4', size = 1024): File {
  const blob = new Blob([new Uint8Array(size)])
  return new File([blob], name, { type: 'video/mp4' })
}

describe('video-upload-queue state machine', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('remove() is scoped to the specific item — does not wipe other inspections (P0-4)', async () => {
    const q = await loadFreshQueue()
    const file1 = makeFile('a.mp4')
    const file2 = makeFile('b.mp4')
    q.enqueue('insp-A', 'initial', file1)
    q.enqueue('insp-B', 'initial', file2)

    const itemsBefore = q.getItems()
    expect(itemsBefore).toHaveLength(2)

    // Remove insp-A's item.
    q.remove(itemsBefore[0].id)

    // insp-B's item must still be there (in memory AND persisted).
    const remaining = q.getItems()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].inspectionId).toBe('insp-B')

    // Persisted store must also still have insp-B's entry.
    const { getPersistedQueue } = await import('@/lib/video-upload-queue')
    expect(getPersistedQueue('insp-B')).toHaveLength(1)
    expect(getPersistedQueue('insp-A')).toHaveLength(0)
  })

  it('retry() is a no-op when item is compressing/uploading (P0-2)', async () => {
    const q = await loadFreshQueue()
    const file = makeFile()
    const id = q.enqueue('insp-1', 'initial', file)

    // Force stage to 'compressing' (normally done by processItem).
    const item = q.getItems().find((i) => i.id === id)!
    // @ts-expect-error — reach into queue internals for test
    const rawItem = q['items'].find((i: { id: string }) => i.id === id)
    if (rawItem) rawItem.stage = 'compressing'

    await q.retry(id, makeFile())
    const after = q.getItems().find((i) => i.id === id)!
    // Stage must NOT have been reset to 'queued' — retry was rejected.
    expect(after.stage).toBe('compressing')
    void item
  })

  it('revive() re-inserts a persisted-only item into the live queue (P0-2)', async () => {
    const q = await loadFreshQueue()
    // No live items — but persisted state holds one.
    const { getPersistedQueue } = await import('@/lib/video-upload-queue')
    localStorage.setItem(
      'valsys:video-queue',
      JSON.stringify({
        'insp-9': [
          {
            id: 'vq-old-1',
            inspectionId: 'insp-9',
            fileName: 'old.mp4',
            fileSize: 2048,
            category: 'initial',
            stage: 'error',
            error: 'Sesión interrumpida',
            startedAt: Date.now() - 1000,
          },
        ],
      }),
    )
    expect(getPersistedQueue('insp-9')).toHaveLength(1)
    expect(q.getItems()).toHaveLength(0)

    // User picks a new file for that persisted entry.
    const meta = getPersistedQueue('insp-9')[0]
    q.revive('insp-9', meta, makeFile('new.mp4'))

    // The item is now live. It may be 'queued' or already processing (the
    // queue auto-starts on revive); the key invariant is that the id matches
    // and the error is cleared.
    const live = q.getItems()
    expect(live).toHaveLength(1)
    expect(live[0].id).toBe('vq-old-1')
    expect(live[0].fileName).toBe('new.mp4')
    expect(live[0].error).toBeNull()
    expect(['queued', 'compressing', 'uploading', 'attached']).toContain(live[0].stage)
  })

  it('getItems() returns a CACHED snapshot (stable identity across reads) (P1-13)', async () => {
    const q = await loadFreshQueue()
    const snap1 = q.getItems()
    const snap2 = q.getItems()
    // Without any mutation, the two getSnapshot() calls must return the
    // SAME array reference (P1-13 fix prevents infinite render loops).
    expect(snap1).toBe(snap2)
  })

  it('getItemsFor() returns a CACHED per-inspection slice (P1-13)', async () => {
    const q = await loadFreshQueue()
    const slice1 = q.getItemsFor('insp-x')
    const slice2 = q.getItemsFor('insp-x')
    // Stable identity until a mutation occurs.
    expect(slice1).toBe(slice2)
  })

  it('remove() purges persisted-only items (no in-memory match) (fix-1)', async () => {
    const q = await loadFreshQueue()
    // Seed a persisted-only item (no live counterpart).
    localStorage.setItem(
      'valsys:video-queue',
      JSON.stringify({
        'insp-7': [
          {
            id: 'vq-persisted-1',
            inspectionId: 'insp-7',
            fileName: 'ghost.mp4',
            fileSize: 4096,
            category: 'initial',
            stage: 'error',
            error: 'whatever',
            startedAt: Date.now() - 1000,
          },
        ],
      }),
    )
    const { getPersistedQueue } = await import('@/lib/video-upload-queue')
    expect(getPersistedQueue('insp-7')).toHaveLength(1)

    // Remove by id — even though no live item has that id, the persisted
    // entry must be cleared.
    q.remove('vq-persisted-1')
    expect(getPersistedQueue('insp-7')).toHaveLength(0)
  })

  it('sweep() prunes attached entries older than 7 days (suggestion-8)', async () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem(
      'valsys:video-queue',
      JSON.stringify({
        'insp-8': [
          {
            id: 'vq-old-attached',
            inspectionId: 'insp-8',
            fileName: 'old.mp4',
            fileSize: 1024,
            category: 'initial',
            stage: 'attached', // terminal
            error: null,
            startedAt: eightDaysAgo,
          },
          {
            id: 'vq-fresh-attached',
            inspectionId: 'insp-8',
            fileName: 'new.mp4',
            fileSize: 1024,
            category: 'initial',
            stage: 'attached',
            error: null,
            startedAt: Date.now() - 1000,
          },
        ],
      }),
    )
    // Re-import triggers constructor which runs sweep.
    const q = await loadFreshQueue()
    void q
    const { getPersistedQueue } = await import('@/lib/video-upload-queue')
    const remaining = getPersistedQueue('insp-8')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('vq-fresh-attached')
  })

  it('sweep() marks stale non-terminal items as error', async () => {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000
    localStorage.setItem(
      'valsys:video-queue',
      JSON.stringify({
        'insp-stale': [
          {
            id: 'vq-stale-1',
            inspectionId: 'insp-stale',
            fileName: 'stale.mp4',
            fileSize: 1024,
            category: 'initial',
            stage: 'queued', // non-terminal
            error: null,
            startedAt: twentyFiveHoursAgo,
          },
        ],
      }),
    )
    const q = await loadFreshQueue()
    void q
    const { getPersistedQueue } = await import('@/lib/video-upload-queue')
    const remaining = getPersistedQueue('insp-stale')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].stage).toBe('error')
    expect(remaining[0].error).toMatch(/Sesión interrumpida/)
  })
})
