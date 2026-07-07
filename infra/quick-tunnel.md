# Quick Tunnel en ValSys (Docker)

> Cómo levantar el túnel público efímero de Cloudflare dentro del stack Docker de ValSys para pruebas, sin cuenta ni dominio.

---

## 1. Qué es y PARA QUÉ se usa en ValSys

El **Quick Tunnel** (TryCloudflare) genera una URL pública aleatoria del tipo:

```
https://<palabras-aleatorias>.trycloudflare.com
```

que proxya el tráfico a través de la red global de Cloudflare hasta Next.js corriendo en el host (`http://localhost:3000`).

En ValSys se usa para:

- Probar la descarga pública de certificados (workflow paso 5 — "External Retrieval") desde cualquier dispositivo.
- Validar webhooks que necesiten HTTPS público.
- Compartir una demo con el cliente sin desplegar.

**No es para producción**: la URL cambia en cada reinicio del contenedor y no hay persistencia. Para producción → ver sección 7 (migrar a Named Tunnel).

---

## 2. Cómo está wired en el proyecto

En `docker-compose.yml` ya existe el servicio:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: valvulas_tunnel
  restart: unless-stopped
  command: tunnel --url http://host.docker.internal:3000 --no-autoupdate
  dns:
    - 8.8.8.8
    - 1.1.1.1
  extra_hosts:
    - "host.docker.internal:host-gateway"  # permite al contenedor alcanzar el host
```

**Puntos clave de esa config (concepto, no memorización):**

- `http://host.docker.internal:3000` →Next.js corre en el **host** (no en un container), así que el contenedor cloudflared debe alcanzar el host. En Windows/Docker Desktop se resuelve con `extra_hosts: host.docker.internal:host-gateway`. Sin eso, `host.docker.internal` no existe dentro del container y el túnel da 502.
- `--no-autoupdate` → evita que cloudflared intente autoactualizarse dentro del container (en Docker no tiene sentido y a veces rompe).
- `dns: 8.8.8.8 / 1.1.1.1` → evita problemas de resolución DNS dentro del container en redes corporativas restrictivas.
- **NO** hay `config.yml` referenciado — el Quick Tunnel se arranca 100% por CLI. Toda la config necesaria va inline en el `command:` del compose.

---

## 3. Pasos para levantarlo (comando exacto del proyecto)

### Precondición

Next.js debe estar corriendo en el **host** en el puerto `3000`:

```powershell
cd front
pnpm dev
```

Verificá con `curl http://localhost:3000` antes de seguir. Si Next no responde local, el túnel va a dar 502 Bad Gateway y vas a pensar que cloudflared falló cuando en realidad falló el origen.

### Levantar solo el túnel (sin tocar postgres/meili/minio)

```powershell
docker compose up -d cloudflared
```

### Ver la URL pública generada

```powershell
docker compose logs -f cloudflared
```

Buscá el cuadro ASCII:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://example-random-words-here.trycloudflare.com                                       |
+--------------------------------------------------------------------------------------------+
```

O filtrá directo:

```powershell
docker compose logs cloudflared | Select-String "trycloudflare.com"
```

### Verificar desde afuera

```powershell
curl https://<tu-url>.trycloudflare.com
```

Debería devolver el HTML del login de ValSys.

### Detener el túnel

```powershell
docker compose stop cloudflared
```

La URL deja de existir **inmediatamente**.

---

## 4. Levantar todo el stack de una (incluido el túnel)

```powershell
docker compose up -d
cd front
pnpm dev
```

El orden real de arranque no importa porque `cloudflared` reintenta conectar con el origen (**retry interno**) hasta que Next.js esté disponible. Igual, mejor levantá Next.js primero para no ver 502s transitorios en los logs.

---

## 5. Cosas que NO hacer (antipatrones que ya o vi en configs similares)

| No | Por qué |
|---|---|
| **No agregues un `config.yml` al compose** | Para Quick Tunnel toda la config va inline en el `command:`. Si querés un `config.yml` estás armando un Named Tunnel, que es otra cosa. |
| **No montes un `credentials.json`** | Los Quick Tunnels no usan credenciales. Si necesitás autenticar contra Cloudflare, migrá a Named Tunnel. |
| **No registres webhooks contra la URL** esperando que sobrevivan | Cada `docker compose restart cloudflared` genera una URL nueva. Registrá el webhook y NO reinicies el contenedor durante la prueba. |
| **No dejes `restart: always` pensando que es estable** | El servicio reinicia bien, pero la URL cambia. Solo es estable el **container**, no la URL que sirve. |
| **No apuntes el túnel a otro puerto sin actualizarlo** | Si cambiás `pnpm dev` a otro puerto (p. ej. con `--port 3001`), también actualizá `--url http://host.docker.internal:3001`. |

---

## 6. Problemas comunes en el setup ValSys

| Síntoma | Causa probable en este proyecto | Solución |
|---|---|---|
| `cloudflared` arranca pero el 502 Bad Gateway aparece en la URL pública | Next.js no está corriendo en el host, o corre en otro puerto | `curl http://localhost:3000` en el host. Si no responde, levantá Next.js. |
| Logs dicen "context deadline exceeded" o no encuentra el edge | DNS corporativo bloqueado | Revisá que el `dns:` del compose siga con `8.8.8.8` y `1.1.1.1`. |
| Logs dicen "host.docker.internal: no such host" | Falta el `extra_hosts` o Docker Desktop está desactualizado | Confirmá que `extra_hosts: - "host.docker.internal:host-gateway"` esté en el servicio. En Linux nativo (sin Docker Desktop) esa directiva requiere Docker 20.10+. |
| URL cambia sola | El contenedor reinició (`restart: unless-stopped`) | Si necesitás URL estable, migrá a Named Tunnel. |
| `docker compose up cloudflared` levanta también DB y MinIO | No debería — por defecto compose solo levanta el servicio nombrado y sus dependencias. Si cloudflared no declara `depends_on`, arranca solo. | Confirmá que cloudflared no tenga `depends_on`. |

---


## 8. Resumen de un comando

```powershell
docker compose up -d cloudflared
docker compose logs -f cloudflared
```

URL aleatoria, muere con `docker compose stop cloudflared`, no requiere cuenta. Solo para pruebas.

---

## Apéndice: historial de fixes de consistencia aplicados en el repo

Mientras escribía este doc detecté varias inconsistencias en el repo y las corregí en la misma pasada. Quedan registradas acá para trazabilidad:

- ✅ `.cloudflared/credentials.json/` (directorio vacío leftover) → eliminado.
- ✅ `infra/cloudflared/config.yml` (scaffold de Named Tunnel sin uso) → eliminado.
- ✅ `README.md`: tres referencias a `localhost:5432` actualizadas a `localhost:5433` (líneas del `.env` ejemplo, lista de servicios, tabla de acceso).
- ✅ `README.md`: nota "Cloudflare Tunnel (pendiente)" reemplazada por referencia a este doc.
- ✅ `AGENTS.md` (root): `cd apps/web && pnpm dev` → `cd front && pnpm dev`.
- ✅ `skills/valsys-architecture/SKILL.md`: `apps/web/` → `front/` (en hard rules y folder reference).
- ✅ `docker-compose.yml`: `version: '3.8'` (obsoleto) eliminado.

Nota: el `.env.example` ya estaba correcto (`127.0.0.1:5433`) — no requirió cambios.