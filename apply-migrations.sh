#!/bin/bash

# Aplicar todas las migraciones de base de datos en orden
# Uso: ./apply-migrations.sh

set -e

echo "Aplicando migraciones de base de datos..."

# Obtener lista de archivos SQL en orden
MIGRATIONS_DIR="front/db/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Directorio de migraciones no encontrado en $MIGRATIONS_DIR"
    exit 1
fi

# Aplicar cada migración
for migration in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    filename=$(basename $migration)
    echo "Aplicando: $filename"
    docker compose exec -T postgres psql -U admin -d sistema_valvulas < $migration
    echo "✓ $filename aplicada"
    echo ""
done

echo "Todas las migraciones aplicadas exitosamente"
