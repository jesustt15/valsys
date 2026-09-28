import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mock infrastructure for @/lib/db ────────────────────────────────
// vi.hoisted() runs before any imports, making these available in vi.mock factories.
// The service uses Drizzle's chained query builder:
//   db.select(...).from(...).where(...).limit(1)  → awaited → row[]
//   db.update(...).set(...).where(...)            → awaited → void
//   db.update(...).set(...).where(...).returning() → awaited → row[]
//   db.transaction(async (tx) => { tx.select(...)... })
//
// We mock `db` as a thenable builder that drains a result queue on `await`.

const { queryResults, mockDb } = vi.hoisted(() => {
  const queryResults: unknown[] = []

  function createChain(): any {
    const c: any = {
      then(onFulfilled: (v: unknown) => unknown) {
        return Promise.resolve(onFulfilled(queryResults.shift()))
      },
    }
    for (const m of [
      'select', 'from', 'where', 'limit', 'set', 'returning',
      'update', 'insert', 'values', 'orderBy',
    ]) {
      c[m] = vi.fn().mockReturnValue(c)
    }
    return c
  }

  const chain = createChain()
  const mockDb = {
    ...chain,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(createChain())),
  }

  return { queryResults, mockDb }
})

vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/db/schema', () => ({
  gncCylinders: {
    id: 'id', status: 'status', vehicleId: 'vehicleId',
    initialSerial: 'initialSerial', updatedAt: 'updatedAt',
    updatedBy: 'updatedBy', createdAt: 'createdAt',
    actualSerial: 'actualSerial', lastRecalificationDate: 'lastRecalificationDate',
  },
  inspections: { id: 'id', vehicleId: 'vehicleId', status: 'status' },
}))

// Import AFTER vi.mock so the service picks up the mocked db
import {
  assertCylinderOwnership,
  BusinessError,
  unlinkCylinderFromVehicle,
  sendCylinderToPlant,
  bulkReceiveCylindersFromPlant,
} from './cylinder'

describe('cylinder service guards (pure)', () => {
  // ─── assertCylinderOwnership ──────────────────────────────────────────

  describe('assertCylinderOwnership', () => {
    const vehicleId = 'vehicle-1'
    const otherVehicleId = 'vehicle-2'
    const serial = 'SN-001'

    it('passes when cylinder belongs to vehicle and has expected status', () => {
      expect(() =>
        assertCylinderOwnership(
          [{ vehicleId, status: 'activo', initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        ),
      ).not.toThrow()
    })

    it('throws BusinessError when cylinder belongs to a different vehicle', () => {
      expect(() =>
        assertCylinderOwnership(
          [{ vehicleId: otherVehicleId, status: 'activo', initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        ),
      ).toThrow(BusinessError)
      try {
        assertCylinderOwnership(
          [{ vehicleId: otherVehicleId, status: 'activo', initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        )
      } catch (e) {
        expect((e as BusinessError).message).toContain(serial)
        expect((e as BusinessError).message).toContain('no pertenece')
      }
    })

    it('throws BusinessError with status label when status does not match', () => {
      try {
        assertCylinderOwnership(
          [{ vehicleId, status: 'de_baja', initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        )
        expect.unreachable('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessError)
        expect((e as BusinessError).message).toContain('no está activo')
        expect((e as BusinessError).message).toContain('de_baja')
      }
    })

    it('FAILS CLOSED: rejects when inspection.vehicleId is null', () => {
      // G1: null===null must NOT pass
      expect(() =>
        assertCylinderOwnership(
          [{ vehicleId: null, status: 'activo', initialSerial: serial }],
          { vehicleId: null },
          'activo',
          'no está activo',
        ),
      ).toThrow(BusinessError)
      try {
        assertCylinderOwnership(
          [{ vehicleId: null, status: 'activo', initialSerial: serial }],
          { vehicleId: null },
          'activo',
          'no está activo',
        )
      } catch (e) {
        expect((e as BusinessError).message).toContain('no tiene vehículo')
      }
    })

    it('FAILS CLOSED: rejects when cylinder.vehicleId is null but inspection has one', () => {
      expect(() =>
        assertCylinderOwnership(
          [{ vehicleId: null, status: 'activo', initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        ),
      ).toThrow(BusinessError)
    })

    it('handles null status gracefully (shows "sin estado registrado")', () => {
      try {
        assertCylinderOwnership(
          [{ vehicleId, status: null, initialSerial: serial }],
          { vehicleId },
          'activo',
          'no está activo',
        )
        expect.unreachable('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessError)
        expect((e as BusinessError).message).toContain('sin estado registrado')
      }
    })

    it('checks ALL cylinders — rejects batch if any single cylinder fails', () => {
      const cylinders = [
        { vehicleId, status: 'activo', initialSerial: 'SN-001' },
        { vehicleId, status: 'activo', initialSerial: 'SN-002' },
        { vehicleId, status: 'de_baja', initialSerial: 'SN-003' }, // bad
      ]
      try {
        assertCylinderOwnership(cylinders, { vehicleId }, 'activo', 'no está activo')
        expect.unreachable('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessError)
        expect((e as BusinessError).message).toContain('SN-003')
      }
    })

    it('passes for batch when all cylinders match', () => {
      const cylinders = [
        { vehicleId, status: 'en_certificacion', initialSerial: 'SN-001' },
        { vehicleId, status: 'en_certificacion', initialSerial: 'SN-002' },
      ]
      expect(() =>
        assertCylinderOwnership(cylinders, { vehicleId }, 'en_certificacion', 'no está en certificación'),
      ).not.toThrow()
    })
  })

  // ─── BusinessError sentinel ───────────────────────────────────────────

  describe('BusinessError', () => {
    it('is an instance of Error', () => {
      const e = new BusinessError('test')
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(BusinessError)
    })

    it('has name BusinessError', () => {
      const e = new BusinessError('test')
      expect(e.name).toBe('BusinessError')
    })

    it('preserves the message', () => {
      const e = new BusinessError('algo salió mal')
      expect(e.message).toBe('algo salió mal')
    })
  })
})

// ─── Service-level tests with mocked db ──────────────────────────────────────
//
// These tests call the REAL production functions from ./cylinder.ts.
// The only mocked boundary is `@/lib/db` (no real DB connection).
// The queryResults queue is drained in order by the thenable chain mock.

describe('unlinkCylinderFromVehicle (service-level)', () => {
  beforeEach(() => {
    queryResults.length = 0
    vi.clearAllMocks()
  })

  it('rejects when cylinder status is activo', async () => {
    queryResults.push(
      [{ status: 'inspeccion_inicial', vehicleId: 'v1' }], // inspection
      [{ status: 'activo', vehicleId: 'v1', initialSerial: 'SN-001' }], // cylinder
    )
    const result = await unlinkCylinderFromVehicle('c1', 'i1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Solo cilindros en certificación/)
    expect(result.error).toMatch(/SN-001/)
  })

  it('rejects when cylinder status is de_baja', async () => {
    queryResults.push(
      [{ status: 'inspeccion_inicial', vehicleId: 'v1' }],
      [{ status: 'de_baja', vehicleId: 'v1', initialSerial: 'SN-002' }],
    )
    const result = await unlinkCylinderFromVehicle('c1', 'i1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Solo cilindros en certificación/)
  })

  it('allows en_certificacion and reaches the UPDATE', async () => {
    queryResults.push(
      [{ status: 'inspeccion_inicial', vehicleId: 'v1' }],
      [{ status: 'en_certificacion', vehicleId: 'v1', initialSerial: 'SN-003' }],
      undefined, // update returns void
    )
    const result = await unlinkCylinderFromVehicle('c1', 'i1')
    expect(result.success).toBe(true)
    // Verify update was actually called (reached the DB write)
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('rejects when cylinder vehicle ≠ inspection vehicle', async () => {
    queryResults.push(
      [{ status: 'inspeccion_inicial', vehicleId: 'v1' }],
      [{ status: 'en_certificacion', vehicleId: 'v-OTHER', initialSerial: 'SN-004' }],
    )
    const result = await unlinkCylinderFromVehicle('c1', 'i1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no pertenece/)
  })

  it('fail-closed when inspection.vehicleId is null', async () => {
    queryResults.push(
      [{ status: 'inspeccion_inicial', vehicleId: null }],
    )
    const result = await unlinkCylinderFromVehicle('c1', 'i1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no tiene vehículo/)
  })
})

describe('sendCylinderToPlant (service-level)', () => {
  beforeEach(() => {
    queryResults.length = 0
    vi.clearAllMocks()
  })

  it('returns error when concurrent transition causes 0-row UPDATE returning', async () => {
    queryResults.push(
      [{ vehicleId: 'v1' }], // inspection
      [{ status: 'activo', vehicleId: 'v1', initialSerial: 'SN-010' }], // cylinder
      [], // update.returning → 0 rows (concurrent transition)
    )
    const result = await sendCylinderToPlant({
      cylinderId: 'c1',
      inspectionId: 'i1',
      sentAt: new Date('2026-01-01'),
      updatedBy: 'user-1',
    })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cambió/)
  })
})

describe('bulkReceiveCylindersFromPlant (service-level)', () => {
  beforeEach(() => {
    queryResults.length = 0
    vi.clearAllMocks()
  })

  it('returns error with operator-facing message on affected-count mismatch inside tx', async () => {
    // Queue results for the tx callback: inspection → cylinders → update returning (0 rows)
    queryResults.push(
      [{ vehicleId: 'v1' }], // tx.select inspection
      [ // tx.select cylinders (1 found)
        { id: 'c1', status: 'en_certificacion', vehicleId: 'v1', initialSerial: 'SN-020' },
      ],
      [], // tx.update.returning → 0 rows (mismatch: expected 1, got 0)
    )
    const result = await bulkReceiveCylindersFromPlant({
      cylinderIds: ['c1'],
      inspectionId: 'i1',
      result: 'bueno',
      receivedAt: new Date('2026-01-01'),
      updatedBy: 'user-1',
    })
    expect(result.success).toBe(false)
    // Operator-facing message must include count mismatch details
    expect(result.error).toMatch(/Se esperaba actualizar 1/)
    expect(result.error).toMatch(/se actualizaron 0/)
    expect(result.error).toMatch(/Reintente/)
  })
})
