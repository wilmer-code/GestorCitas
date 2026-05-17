---
name: appointment-debug
description: >
  Diagnostica errores al crear o actualizar citas en /appointments.
  Se auto-invoca cuando el usuario reporta un error 400, 409 o 422
  al llamar a POST /appointments o PUT /appointments/:id.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(curl:*)
  - Bash(pm2 logs:*)
---

# Diagnóstico de errores en /appointments

## 1. Mapa de puertas de error conocidas

### 400 — Datos inválidos (2 puertas)

**Puerta 1 — middleware Zod** (`middleware/validate.js:6`)  
Se dispara antes de entrar al handler. Payload de respuesta:
```json
{ "message": "Datos inválidos", "errors": [{ "code": "...", "path": ["campo"], "message": "..." }] }
```
Causas comunes:
- `startTime` o `endTime` en formato que no es ISO 8601 UTC o con offset explícito
- `clientId` no es UUID válido
- `title` vacío o más de 100 caracteres
- `status` con un valor fuera del enum (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`)

**Puerta 2 — validación de rango** (`appointments.routes.js:68-70`)  
Se dispara dentro del handler, después de pasar Zod:
```json
{ "message": "La hora de fin debe ser mayor que la de inicio" }
```
Condición exacta: `new Date(startTime) >= new Date(endTime)`.

---

### 409 — Solapamiento (`appointments.routes.js:80-82`)

```json
{ "message": "Existe solape con otra cita" }
```
La función `hasOverlap` busca cualquier cita del mismo `userId` + `tenantId` donde:
- `status` NO sea `CANCELLED`
- `startTime < endTime_nueva` AND `endTime > startTime_nueva`

Si el solapamiento es con una cita propia cancelada, no bloquea.

---

### 401 / 403 — Autenticación y tenant

| Código | Causa | Dónde |
|---|---|---|
| 401 | Token JWT ausente o malformado | `middleware/auth.js` |
| 401 | Token expirado (TTL 8h) | `middleware/auth.js` |
| 403 | `req.user.tenantId !== req.tenantId` | `middleware/auth.js` |

---

## 2. Reproducir con curls — casos canónicos de timezone

Obtener token primero:
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <slug>" \
  -d '{"email": "<email>", "password": "<password>"}'
```

**CASO A — UTC con Z (siempre debe funcionar):**
```bash
curl -s -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <slug>" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "clientId": "<CLIENT_ID>",
    "title": "Prueba timezone A",
    "startTime": "2026-05-18T08:00:00Z",
    "endTime": "2026-05-18T09:00:00Z"
  }'
```

**CASO B — Hora Madrid con offset +02:00 (verano) / +01:00 (invierno):**
```bash
curl -s -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <slug>" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "clientId": "<CLIENT_ID>",
    "title": "Prueba timezone B",
    "startTime": "2026-05-18T10:00:00+02:00",
    "endTime": "2026-05-18T11:00:00+02:00"
  }'
```

**CASO C — Sin timezone (datetime-local sin convertir, siempre debe fallar):**
```bash
curl -s -X POST http://localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <slug>" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "clientId": "<CLIENT_ID>",
    "title": "Prueba timezone C",
    "startTime": "2026-05-18T10:00:00",
    "endTime": "2026-05-18T11:00:00"
  }'
```

Resultado esperado post-fix: A=201, B=201, C=400.

---

## 3. Cómo leer el payload de error de Zod

Cuando Zod rechaza el body, la respuesta incluye el array `errors`:

```json
{
  "message": "Datos inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "validation": "datetime",
      "message": "Invalid datetime",
      "path": ["startTime"]
    }
  ]
}
```

| Campo | Qué indica |
|---|---|
| `path[0]` | El campo del body que falló |
| `code` | El tipo de error Zod (`invalid_string`, `too_small`, `invalid_enum_value`, etc.) |
| `validation` | El validador que falló (`datetime`, `uuid`, `email`) |
| `message` | Mensaje legible del problema |

Con múltiples campos inválidos, `errors` tiene una entrada por cada uno.

---

## 4. Tabla síntoma → hipótesis → verificación

| Síntoma | Hipótesis primera | Verificación |
|---|---|---|
| 400 con `"errors": [{"validation":"datetime"}]` | `startTime`/`endTime` con formato rechazado por Zod (offset, sin zona, espacio en lugar de `T`) | Ejecutar casos A, B, C. Si A=201 y B=400 → fix pendiente en Zod (ver §5) |
| 400 con `"La hora de fin debe ser mayor que la de inicio"` | `startTime >= endTime` en el body enviado | Revisar el body: comprobar que `endTime` es posterior a `startTime`. Con offsets distintos, la comparación es en UTC |
| 409 con `"Existe solape con otra cita"` | Hay otra cita activa del mismo usuario que se superpone en tiempo | `GET /appointments?start=<fecha>&end=<fecha>` para ver las citas del día. Verificar si la cita solapante tiene `status: CANCELLED` (si es así, no debería bloquear — bug nuevo) |
| 401 con cualquier body | Token expirado (TTL 8h) o ausente | Hacer login de nuevo y repetir con el nuevo token |
| 403 | El tenant del token no coincide con `X-Tenant-Slug` | Asegurarse de que el slug del header y el slug con el que se hizo login son el mismo |
| 500 en `/auth/login` con `X-Tenant-Slug: localhost` | El tenant middleware no resuelve `localhost` a ningún tenant real — `req.tenantId` queda `undefined`, Prisma falla al buscar por un unique que no existe | Usar el slug real del tenant (ej. `peluqueria-demo`), no `localhost` |

---

## 5. Fix histórico: `{ offset: true }` en Zod (2026-05-17)

**Problema cerrado.** `z.string().datetime()` en Zod 3.23.x, sin opciones, solo acepta strings UTC con sufijo `Z`. El frontend enviaba horas locales de Madrid con offset `+02:00` (verano) o `+01:00` (invierno) y Zod las rechazaba con 400 antes de llegar al handler.

**Fix aplicado** en `appointments.routes.js:14-15`:
```js
// antes
startTime: z.string().datetime(),
endTime:   z.string().datetime(),

// después
startTime: z.string().datetime({ offset: true }),
endTime:   z.string().datetime({ offset: true }),
```

El schema `appointmentSchema.partial()` usado en PUT hereda el cambio automáticamente — no requirió edición adicional.

**Nota:** `{ offset: true }` acepta `+02:00` pero NO strings sin zona (`"2026-05-18T10:00:00"`). Eso es correcto: un datetime sin zona es ambiguo y el servidor (UTC) lo interpretaría distinto a la hora local del usuario.

---

## 6. Bug latente en reminders.routes.js (no arreglado)

`backend/src/routes/reminders.routes.js:12` tiene el mismo patrón:
```js
sendAt: z.string().datetime(),   // ← falta { offset: true }
```

Cualquier llamada a POST /reminders con `sendAt` en hora Madrid (`+02:00`/`+01:00`) devolverá 400 "Datos inválidos". Documentado en `NOTAS_PENDIENTES.md`. No se ha corregido todavía — espera decisión sobre si se debe arreglar junto con una refactorización más amplia o en un fix puntual separado.

---

## 7. Comandos útiles de pm2 durante diagnóstico

```bash
pm2 logs citio-backend           # logs en vivo (incluye stack traces de errores 500)
pm2 logs citio-backend --lines 50 # últimas 50 líneas
pm2 list                         # verificar que el proceso está online
pm2 restart citio-backend        # recargar código tras editar rutas
```
