-- Step 1: Create new enum with temporary name
DO $$ BEGIN
  CREATE TYPE cylinder_status_new AS ENUM ('activo', 'en_certificacion', 'de_baja');
END $$;

-- Step 2: Update column to use new enum, mapping old values
ALTER TABLE gnc_cylinders
  ALTER COLUMN status TYPE cylinder_status_new
  USING CASE status::text
    WHEN 'instalado' THEN 'activo'::cylinder_status_new
    WHEN 'reinstalado' THEN 'activo'::cylinder_status_new
    WHEN 'desmontado' THEN 'en_certificacion'::cylinder_status_new
    WHEN 'en_planta' THEN 'en_certificacion'::cylinder_status_new
    WHEN 'pendiente_reinstalacion' THEN 'en_certificacion'::cylinder_status_new
    WHEN 'condenado' THEN 'de_baja'::cylinder_status_new
  END;

-- Step 3: Drop old enum
DROP TYPE cylinder_status;

-- Step 4: Rename new enum to original name
ALTER TYPE cylinder_status_new RENAME TO cylinder_status;

-- Step 5: Update default value
ALTER TABLE gnc_cylinders
  ALTER COLUMN status SET DEFAULT 'activo';
