#!/bin/bash

# Script para crear usuario admin inicial
# Uso: ./create-admin.sh [password]

set -e

# Password por defecto o el que se pase como argumento
PASSWORD=${1:-admin2026}

echo "Generando hash bcrypt para password: $PASSWORD"

# Generar hash usando Node.js en el contenedor
HASH=$(docker compose exec -T valsys node -e "
try {
  const bcrypt = require('bcryptjs');
  console.log(bcrypt.hashSync('$PASSWORD', 10));
} catch(e) {
  // Si bcryptjs no está disponible, usar crypto nativo
  const crypto = require('crypto');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('$PASSWORD', salt, 100000, 64, 'sha512').toString('hex');
  console.log('pbkdf2:' + salt + ':' + hash);
}
")

if [ -z "$HASH" ]; then
    echo "Error: No se pudo generar el hash"
    exit 1
fi

echo "Hash generado: $HASH"

# Crear archivo SQL temporal
TEMP_SQL=$(mktemp)
cat > $TEMP_SQL << EOF
INSERT INTO users (id, username, full_name, email, password_hash, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin',
    'Administrador',
    'admin@agrogas.online',
    '$HASH',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (username) DO NOTHING;
EOF

echo "Insertando usuario admin en la base de datos..."
docker compose exec -T postgres psql -U admin -d sistema_valvulas < $TEMP_SQL

rm $TEMP_SQL

echo ""
echo "✓ Usuario admin creado exitosamente"
echo "  Username: admin"
echo "  Email: admin@agrogas.online"
echo "  Password: $PASSWORD"
echo ""
echo "IMPORTANTE: Cambia este password después del primer login"
