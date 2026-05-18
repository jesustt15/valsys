# ValSys — Sistema de Inspección GNC

Sistema de gestión de cilindros GNC para vehículos: inspección, recertificación, montaje y generación de certificados.

## Stack

- **Next.js 16.2.6** (Turbopack, Server Actions, React 19.2)
- **Tailwind CSS 4** + componentes UI custom
- **Drizzle ORM** + PostgreSQL 15
- **Meilisearch** (búsqueda full-text)
- **MinIO** (almacenamiento S3 para fotos, firmas, certificados)
- **pnpm** (monorepo)
- **Zod v4** (validación)

## Requisitos

- **Node.js** 20.9+ — [Descargar](https://nodejs.org/)
- **pnpm** 11+ — `npm i -g pnpm`
- **Docker Desktop** — [Descargar](https://www.docker.com/products/docker-desktop/)

## Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone <tu-repo>
cd valsys
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example front/.env.local
```

Editá `front/.env.local` si cambiaste las credenciales por defecto:

```env
DATABASE_URL=postgres://admin:adminpassword@localhost:5432/sistema_valvulas
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=admin_minio
MINIO_SECRET_KEY=password_minio
MINIO_BUCKET=valsys
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=masterKey123!
```

### 4. Levantar infraestructura (Docker)

```bash
docker compose up -d
```

Esto inicia:
- **PostgreSQL** en `localhost:5432`
- **Meilisearch** en `localhost:7700`
- **MinIO** en `localhost:9000` (API) y `localhost:9001` (panel web)

### 5. Crear las tablas en la base de datos

```bash
cd front
pnpm db:push
```

### 6. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Abrí **http://localhost:3000** en tu navegador.

## Comandos útiles

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Inicia Next.js en modo desarrollo |
| `pnpm build` | Compila para producción |
| `pnpm start` | Inicia en modo producción |
| `pnpm db:push` | Sincroniza schema a PostgreSQL |
| `pnpm db:generate` | Genera archivos de migración |
| `pnpm db:migrate` | Ejecuta migraciones |
| `pnpm db:studio` | Abre Drizzle Studio (UI para la DB) |

## Estructura del proyecto

```
valsys/
├── AGENTS.md                    ← Reglas del proyecto + workflow
├── docker-compose.yml           ← PostgreSQL + Meilisearch + MinIO
├── .env.example                 ← Variables de entorno de ejemplo
├── skills/                      ← Skills de IA para el proyecto
│   ├── valsys-forms/            ← Patrones de formularios
│   ├── valsys-architecture/     ← Arquitectura limpia
│   └── valsys-drizzle/          ← Patrones de Drizzle ORM
├── front/                       ← Aplicación Next.js
│   ├── app/
│   │   ├── page.tsx             ← Login (/)
│   │   ├── layout.tsx           ← Root layout
│   │   └── (dashboard)/
│   │       ├── layout.tsx       ← Navbar + Stepper del workflow
│   │       ├── dashboard/       ← /dashboard (stats + resumen)
│   │       ├── owners/new/      ← /owners/new (formulario dueño)
│   │       └── vehicles/new/    ← /vehicles/new (formulario vehículo)
│   ├── components/
│   │   ├── ui/                  ← Button, Input
│   │   ├── forms/               ← OwnerForm, VehicleForm
│   │   └── layout/              ← WorkflowStepper
│   ├── lib/
│   │   ├── db/                  ← Drizzle client + schema
│   │   ├── actions/             ← Server Actions
│   │   ├── validations/         ← Zod schemas
│   │   ├── minio/               ← Cliente MinIO
│   │   └── meilisearch/         ← Cliente Meilisearch
│   ├── db/
│   │   ├── schema.ts            ← Definición completa de tablas
│   │   └── migrations/          ← Migraciones generadas
│   └── drizzle.config.ts        ← Config de Drizzle Kit
└── pnpm-workspace.yaml          ← Monorepo config
```

## Workflow del sistema

1. **Recepción** → Registrar dueño + vehículo
2. **Inspección inicial** → Checklist adelante/atrás
3. **Desmontaje** → Registrar cilindros + fotos
4. **Recertificación** → Enviar a planta, recibir resultado
5. **Remontaje** → Fotos post-montaje + firma del dueño
6. **Certificado** → Generar y almacenar

## Acceso a servicios

| Servicio | URL | Credenciales |
|----------|-----|-------------|
| App | http://localhost:3000 | — |
| MinIO Panel | http://localhost:9001 | admin_minio / password_minio |
| Meilisearch | http://localhost:7700 | masterKey123! |
| PostgreSQL | localhost:5432 | admin / adminpassword |
| Drizzle Studio | `pnpm db:studio` | — |

## Notas

- **No hay API routes para mutaciones**: todo usa Server Actions
- **Archivos van a MinIO**: nunca al filesystem del servidor
- **Búsquedas usan Meilisearch**: PostgreSQL solo para datos relacionales
- **Cloudflare Tunnel** (pendiente): para acceso externo a certificados
