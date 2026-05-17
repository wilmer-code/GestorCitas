# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Setup (first time)
```bash
docker compose up -d                        # PostgreSQL on port 5433

cd backend && cp .env.example .env
npm i
npx prisma generate
npx prisma migrate dev
npx prisma db seed

cd ../frontend && cp .env.example .env
npm i
```

### Running
```bash
# Backend (from /backend)
npm run dev          # nodemon + node --env-file=.env

# Frontend (from /frontend)
npm run dev          # Vite on http://localhost:5173
npm run build
```

### Database
```bash
# From /backend
npx prisma migrate dev --name <nombre>   # nueva migración
npx prisma migrate deploy                # aplicar en producción
npx prisma db seed                       # seed inicial
npx prisma studio                        # UI de inspección
```

### URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/health

### Seed credentials
- `admin@gestorcitas.local` / `admin123` (role: ADMIN)
- `user@gestorcitas.local` / `user123` (role: USER)

## Architecture

Monorepo con dos paquetes independientes: `backend/` y `frontend/`. No hay workspace raíz — cada uno tiene su propio `package.json` y `node_modules`.

### Backend (`backend/src/`)

Express API REST con arquitectura por capas:

```
index.js          → arranca el servidor y el reminder worker
app.js            → monta middlewares globales y rutas
routes/           → un fichero por recurso (auth, users, clients, appointments, reminders, notes, tenants, billing)
middleware/       → auth.js, tenant.js, planLimits.js, role.js, validate.js
jobs/             → reminder.worker.js (cron cada minuto)
lib/              → prisma.js (singleton), swagger.js
```

**Flujo de request en rutas protegidas:**
1. `tenantMiddleware` — resuelve el tenant desde el header `X-Tenant-Slug` y lo pone en `req.tenant` / `req.tenantId`
2. `authRequired` — valida JWT y pone el payload en `req.user`; verifica que `req.user.tenantId === req.tenantId`
3. `checkAppointmentLimit` (solo en `/appointments`) — consulta el plan del tenant y bloquea si se superó el límite mensual
4. `requireRole('ADMIN')` — guard adicional en rutas de administración
5. `validate(schema)` — valida body con Zod y pone el resultado en `req.validatedBody`

**Multi-tenancy:** todos los modelos Prisma tienen `tenantId`. Todas las queries deben filtrarse por `req.user.tenantId`. El tenant "demo" se resuelve cuando el slug es `localhost` (entorno local sin header).

**Planes y límites** (`middleware/planLimits.js`):
- FREE: 50 citas/mes, 100 clientes
- PRO: 500 citas/mes, 1000 clientes
- BUSINESS: sin límite

**Stripe** (`routes/billing.routes.js`): El webhook `/billing/webhook` requiere body raw (configurado antes del `express.json()`). Los eventos relevantes son `checkout.session.completed` y `customer.subscription.deleted`.

**Reminder worker:** cron `* * * * *` que busca `sendAt <= now AND sentAt IS NULL`. Con `REMINDER_MODE=dev` imprime en consola; con `REMINDER_MODE=email` envía por SMTP.

**Reglas de negocio en citas:**
- Anti-solapamiento por usuario: `409 Conflict` si hay otra cita activa en el mismo rango (excluye status `CANCELLED`)
- Validación de rango temporal: `startTime < endTime`, ambos como ISO 8601 con timezone
- **⚠ La validación de horario comercial NO está implementada en el código actual.** El README y el script `backend/scripts/test-business-hours.sh` documentan un rango 10:00–20:30 hora Madrid (UTC+1 en invierno / UTC+2 en verano), pero `appointments.routes.js` no tiene ningún check de horas. Además el script usa los campos obsoletos `startAt`/`endAt` (el API actual usa `startTime`/`endTime`) y está roto. Ver `NOTAS_PENDIENTES.md`.

### Frontend (`frontend/src/`)

React SPA sin router de terceros — enrutamiento manual con `window.history.pushState` + evento `popstate`.

```
main.jsx          → monta AuthProvider > App
context/AuthContext.jsx → token en localStorage, slug del tenant en localStorage
api.js            → wrapper fetch: inyecta Authorization header y X-Tenant-Slug automáticamente
App.jsx           → switch de rutas + UpgradeBanner (aviso al 80% del límite FREE)
pages/            → LoginPage, RegisterPage, DashboardPage, AdminUsersPage, PricingPage
components/       → AppointmentModal, UserEditModal
```

**`api.js`:** todas las llamadas al backend pasan por esta función. Lee `tenantSlug` de `localStorage`. La URL base viene de `VITE_API_URL` (`.env`).

**`AuthContext`:** expone `{ token, user, loading, login, logout }`. `user` incluye el objeto `tenant` con `plan` para condicionar la UI según el plan.

**FullCalendar** se usa en `DashboardPage` con vistas `dayGrid`, `timeGrid` e `interaction`.

### Base de datos

PostgreSQL 16. ORM: Prisma 5. IDs: UUIDs (`TEXT` en Prisma). Convención de nombres: tablas y columnas en snake_case (`@@map` / `@map` en el schema).

**Advertencia conocida:** la tabla `notes` no tiene `CREATE TABLE` en ninguna migración existente (ver `NOTAS_PENDIENTES.md`). Si se recrea la DB desde cero falla en runtime.

## Operativa en el VPS

### Gestión de procesos en el VPS

El backend y el frontend corren bajo **pm2** en producción — nunca con `node` a pelo.

| Proceso | pm2 name | pm2 id | Puerto |
|---|---|---|---|
| Backend (Express) | `citio-backend` | 0 | :3000 |
| Frontend (Vite preview) | `citio-frontend` | 2 | :4173 |

```bash
pm2 restart citio-backend    # reiniciar backend tras cambios de código
pm2 restart citio-frontend   # reiniciar frontend
pm2 logs citio-backend       # logs en vivo del backend
pm2 list                     # estado de todos los procesos
```

**NUNCA** usar `kill <pid> && node ... &` para reiniciar. pm2 detecta el kill y relanza el proceso por su cuenta, creando una race condition entre el proceso zombie y el nuevo.

> **Nota:** Hay un proceso adicional `openclaw-node` corriendo en el VPS fuera de pm2. Su origen está pendiente de identificar — ver `NOTAS_PENDIENTES.md` cuando se haya investigado.

### Trabajo desde el VPS por SSH
- El proyecto vive en `/home/dev/workspaces/gestorcitas` en el VPS (187.124.28.30, user `dev`).
- Para editar archivos largos vía SSH sin que se rompa el shell con comillas o backticks, usar heredoc con delimitador entre comillas simples:
  ```bash
  cat > path/al/archivo << 'EOF'
  ...contenido literal sin expansión de variables...
  EOF
  ```
  El delimitador entrecomillado evita que bash interprete `$variables`, backticks o `\`.
- Para scripts Python multilínea: `python3 << 'PYEOF' ... PYEOF`

### Recuperación de drift en Prisma
Cuando `schema.prisma` y el historial de migraciones se desincronicen (ej: la DB tiene una tabla que ninguna migración crea, o al revés), **nunca** hacer `prisma migrate reset` en un entorno con datos. El flujo correcto es:

1. Si la tabla **ya existe en la DB** pero falta la migración: crear la migración manualmente en `prisma/migrations/<timestamp>_<nombre>/migration.sql` con el SQL exacto que coincida con la tabla actual, y luego:
   ```bash
   npx prisma migrate resolve --applied <timestamp>_<nombre>
   ```
   Esto registra la migración como aplicada sin ejecutarla.
2. Si una migración falló a mitad: `npx prisma migrate resolve --rolled-back <nombre>` y reintentar.
3. Solo en desarrollo (jamás en prod): `npx prisma migrate reset` para empezar de cero.

### Permisos de Claude Code en este proyecto
- **Lectura** (Read, Glob, Grep, Bash con `ls`/`cat`/`grep`): siempre permitido.
- **Escritura** (Write, Edit): pedir confirmación caso por caso, en especial para archivos en `prisma/migrations/` y `.env*`.
- **Comandos destructivos** (`rm`, `prisma migrate reset`, `dropdb`, `docker volume rm`): jamás sin confirmación explícita **y** un backup previo.

### Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens (8h de expiración) |
| `REMINDER_MODE` | `dev` (consola) o `email` (SMTP) |
| `STRIPE_SECRET_KEY` | Clave secreta Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clave pública Stripe (se expone al frontend vía `/billing/config`) |
| `STRIPE_PRICE_PRO` | ID del precio Stripe para el plan PRO |
| `STRIPE_WEBHOOK_SECRET` | Para verificar firma de webhooks |
| `APP_URL` | URL base para redirects de Stripe |
| `VITE_API_URL` | URL del backend desde el frontend |

## Convenciones de respuesta para Claude

- Antes de cualquier cambio destructivo o que toque `prisma/migrations/`, `.env*` o `schema.prisma`: mostrar primero el plan en un párrafo corto y pedir OK explícito.
- Cuando se creen nuevas migraciones, listarlas a continuación con su nombre completo (timestamp + slug).
- Si se detecta drift entre el código y la documentación (CLAUDE.md desactualizado): anotarlo en `NOTAS_PENDIENTES.md` en vez de "arreglarlo" silenciosamente.
- Output en español por defecto.
