-- Migration 0001: Add 'desmontado' to cylinder_status enum + align orphaned cylinders
-- This migration adds the new 'desmontado' status and transitions any cylinders that
-- are logically desmontado (instalado cylinders on vehicles with inspeccion_inicial)
-- to the new status.

-- Step 1: Add 'desmontado' to the cylinder_status enum
ALTER TYPE "cylinder_status" ADD VALUE IF NOT EXISTS 'desmontado';

-- Step 2: Align orphaned cylinders — any 'instalado' cylinder belonging to a vehicle
-- that has an inspection in 'inspeccion_inicial' status should be 'desmontado'.
-- This handles the case where cylinders were created as 'instalado' but the inspection
-- workflow expects them to be 'desmontado' after initial inspection creation.
UPDATE "gnc_cylinders"
SET "status" = 'desmontado', "updated_at" = NOW()
WHERE "status" = 'instalado'
  AND "vehicle_id" IN (
    SELECT "vehicle_id"
    FROM "inspections"
    WHERE "status" = 'inspeccion_inicial'
  );
