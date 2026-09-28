-- Step 1: Update existing data to use new values
UPDATE gnc_cylinders SET status = 'activo' WHERE status IN ('instalado', 'reinstalado');
UPDATE gnc_cylinders SET status = 'en_certificacion' WHERE status IN ('desmontado', 'en_planta', 'pendiente_reinstalacion');
UPDATE gnc_cylinders SET status = 'de_baja' WHERE status = 'condenado';

-- Step 2: Drop old enum (cascade to remove dependencies)
DROP TYPE IF EXISTS cylinder_status CASCADE;

-- Step 3: Rename new enum to original name
ALTER TYPE cylinder_status_new RENAME TO cylinder_status;

-- Step 4: Convert column to use the enum type
ALTER TABLE gnc_cylinders 
  ALTER COLUMN status TYPE cylinder_status 
  USING status::text::cylinder_status;

-- Step 5: Set default value
ALTER TABLE gnc_cylinders 
  ALTER COLUMN status SET DEFAULT 'activo';
