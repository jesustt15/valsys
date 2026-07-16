#!/bin/bash

# ============================================
# Script de Deploy - Valsys
# Uso: ./deploy.sh
# ============================================

set -e  # Salir si hay error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de ayuda
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}→ $1${NC}"
}

# ============================================
# PASO 1: Verificar requisitos
# ============================================
print_header "PASO 1: Verificando requisitos"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    print_info "Instalar con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
print_success "Docker instalado: $(docker --version)"

# Verificar Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose no está instalado"
    exit 1
fi
print_success "Docker Compose instalado: $(docker compose version)"

# Verificar .env
if [ ! -f .env ]; then
    print_error "Archivo .env no encontrado"
    print_info "Copiar .env.example a .env y configurar las variables"
    print_info "cp .env.example .env && nano .env"
    exit 1
fi
print_success "Archivo .env encontrado"

# Verificar que CLOUDFLARE_TUNNEL_TOKEN esté configurado
if grep -q "CLOUDFLARE_TUNNEL_TOKEN=<pegar-token-aqui>" .env; then
    print_warning "CLOUDFLARE_TUNNEL_TOKEN no está configurado"
    print_info "Editar .env y agregar el token de Cloudflare Tunnel"
    read -p "¿Continuar sin túnel? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# ============================================
# PASO 2: Detener servicios existentes
# ============================================
print_header "PASO 2: Deteniendo servicios existentes"

docker compose down || true
print_success "Servicios detenidos"

# ============================================
# PASO 3: Limpiar imágenes antiguas (opcional)
# ============================================
print_header "PASO 3: Limpiando caché de Docker"

read -p "¿Limpiar caché de Docker? (recomendado si hay errores) (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker system prune -f
    print_success "Caché limpiado"
else
    print_info "Saltando limpieza de caché"
fi

# ============================================
# PASO 4: Construir imágenes
# ============================================
print_header "PASO 4: Construyendo imágenes de Docker"

print_info "Esto puede tardar varios minutos..."
docker compose build

if [ $? -eq 0 ]; then
    print_success "Imágenes construidas exitosamente"
else
    print_error "Error construyendo imágenes"
    exit 1
fi

# ============================================
# PASO 5: Levantar servicios
# ============================================
print_header "PASO 5: Levantando servicios"

docker compose up -d

if [ $? -eq 0 ]; then
    print_success "Servicios levantados"
else
    print_error "Error levantando servicios"
    docker compose logs
    exit 1
fi

# ============================================
# PASO 6: Esperar a que PostgreSQL esté listo
# ============================================
print_header "PASO 6: Esperando a que PostgreSQL esté listo"

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker compose exec -T postgres pg_isready -U admin > /dev/null 2>&1; then
        print_success "PostgreSQL está listo"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo -ne "\rEsperando... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    print_error "PostgreSQL no respondió después de $MAX_ATTEMPTS intentos"
    docker compose logs postgres
    exit 1
fi

# ============================================
# PASO 7: Aplicar migraciones
# ============================================
print_header "PASO 7: Aplicando migraciones de base de datos"

print_info "Aplicando migraciones..."
docker compose exec -T valsys sh -c "cd front && pnpm drizzle-kit push"

if [ $? -eq 0 ]; then
    print_success "Migraciones aplicadas"
else
    print_warning "Error aplicando migraciones (puede ser que ya estén aplicadas)"
fi

# ============================================
# PASO 8: Verificar estado de servicios
# ============================================
print_header "PASO 8: Verificando estado de servicios"

docker compose ps

echo ""
print_info "Verificando logs de la aplicación..."
sleep 3
docker compose logs --tail=20 valsys

# ============================================
# PASO 9: Verificar túnel de Cloudflare
# ============================================
print_header "PASO 9: Verificando túnel de Cloudflare"

if docker compose ps cloudflared | grep -q "Up"; then
    print_success "Túnel de Cloudflare está corriendo"
    print_info "Verificando conexión..."
    sleep 5
    docker compose logs --tail=10 cloudflared
else
    print_warning "Túnel de Cloudflare no está corriendo"
    print_info "Verificar que CLOUDFLARE_TUNNEL_TOKEN esté configurado en .env"
fi

# ============================================
# PASO 10: Resumen final
# ============================================
print_header "DEPLOY COMPLETADO"

print_success "Todos los servicios están corriendo"
echo ""
print_info "Próximos pasos:"
echo "  1. Verificar que la app esté accesible en: https://app.agrogas.online"
echo "  2. Si es la primera vez, crear usuario admin:"
echo "     docker compose exec valsys sh"
echo "     cd front && node -e \"..."
echo ""
echo "  3. Crear bucket en MinIO:"
echo "     Acceder a: https://storage-console.agrogas.online"
echo "     Usuario: admin_minio"
echo "     Contraseña: (la que pusiste en .env)"
echo ""
echo "  4. Ver logs en tiempo real:"
echo "     docker compose logs -f"
echo ""
print_info "Comandos útiles:"
echo "  - Ver estado: docker compose ps"
echo "  - Ver logs: docker compose logs -f"
echo "  - Reiniciar: docker compose restart"
echo "  - Detener: docker compose down"
echo ""
