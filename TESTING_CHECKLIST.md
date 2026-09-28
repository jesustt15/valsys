# Checklist de Prueba — Rediseño Simplificado de Cilindros

**Fecha**: Mañana (cuando llegues)  
**Objetivo**: Verificar el nuevo flujo simplificado de 2 acciones

---

## Cambio Principal

**ANTES**: 6 estados (instalado, desmontado, en_planta, pendiente_reinstalacion, reinstalado, condenado) + 8+ acciones  
**AHORA**: 3 estados (activo, en_certificacion, de_baja) + 2 acciones

### Nuevos Estados
- ✅ `activo` — En el vehículo, operativo (verde)
- ⚠️ `en_certificacion` — En proceso de certificación (ámbar)
- 🔴 `de_baja` — Condenado, dado de baja (rojo)

### Nuevas Acciones
1. **"Enviar a planta"** — visible cuando cilindro está `activo`
2. **"Recibir de planta"** — visible cuando cilindro está `en_certificacion`

---

## Preparación

- [ ] **IMPORTANTE**: Ejecutar migración antes de probar:
  ```bash
  cd front
  pnpm drizzle-kit push
  # O manualmente: pnpm drizzle-kit migrate
  ```
- [ ] Levantar infra: `docker compose up -d`
- [ ] Iniciar dev server: `cd front && pnpm dev`
- [ ] Abrir browser en `http://localhost:3000`
- [ ] Login como admin u operator

---

## Prueba 1: Flujo Básico — Enviar y Recibir Cilindro

### 1.1 Crear inspección con cilindros
- [x ] Crear inspección nueva (Owner → Vehicle → Inspection)
- [ x] Agregar 1 cilindro (marca, capacidad, serial, fecha fabricación)
- [ x] Verificar que el cilindro aparece con estado **"Activo"** (badge verde)
- [x ] Verificar que aparece botón **"Enviar a planta"**

### 1.2 Enviar a planta
- [x ] Hacer click en "Enviar a planta"
- [ x] Verificar que aparece formulario inline con campo de fecha
- [ x] Seleccionar fecha de hoy
- [ x] Hacer click en "Confirmar envío"
- [ x] Verificar que el cilindro cambia a estado **"En certificación"** (badge ámbar)
- [x ] Verificar que aparece botón **"Recibir de planta"**
- [ x] Verificar que desaparece botón "Enviar a planta"
- [ x] Verificar notificación "Cilindro enviado a planta"

### 1.3 Recibir de planta (bueno)
- [ x] Hacer click en "Recibir de planta"
- [ x] Verificar que aparece formulario con:
  - Select de resultado (Bueno/Malo)
  - Fecha de recepción
  - Serial nuevo (opcional)
  - Fecha de recalificación (opcional)
  - Upload de PDF (opcional)
  - Botón scanner (opcional)
- [ x] Seleccionar resultado: **"Bueno (vuelve al vehículo)"**
- [ x] Ingresar fecha de recepción (hoy)
- [ ] (Opcional) Ingresar serial nuevo
- [ ] (Opcional) Ingresar fecha de recalificación
- [ ] (Opcional) Subir PDF de planta
- [ x] Hacer click en "Confirmar recepción"
- [ x] Verificar que el cilindro vuelve a estado **"Activo"** (badge verde)
- [ x] Verificar que desaparece botón "Recibir de planta"
- [x ] Verificar notificación "Cilindro recertificado"
- [x ] (Si subiste PDF) Verificar que aparece en attachments

### 1.4 Recibir de planta (malo)
- [ ] Repetir pasos 1.1 y 1.2 con otro cilindro
- [ ] Hacer click en "Recibir de planta"
- [ ] Seleccionar resultado: **"Malo (dar de baja)"**
- [ ] Verificar que aparece panel de confirmación rojo
- [ ] Verificar que indica la cantidad de cilindros a dar de baja
- [ ] Verificar que indica que la acción es irreversible
- [ ] Hacer click en "Confirmar baja"
- [ ] Hacer click en "Confirmar recepción"
- [ ] Verificar que el cilindro cambia a estado **"De baja"** (badge rojo)
- [ ] Verificar notificación "Cilindro condenado"

---

## Prueba 2: Múltiples Cilindros

### 2.1 Flujo con 3 cilindros
- [ ] Crear inspección con 3 cilindros
- [ ] Verificar que los 3 aparecen con estado "Activo"
- [ ] Enviar los 3 a planta (uno por uno)
- [ ] Verificar que los 3 pasan a "En certificación"
- [ ] Recibir 2 como "Bueno"
- [ ] Recibir 1 como "Malo"
- [ ] Verificar estados finales: 2 "Activo", 1 "De baja"

### 2.2 Flujo mixto
- [ ] Crear inspección con 2 cilindros
- [ ] Enviar cilindro 1 a planta
- [ ] Dejar cilindro 2 en estado "Activo"
- [ ] Verificar que cilindro 1 tiene botón "Recibir de planta"
- [ ] Verificar que cilindro 2 tiene botón "Enviar a planta"
- [ ] Completar flujo de cilindro 1 (recibir como bueno)
- [ ] Enviar cilindro 2 a planta
- [ ] Verificar que ambos están en "En certificación"

---

## Prueba 3: Edición y Desvinculación

### 3.1 Editar campos de cilindro
- [ ] Con cilindro en estado "Activo", hacer click en "Editar"
- [ ] Verificar que aparece formulario con campos: marca, capacidad, serial, fecha fabricación
- [ ] Modificar algún campo
- [ ] Hacer click en "Guardar cambios"
- [ ] Verificar que los cambios se reflejan en la lista

### 3.2 Desvincular cilindro
- [ ] Con cilindro en estado "En certificación"
- [ ] Hacer click en "Desvincular"
- [ ] Verificar confirmación
- [ ] Confirmar
- [ ] Verificar que el cilindro desaparece de la lista
- [ ] NOTA (contrato): Solo cilindros en certificación pueden desvincularse.
  El botón de desvincular NO aparece para estados "activo" o "de_baja".

---

## Prueba 4: Validaciones

### 4.1 Fecha requerida
- [ ] Hacer click en "Enviar a planta"
- [ ] Dejar campo de fecha vacío
- [ ] Intentar submit
- [ ] Verificar error "La fecha de envío es requerida"

### 4.2 Fecha de recepción requerida
- [ ] Hacer click en "Recibir de planta"
- [ ] Seleccionar resultado
- [ ] Dejar fecha de recepción vacía
- [ ] Intentar submit
- [ ] Verificar error "La fecha de recepción es requerida"

### 4.3 PDF inválido
- [ ] En formulario de recepción, intentar subir archivo .jpg
- [ ] Verificar error "El documento de planta debe ser PDF"

---

## Prueba 5: Flujo de Inspección Completo

### 5.1 Inspección con cilindros en certificación
- [ ] Crear inspección con cilindros
- [ ] Enviar cilindros a planta
- [ ] Verificar que la inspección NO puede avanzar a "Cita" (o muestra advertencia)
- [ ] (Si hay gate) Verificar mensaje de error

### 5.2 Inspección con todos los cilindros activos
- [ ] Recibir todos los cilindros como "Bueno"
- [ ] Verificar que la inspección puede avanzar a "Cita"
- [ ] Programar cita
- [ ] Avanzar a "Certificado"
- [ ] Generar certificado

---

## Prueba 6: Migración de Datos Existentes

### 6.1 Verificar datos migrados
- [ ] Abrir inspección antigua (creada antes de la migración)
- [ ] Verificar que cilindros antiguos muestran estados correctos:
  - Cilindros que estaban "instalado" o "reinstalado" → ahora "Activo"
  - Cilindros que estaban "en_planta" o "pendiente_reinstalacion" → ahora "En certificación"
  - Cilindros que estaban "condenado" → ahora "De baja"

### 6.2 Continuar flujo de cilindro migrado
- [ ] Tomar cilindro que estaba "en_planta" (ahora "en_certificacion")
- [ ] Verificar que tiene botón "Recibir de planta"
- [ ] Completar recepción
- [ ] Verificar que funciona correctamente

---

## Prueba 7: Recordatorios (Fase 3 anterior)

### 7.1 Banner en dashboard
- [ ] Tener cilindros en estado "en_certificacion" por 3+ días
- [ ] Cargar dashboard
- [ ] Verificar banner ámbar "Cilindros en Planta"
- [ ] Verificar que muestra información correcta

### 7.2 Notificaciones
- [ ] Verificar que se generan notificaciones cada 3 días
- [ ] Verificar ícono CalendarClock ámbar
- [ ] Verificar campana pulsante

---

## Prueba 8: Flujo Masivo (Bulk)

### 8.0 Persistencia de advertencia docError
- [ ] Recibir cilindro(s) de planta con PDF adjunto
- [ ] Simular falla de upload (ej: detener MinIO temporalmente)
- [ ] Verificar que el formulario NO se cierra automáticamente
- [ ] Verificar alerta amarilla persistente "documento de planta no se pudo subir"
- [ ] Verificar botón "Cerrar" explícito (no auto-close)
- [ ] Verificar que la notificación dice "documento de planta NO subido, pendiente"

### 8.0b Reset de confirmación destructiva al cambiar selección
- [ ] Seleccionar 3 cilindros "En certificación"
- [ ] Seleccionar resultado "Malo"
- [ ] Confirmar baja de 3 cilindros
- [ ] Agregar 2 cilindros más a la selección
- [ ] Verificar que el panel de confirmación se resetea (requiere reconfirmar)
- [ ] Esto previene dar de baja 5 cilindros con confirmación stale de 3

### 8.1 Envío masivo a planta
- [ ] Seleccionar 3+ cilindros con estado "Activo"
- [ ] Verificar que aparece barra de selección con "{N} seleccionados"
- [ ] Hacer click en "Enviar a planta (N)"
- [ ] Verificar formulario inline con fecha
- [ ] Confirmar envío
- [ ] Verificar que todos pasan a "En certificación"

### 8.2 Recepción masiva de planta (bueno)
- [ ] Seleccionar cilindros "En certificación"
- [ ] Hacer click en "Recibir de planta (N)"
- [ ] Seleccionar resultado "Bueno"
- [ ] Subir PDF de planta (o escanear con cámara en mobile)
- [ ] Confirmar recepción
- [ ] Verificar que todos vuelven a "Activo"
- [ ] (Si upload falla) Verificar alerta amarilla "Cilindros recibidos, pero el documento de planta no se pudo subir"

### 8.3 Recepción masiva de planta (malo — destructivo)
- [ ] Seleccionar cilindros "En certificación"
- [ ] Seleccionar resultado "Malo"
- [ ] Verificar panel rojo de confirmación
- [ ] Verificar que menciona la cantidad de cilindros
- [ ] Verificar que indica que la acción es irreversible
- [ ] Hacer click en "Confirmar baja"
- [ ] Confirmar recepción
- [ ] Verificar que todos pasan a "De baja"

### 8.4 Escáner en mobile
- [ ] En dispositivo mobile, abrir formulario de recepción
- [ ] Hacer click en botón escáner
- [ ] Verificar que si la cámara falla, aparece "Subir desde galería" inmediatamente
- [ ] Verificar que el documento escaneado se adjunta correctamente al formulario visible

---

## Prueba 9: Estados bloqueados durante operaciones masivas

### 9.1 Bloqueo durante envío masivo
- [ ] Iniciar envío masivo a planta
- [ ] Mientras está "Enviando..." verificar que:
  - [ ] Botón "Limpiar" está deshabilitado
  - [ ] Botón "Cancelar" está deshabilitado
  - [ ] Todos los checkboxes están deshabilitados
- [ ] Verificar que al completar se desbloquea

### 9.2 Bloqueo durante recepción masiva
- [ ] Iniciar recepción masiva de planta
- [ ] Mientras está "Procesando..." verificar que:
  - [ ] Botón "Limpiar" está deshabilitado
  - [ ] Botón "Cancelar" está deshabilitado
  - [ ] Todos los checkboxes están deshabilitados
- [ ] Verificar que al completar se desbloquea

---

## Prueba 10: Validaciones de documentos

### 10.1 Tamaño máximo de documento
- [ ] Intentar subir un PDF > 20MB en recepción individual
- [ ] Verificar error "El documento de planta no puede superar los 20MB"
- [ ] Intentar lo mismo en recepción masiva
- [ ] Verificar mismo error

---

## Verificaciones Técnicas

### Lint y Build
```bash
cd front
pnpm lint
pnpm build
```
- [ ] Lint pasa sin errores
- [ ] Build compila exitosamente

### Base de datos
- [ ] Verificar que migration 0005 se ejecutó correctamente
- [ ] Verificar que enum cylinder_status tiene solo 3 valores
- [ ] Verificar que datos antiguos fueron mapeados correctamente

### MinIO
- [ ] Verificar que PDFs de planta se suben correctamente
- [ ] Verificar que aparecen en inspection_attachments

---

## Resumen del Nuevo Flujo

```
Creación → Activo → [Enviar a planta] → En certificación → [Recibir de planta] → Activo (bueno) o De baja (malo)
```

**Antes**: 6 estados + 8+ acciones  
**Ahora**: 3 estados + 2 acciones ✅

---

## Notas

- Si encuentras bugs, anota aquí:
  - 
  - 
  - 

- Si hay mejoras de UX, anota aquí:
  - 
  - 
  - 

---

**Post-testing**: Si todo funciona, actualizar documentación de usuario y eliminar este checklist.

