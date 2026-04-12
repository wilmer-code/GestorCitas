# GestorCitas (Monorepo MVP)

Mini CRM + calendario + recordatorios para ejecutar en local.

## Stack

- Frontend: React + Vite + Tailwind + FullCalendar + React Hook Form
- Backend: Node.js + Express
- BBDD: PostgreSQL
- ORM/migraciones: Prisma
- Validación: Zod
- Auth: JWT + bcrypt
- Recordatorios: node-cron
- Docs API: Swagger/OpenAPI (`/api/docs`)

## Arquitectura

React SPA -> Express REST API -> PostgreSQL  
Cron/Worker Node -> PostgreSQL -> consola (DEV) / email opcional

## 1) Levantar PostgreSQL

```bash
docker compose up -d
```

## 2) Backend

```bash
cd backend
cp .env.example .env
npm i
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

API en `http://localhost:3000`  
Swagger en `http://localhost:3000/api/docs`

## 3) Frontend

```bash
cd frontend
npm i
npm run dev
```

App en `http://localhost:5173`

## Credenciales seed

- admin: `admin@gestorcitas.local` / `admin123`
- user: `user@gestorcitas.local` / `user123`

## Variables de entorno (backend/.env)

```env
DATABASE_URL="postgresql://gestorcitas:gestorcitas@localhost:5433/gestorcitas?schema=public"
JWT_SECRET="cambia_esto_por_un_secreto"
PORT=3000
REMINDER_MODE="dev" # dev | email
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="no-reply@gestorcitas.local"
```

## Endpoints MVP

- `POST /auth/login`
- `GET /auth/me`
- `/users` (solo admin) CRUD
- `/clients` CRUD + `?q=texto`
- `/appointments` CRUD + filtros `?start=&end=`
- `/reminders` crear/listar (`?appointmentId=`)

## Reglas de negocio implementadas

1. Anti-solapes por usuario (devuelve `409 Conflict`)
2. Horario fijo backend: 09:00-18:00
3. Recordatorios por offset en minutos (`send_at` calculado)
4. Cron cada minuto: pendientes (`send_at <= now && sent_at IS NULL`)
   - `REMINDER_MODE=dev`: consola y marca `sent_at`
   - `REMINDER_MODE=email`: envío SMTP (si está configurado)
5. Seguridad: JWT en endpoints protegidos + validación Zod

---

## Ejecución en local (Docker solo para Postgres)

### 1) Levantar Postgres

> Nota: Postgres Docker expone `5433` en el host porque `5432` suele estar ocupado por el Postgres del sistema.

```bash
docker compose up -d
docker compose ps
```

### 2) Backend

```bash
cd backend
cp .env.example .env
npm i
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### 3) Frontend

```bash
cd ../frontend
cp .env.example .env
npm i
npm run dev -- --host 0.0.0.0 --port 5173
```

### 4) URLs

- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/health
- Swagger: http://localhost:3000/api/docs

### 5) Usuario demo (seed)

- admin@gestorcitas.local / admin123
- user@gestorcitas.local / user123

### 6) Parar

```bash
docker compose down
```
