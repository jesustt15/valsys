# Guía de Despliegue - Valsys en Servidor Propio

## Requisitos Previos
- Servidor Linux con Docker y Docker Compose instalados
- Dominio `agrogas.online` configurado en Cloudflare
- Acceso SSH al servidor
- Token de túnel de Cloudflare

---

## PASO 1: Preparar el Servidor

### 1.1 Conectarse por SSH
```bash
ssh usuario@IP_DEL_SERVIDOR
```

### 1.2 Verificar Docker
```bash
docker --version
docker compose version
```

Deberías ver algo como:
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

### 1.3 Crear directorio del proyecto
```bash
mkdir -p ~/valsys
cd ~/valsys
```

---

## PASO 2: Subir el Código al Servidor

### Opción A: Usando Git (Recomendado)
```bash
# En el servidor
cd ~/valsys
git clone https://github.com/TU_USUARIO/valsys.git .
```

### Opción B: Usando SCP (desde tu máquina local)
```bash
# En tu máquina local (Windows)
scp -r C:\Users\Usuario\Documents\valsys usuario@IP_DEL_SERVIDOR:~/valsys
```

### Opción C: Usando rsync (más eficiente)
```bash
# En tu máquina local
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  C:/Users/Usuario/Documents/valsys/ usuario@IP_DEL_SERVIDOR:~/valsys/
```

---

## PASO 3: Configurar Variables de Entorno

### 3.1 Crear archivo .env
```bash
cd ~/valsys
nano .env
```

### 3.2 Copiar y editar el contenido
```env
# ============================================
# BASE DE DATOS
# ============================================
DATABASE_URL=postgres://admin:CAMBIAR_ESTO_POR_PASSWORD_SEGURO@postgres:5432/sistema_valvulas

# ============================================
# MINIO (Almacenamiento de archivos)
# ============================================
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=admin_minio
MINIO_SECRET_KEY=CAMBIAR_ESTO_POR_PASSWORD_SEGURO
MINIO_BUCKET=valsys

# ============================================
# MEILISEARCH (Búsqueda)
# ============================================
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=CAMBIAR_ESTO_POR_PASSWORD_SEGURO

# ============================================
# AUTENTICACIÓN
# ============================================
# Generar con: openssl rand -base64 32
JWT_SECRET=PEGAR_AQUI_STRING_ALEATORIO_DE_32_CARACTERES

# ============================================
# NEXT.JS
# ============================================
HOSTNAME=0.0.0.0
PORT=3000
NODE_ENV=production

# ============================================
# CLOUDFLARE TUNNEL
# ============================================
CLOUDFLARE_TUNNEL_TOKEN=PEGAR_TOKEN_AQUI
```

### 3.3 Generar contraseñas seguras
```bash
# Para DATABASE_URL, MINIO_SECRET_KEY, MEILI_MASTER_KEY
openssl rand -base64 24

# Para JWT_SECRET
openssl rand -base64 32
```

**IMPORTANTE:** Guarda estas contraseñas en un lugar seguro. Las vas a necesitar para acceder a las bases de datos.

---

## PASO 4: Configurar Cloudflare Tunnel

### 4.1 Crear túnel en Cloudflare Dashboard
1. Ir a [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Networks → Tunnels
3. Click "Create a tunnel"
4. Seleccionar "Cloudflared"
5. Nombre: `valsys-production`
6. Copiar el token que te da

### 4.2 Configurar rutas del túnel
En la configuración del túnel, agregar estas rutas:

| Subdominio | Dominio | Tipo | URL |
|------------|---------|------|-----|
| `app` | `agrogas.online` | HTTP | `valsys:3000` |
| `minio` | `agrogas.online` | HTTP | `valvulas_storage:9000` |
| `minio-console` | `agrogas.online` | HTTP | `valvulas_storage:9001` |

**O alternativamente, usar subdominios separados:**
- `app.agrogas.online` → `valsys:3000`
- `storage.agrogas.online` → `valvulas_storage:9000`
- `storage-console.agrogas.online` → `valvulas_storage:9001`

### 4.3 Pegar el token en .env
```bash
nano .env
# Reemplazar CLOUDFLARE_TUNNEL_TOKEN con el token copiado
```

---

## PASO 5: Configurar DNS en Cloudflare

### 5.1 Agregar registros DNS
En Cloudflare Dashboard → agrogas.online → DNS:

**Si usas rutas del túnel:**
```
Tipo: CNAME
Nombre: app
Contenido: valsys-production.cfargotunnel.com
Proxy: Activado (nube naranja)

Tipo: CNAME
Nombre: @
Contenido: valsys-production.cfargotunnel.com
Proxy: Activado (nube naranja)
```

**Si usas subdominios separados:**
```
Tipo: CNAME
Nombre: app
Contenido: valsys-production.cfargotunnel.com
Proxy: Activado

Tipo: CNAME
Nombre: storage
Contenido: valsys-production.cfargotunnel.com
Proxy: Activado

Tipo: CNAME
Nombre: storage-console
Contenido: valsys-production.cfargotunnel.com
Proxy: Activado
```

---

## PASO 6: Construir y Levantar el Proyecto

### 6.1 Dar permisos a los scripts
```bash
cd ~/valsys
chmod +x deploy.sh
```

### 6.2 Construir las imágenes
```bash
docker compose build
```

**Si hay errores:**
```bash
# Limpiar caché y reintentar
docker compose build --no-cache
```

### 6.3 Levantar los servicios
```bash
docker compose up -d
```

### 6.4 Verificar que todo esté corriendo
```bash
docker compose ps
```

Deberías ver todos los servicios con status "Up":
- valsys_app
- valvulas_db
- valvulas_search
- valvulas_storage
- valvulas_tunnel

### 6.5 Ver logs en tiempo real
```bash
# Todos los servicios
docker compose logs -f

# Solo la app
docker compose logs -f valsys

# Solo la base de datos
docker compose logs -f postgres
```

---

## PASO 7: Inicializar la Base de Datos

### 7.1 Esperar a que PostgreSQL esté listo
```bash
# Verificar que PostgreSQL esté healthy
docker compose ps postgres
```

Esperar hasta que veas `(healthy)` en el status.

### 7.2 Aplicar migraciones
```bash
# Entrar al contenedor de la app
docker compose exec valsys sh

# Dentro del contenedor
cd front
pnpm drizzle-kit push

# Salir
exit
```

### 7.3 Crear usuario admin inicial
```bash
# Entrar al contenedor
docker compose exec valsys sh

# Dentro del contenedor
cd front
node -e "
const { db } = require('./lib/db');
const { users } = require('./db/schema');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const passwordHash = await bcrypt.hash('CAMBIAR_ESTO_POR_PASSWORD_SEGURO', 10);
  await db.insert(users).values({
    username: 'admin',
    fullName: 'Administrador',
    email: 'admin@agrogas.online',
    passwordHash: passwordHash,
    role: 'admin'
  });
  console.log('Admin creado exitosamente');
  process.exit(0);
}

createAdmin().catch(console.error);
"

# Salir
exit
```

---

## PASO 8: Crear Bucket en MinIO

### 8.1 Acceder a la consola de MinIO
- URL: `https://storage-console.agrogas.online` (o según tu configuración)
- Usuario: `admin_minio`
- Contraseña: la que pusiste en `.env`

### 8.2 Crear bucket
1. Ir a "Buckets"
2. Click "Create Bucket"
3. Nombre: `valsys`
4. Click "Create Bucket"

**O usando CLI:**
```bash
# Instalar mc (MinIO Client) si no lo tenés
docker run -it --rm --network valsys_valsys_net minio/mc

# Dentro del contenedor
mc alias set local http://minio:9000 admin_minio TU_PASSWORD_DE_MINIO
mc mb local/valsys
exit
```

---

## PASO 9: Verificar que Todo Funcione

### 9.1 Probar la aplicación
- Abrir navegador: `https://app.agrogas.online`
- Deberías ver la pantalla de login

### 9.2 Probar login
- Usuario: `admin`
- Contraseña: la que pusiste en el paso 7.3

### 9.3 Verificar servicios
```bash
# Verificar que todos los contenedores estén corriendo
docker compose ps

# Verificar logs de errores
docker compose logs --tail=50 valsys
```

---

## PASO 10: Acceso SSH Remoto

### 10.1 Configurar SSH (si no está configurado)
```bash
# En el servidor
sudo nano /etc/ssh/sshd_config
```

Asegurar estas líneas:
```
Port 22
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
```

Reiniciar SSH:
```bash
sudo systemctl restart sshd
```

### 10.2 Conectarse desde cualquier lugar
```bash
ssh usuario@IP_PUBLICA_DEL_SERVIDOR
```

### 10.3 (Opcional) Configurar llave SSH
```bash
# En tu máquina local
ssh-keygen -t ed25519 -C "tu@email.com"

# Copiar llave al servidor
ssh-copy-id usuario@IP_DEL_SERVIDOR

# Ahora podés conectarte sin password
ssh usuario@IP_DEL_SERVIDOR
```

---

## COMANDOS ÚTILES

### Ver estado de servicios
```bash
docker compose ps
```

### Reiniciar servicios
```bash
# Todos
docker compose restart

# Solo la app
docker compose restart valsys

# Solo PostgreSQL
docker compose restart postgres
```

### Detener todo
```bash
docker compose down
```

### Actualizar la aplicación
```bash
# Bajar la app actual
docker compose down

# Actualizar código
git pull

# Reconstruir
docker compose build

# Levantar
docker compose up -d
```

### Ver logs de errores
```bash
# Últimas 100 líneas de todos los servicios
docker compose logs --tail=100

# Solo la app, en tiempo real
docker compose logs -f valsys
```

### Entrar a un contenedor
```bash
# A la app
docker compose exec valsys sh

# A PostgreSQL
docker compose exec postgres psql -U admin -d sistema_valvulas

# A MinIO
docker compose exec minio sh
```

### Backup de base de datos
```bash
# Crear backup
docker compose exec postgres pg_dump -U admin sistema_valvulas > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20250116.sql | docker compose exec -T postgres psql -U admin sistema_valvulas
```

---

## SOLUCIÓN DE PROBLEMAS

### Error: "Cannot connect to Docker daemon"
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Error: "Port already in use"
```bash
# Ver qué está usando el puerto
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :9000

# Matar el proceso
sudo kill -9 PID
```

### Error: "Permission denied" al crear archivos
```bash
# Dar permisos al usuario actual
sudo chown -R $USER:$USER ~/valsys
```

### La app no carga después de deploy
```bash
# Verificar logs
docker compose logs valsys

# Verificar que el build fue exitoso
docker compose logs valsys | grep "Ready in"
```

### No puedo acceder desde fuera
1. Verificar que Cloudflare Tunnel esté corriendo:
   ```bash
   docker compose logs cloudflared
   ```

2. Verificar DNS en Cloudflare:
   - Los registros deben tener la nube naranja activada

3. Verificar el token del túnel en `.env`

### Error de build en Docker
```bash
# Limpiar todo y reconstruir
docker compose down
docker system prune -a
docker compose build --no-cache
docker compose up -d
```

---

## SEGURIDAD

### Cambiar contraseñas por defecto
- [ ] DATABASE_URL password
- [ ] MINIO_SECRET_KEY
- [ ] MEILI_MASTER_KEY
- [ ] JWT_SECRET
- [ ] Password del usuario admin

### Firewall (opcional)
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Actualizaciones de seguridad
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Actualizar Docker
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y
```

---

## CONTACTO Y SOPORTE

Si algo no funciona:
1. Revisar logs: `docker compose logs -f`
2. Verificar que todos los servicios estén "Up": `docker compose ps`
3. Verificar que el túnel de Cloudflare esté conectado
4. Verificar DNS en Cloudflare

---

## CHECKLIST FINAL

- [ ] Código subido al servidor
- [ ] `.env` configurado con contraseñas seguras
- [ ] Token de Cloudflare Tunnel agregado
- [ ] DNS configurado en Cloudflare
- [ ] `docker compose build` exitoso
- [ ] `docker compose up -d` corriendo
- [ ] Migraciones de base de datos aplicadas
- [ ] Usuario admin creado
- [ ] Bucket de MinIO creado
- [ ] App accesible en `https://app.agrogas.online`
- [ ] Login funcionando
- [ ] SSH remoto funcionando
