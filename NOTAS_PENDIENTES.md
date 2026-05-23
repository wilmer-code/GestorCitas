# Notas Pendientes

## ✅ RESUELTA — Tabla `notes` ausente en migración multitenant

### Descripción del problema

La migración `20260419161652_multitenant_citio` elimina todas las tablas del schema anterior (incluyendo `notas`) y recrea el schema completo para multi-tenant, pero **omite el `CREATE TABLE` para la tabla `notes`**. El modelo `Note` sí existe en `prisma/schema.prisma` con todas sus relaciones, pero no hay ninguna instrucción SQL que cree físicamente esa tabla en la base de datos.

### Impacto potencial

- Si la base de datos se destruye y se recrea aplicando las migraciones desde cero (`prisma migrate deploy`), la tabla `notes` no existirá.
- Cualquier operación sobre notas (crear, leer, actualizar, eliminar) lanzará un error en runtime.
- El entorno de producción actual puede estar funcionando solo porque la tabla fue creada manualmente o porque la DB no fue reiniciada desde la migración multitenant.

### Posible solución

Crear una nueva migración que añada la tabla `notes` con su estructura correcta:

```sql
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

O bien, ejecutar `prisma migrate dev --name add_notes_table` para que Prisma genere la migración automáticamente comparando el schema contra el estado real de la DB.

### Resolución

Resuelta el 2026-05-20 con migración manual `20260520205051_add_notes_table` aplicada via `migrate resolve --applied`. Durante la resolución se descubrió que `backend/prisma/migrations/` estaba ignorado en `.gitignore` desde el primer commit del repo; se corrigió en el mismo bloque de trabajo. Las 5 migraciones pre-multitenant obsoletas se eliminaron del filesystem.

---

## Validación de horario comercial: drift entre documentación y código

### Descripción del problema

El `README.md` afirma que el backend valida el horario "09:00-18:00". El script `backend/scripts/test-business-hours.sh` documenta un rango diferente: **10:00–20:30 hora Madrid**. Sin embargo, **`backend/src/routes/appointments.routes.js` no contiene ninguna validación de rango horario**. El handler de `POST /appointments` solo comprueba que `startTime < endTime`, solape entre citas y existencia del cliente.

### Problemas adicionales detectados en el script

El script `test-business-hours.sh` usa los campos `startAt`/`endAt` en el body de la petición, pero el schema Zod actual requiere `startTime`/`endTime`. El script está roto y nunca pasaría contra la API actual.

### Impacto potencial

- Actualmente se pueden crear citas a cualquier hora del día (00:00–23:59), lo que contradice la documentación oficial del producto.
- El script de smoke-test da falsa seguridad: falla por razones distintas a las que pretende testear.

### Posible solución

1. Decidir el rango definitivo (¿10:00–20:30 Madrid, o 09:00–18:00?).
2. Implementar la validación en `appointments.routes.js` (en el handler de POST y PUT), convirtiendo `startTime` a la timezone correcta antes de comparar horas.
3. Actualizar el script para usar los campos `startTime`/`endTime` y ajustar los casos de prueba al rango real.
4. Actualizar `README.md` y `CLAUDE.md` para reflejar el rango implementado.

---

## ✅ RESUELTA — Campos Stripe en Tenant ausentes en migraciones

### Descripción del problema

El modelo `Tenant` en `backend/prisma/schema.prisma` declara dos campos que no están cubiertos por ninguna migración existente:

- `stripeCustomerId String? @map("stripe_customer_id")`
- `stripeSubscriptionId String? @map("stripe_subscription_id")`

Estos campos fueron añadidos directamente al schema (probablemente durante la integración de Stripe) sin ejecutar `prisma migrate dev` para generar el `ALTER TABLE` correspondiente. Las migraciones actuales en `prisma/migrations/` no contienen ninguna instrucción que añada las columnas `stripe_customer_id` ni `stripe_subscription_id` a la tabla `tenants`.

### Impacto potencial

- Si se ejecuta `prisma migrate deploy` en un entorno limpio (nueva instalación, staging, CI), la tabla `tenants` no tendrá esas columnas.
- El flujo de checkout de Stripe (`/billing/checkout`) fallará al intentar guardar el `customerId` devuelto por Stripe.
- El webhook de Stripe (`/billing/webhook`) fallará al intentar actualizar `stripeSubscriptionId` tras un evento `checkout.session.completed` o `customer.subscription.deleted`.
- En producción el entorno actual puede funcionar solo porque las columnas fueron creadas manualmente o porque la DB nunca fue reconstruida desde cero tras la integración de Stripe.

### Posible solución

**Ruta A — entorno de desarrollo (DB sin datos críticos):**

```bash
npx prisma migrate dev --name add_stripe_fields_to_tenant
```

Prisma detectará la diferencia entre el schema y la DB, generará el `ALTER TABLE` automáticamente y registrará la migración.

**Ruta B — producción (columnas ya existen en la DB):**

Crear manualmente el archivo `prisma/migrations/<timestamp>_add_stripe_fields_to_tenant/migration.sql` con el siguiente contenido:

```sql
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
```

Luego marcarla como ya aplicada sin ejecutarla:

```bash
npx prisma migrate resolve --applied <timestamp>_add_stripe_fields_to_tenant
```

Esto sincroniza el historial de migraciones con el estado real de la DB sin riesgo de duplicar columnas.

### Resolución

Resuelta el 2026-05-23 con migración manual `20260523082103_add_stripe_fields_to_tenant` aplicada via `migrate resolve --applied` (Situación A del catálogo de prisma-migration-fix). Las dos columnas existían en la DB desde la integración de Stripe en abril 2026 pero nunca tuvieron migración asociada. Resolución idéntica al patrón del drift de notes (ver commit a5714cf como referencia histórica).

---

## ✅ RESUELTA — Campo `sendAt` en reminders sin soporte de offset de timezone

### Descripción del problema

`backend/src/routes/reminders.routes.js:12` valida el campo `sendAt` con:

```js
sendAt: z.string().datetime(),
```

Zod 3.23.x con `.datetime()` sin opciones solo acepta strings UTC con sufijo `Z`. Cualquier datetime con offset de timezone explícito (ej. `+02:00` en verano, `+01:00` en invierno) es rechazado con 400 "Datos inválidos" antes de llegar al handler.

Este es el mismo patrón que causó el bug documentado en las citas (`startTime`/`endTime`), corregido el 2026-05-17 añadiendo `{ offset: true }`. El fix se aplicó solo en `appointments.routes.js` — `reminders.routes.js` quedó sin corregir.

### Impacto potencial

- Cualquier cliente que envíe `sendAt` en hora local de Madrid (con offset `+02:00` o `+01:00`) recibirá un 400 inesperado al intentar crear un recordatorio.
- Si el frontend construye el datetime del recordatorio a partir de la hora de la cita (que ya acepta offsets tras el fix de appointments), la inconsistencia entre endpoints generará errores intermitentes difíciles de reproducir.

### Posible solución

Aplicar el mismo fix que en appointments: cambiar en `reminders.routes.js:12`:

```js
// antes
sendAt: z.string().datetime(),

// después
sendAt: z.string().datetime({ offset: true }),
```

Reiniciar el backend con `pm2 restart citio-backend` tras el cambio.

### Resolución

Resuelta el 2026-05-23 con el mismo fix aplicado a appointments en mayo (`z.string().datetime({ offset: true })`). Cambio puntual en `backend/src/routes/reminders.routes.js:12`. Backend reiniciado via pm2 restart citio-backend. Ver commit 60d35d6 para el cambio aplicado.

---

## `tenantMiddleware` no resuelve `req.tenantId` para el slug `localhost`

### Descripción del problema

`backend/src/middleware/tenant.js:7-10` tiene un caso especial para slugs ambiguos en entorno local:

```js
if (!slug || slug === 'localhost' || slug === '187') {
  req.tenantSlug = 'demo'
  return next()
}
```

Cuando el cliente envía `X-Tenant-Slug: localhost`, el middleware setea `req.tenantSlug = 'demo'` y llama a `next()` **sin consultar la base de datos**, lo que significa que `req.tenant` y `req.tenantId` quedan `undefined`.

El código del camino normal (slug real) sí setea ambos:
```js
req.tenant = tenant
req.tenantId = tenant.id
```

El middleware debería resolver el tenant `demo` desde la DB — igual que hace con cualquier otro slug — y poblar `req.tenant` y `req.tenantId` antes de pasar al siguiente handler.

### Impacto potencial

- **`POST /auth/login`** falla con 500: el handler usa `req.tenantId` para construir la cláusula `where` de Prisma. Con `tenantId = undefined`, la query es `findUnique({ where: { email } })`, pero `email` no tiene índice único propio (solo `@@unique([tenantId, email])`), por lo que Prisma lanza un error interno.
- Cualquier otra ruta que dependa de `req.tenantId` (appointments, clients, notes, users) puede fallar silenciosamente o con 500 cuando se prueba desde entorno local usando `X-Tenant-Slug: localhost`.
- El problema afecta especialmente a entornos de desarrollo y pruebas manuales con curl, donde `localhost` es el valor natural de `X-Tenant-Slug`.

### Posible solución

Reemplazar el cortocircuito actual por una resolución real del slug `demo` desde la DB:

```js
if (!slug || slug === 'localhost' || slug === '187') {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo', active: true } })
  if (tenant) {
    req.tenant = tenant
    req.tenantId = tenant.id
  }
  req.tenantSlug = 'demo'
  return next()
}
```

Esto mantiene la compatibilidad con entornos donde el tenant `demo` no existe (el bloque sigue siendo no-fatal) y evita que `req.tenantId` quede `undefined` cuando sí existe.

---

## Falta indexar la tabla `notes`

### Descripción del problema

La tabla `notes` solo tiene el índice de clave primaria (`notes_pkey` sobre `id`). No existen índices adicionales sobre ninguna otra columna.

### Impacto potencial

Las queries típicas sobre notas filtran por `tenant_id` y/o `client_id` y ordenan por `created_at DESC`. Sin índices en esas columnas, cualquier consulta de este tipo provoca un seq scan sobre toda la tabla. Con volumen creciente de notas esto degradará progresivamente el rendimiento.

### Posible solución

Crear una migración futura con los siguientes índices:

```sql
CREATE INDEX "notes_tenant_id_idx" ON "notes"("tenant_id");
CREATE INDEX "notes_client_id_idx" ON "notes"("client_id");
CREATE INDEX "notes_tenant_id_created_at_idx" ON "notes"("tenant_id", "created_at" DESC);
```

---

## Verificación end-to-end de migraciones pendiente

### Descripción del problema

Hasta el 2026-05-20, `backend/prisma/migrations/` estaba excluido de git mediante una línea en `.gitignore`. Esto significa que ningún entorno limpio ha aplicado las migraciones reales mediante `prisma migrate deploy`. La DB actual de producción se construyó via SQL manual o `db push`, no via `migrate deploy`.

### Impacto potencial

No hay garantía de que un deploy nuevo (otro VPS, otra máquina, staging, CI) produzca un schema idéntico al de producción actual. Las migraciones en disco (`20260419161652_multitenant_citio` y `20260520205051_add_notes_table`) son la mejor representación del schema esperado, pero no han sido validadas contra una DB limpia. El drift de los campos Stripe en `tenants` (entrada separada en este fichero) es un ejemplo concreto de este riesgo.

### Posible solución

En una sesión futura, levantar un PostgreSQL vacío en otro puerto, ejecutar `prisma migrate deploy`, comparar el schema resultante con producción via `pg_dump --schema-only` y diff. Resolver cualquier diferencia con migraciones complementarias antes de confiar en el historial para nuevos deploys.

---

## ✅ COMPLETADO — Apagado controlado de OpenClaw

### Contexto

OpenClaw se montó en este VPS en marzo 2026 como prueba de framework de agentes/subagentes con bot de Telegram (`@wilmer_fiverr_bot`) para automatizar mejoras de perfil en Fiverr. Tras evaluación (sesión del 23 mayo 2026), se decide no continuar con OpenClaw por: (1) vulnerabilidades documentadas (paper de seguridad Texas A&M, feb 2026), (2) pérdida de acceso vía suscripción Claude, (3) caso de uso ya cubierto por Claude Code y la futura consola DevOps.

### Estado del apagado

Servicios systemd parados y deshabilitados:
- `openclaw-gateway.service` → inactive, disabled
- `openclaw-node.service` → inactive, disabled

No estuvieron en pm2. Sin dependencias con Citio (`citio-backend` y `citio-frontend` siguen vivos sin referencias a openclaw).

Detalle a investigar: el SIGTERM final llegó el 2026-05-23 a las 09:16:02 sin intervención manual explícita en esta sesión. La causa exacta no se ha confirmado. Hipotesis: (a) health-monitor de openclaw tras sucesivos stale-socket de Telegram, (b) restart pendiente del VPS (el MOTD mostraba 'System restart required' en sesiones anteriores), o (c) reset de proceso por systemd tras superar limites internos. El uptime actual del VPS (since 2026-03-09) sugiere que NO hubo reboot reciente, pero el origen exacto del SIGTERM queda sin determinar. Para una sesión futura: revisar journalctl con timestamps anteriores a 09:16:02 para encontrar la señal previa.

### Archivos conservados

| Ruta | Contenido |
|---|---|
| `/home/dev/openclaw-fiverr/` | Proyecto: `.env` (solo `TELEGRAM_BOT_TOKEN`), `config/`, `data/` (vacío), `logs/` (vacío) |
| `/home/dev/.openclaw/` | Config principal: tokens de dispositivo, state de Telegram, workspace docs |
| `/home/dev/.openclaw-gestorcitas/` | Config específica del workspace: sesiones, auth-profiles (OpenAI Codex OAuth) |
| `/home/dev/.config/openclaw` | Ubicación XDG config |
| `/home/dev/.openclaw.backup-2026-03-07-*/` | Tres snapshots de configuración del 7 de marzo 2026 |

No hay credenciales de Gmail almacenadas en texto plano en ninguno de los directorios config. El `gmail-watcher` visible en los logs usaba credenciales del runtime de OpenClaw.

### Pendientes de revocación

Sin proceso corriendo, ninguno de estos tokens recibe tráfico. La revocación es defensa en profundidad para evitar que un acceso futuro al VPS comprometa cuentas externas. No urge.

- **Token Telegram** (`@wilmer_fiverr_bot`): revocar manualmente en @BotFather (`/mybots` → seleccionar bot → API Token → Revoke current token).
- **Credenciales OpenAI Codex** en `/home/dev/.openclaw-gestorcitas/agents/main/agent/auth-profiles.json`: tipo OAuth con `access` + `refresh` + `expires`. Si el `expires` ya pasó, el `access` ya no funciona pero el `refresh` puede seguir siendo válido. Revocar la sesión entera en https://platform.openai.com/account/sessions o equivalente.
- **Credenciales de Gmail**: no almacenadas localmente en plain text. Si el runtime de OpenClaw las cacheaba en otro lugar, han caducado o se invalidan al pararse el proceso. No requiere acción explícita.
### Re-arranque futuro (referencia para reactivación selectiva)

Si en algún momento se decide reactivar OpenClaw para una tarea concreta:

1. **Antes de re-arrancar**: revisar si la versión instalada tiene CVEs críticos pendientes (consultar el paper Texas A&M de feb 2026 sobre taxonomía de vulnerabilidades de OpenClaw, y CVE database). Actualizar a versión segura o decidir no re-arrancar.

2. **Activar los servicios** (en este orden, gateway primero):

       sudo systemctl enable openclaw-gateway.service openclaw-node.service
       sudo systemctl start openclaw-gateway.service openclaw-node.service

3. **Verificar conexión Telegram** en logs:

       journalctl -u openclaw-gateway.service -f

   Esperado: líneas tipo `[telegram] starting provider (@wilmer_fiverr_bot)` y luego silencio (sin errores).

4. **Restringir a localhost** vía firewall si el caso de uso no requiere acceso externo (los puertos 18789-18792 ya estaban en 127.0.0.1, mantener así):

       sudo ufw status verbose
       sudo ufw deny 18789:18792/tcp

5. **Verificar que no interfiere con Citio**:

       pm2 list
       curl -s http://localhost:3000/health
