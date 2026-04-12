# E14 — Despliegue en entorno de pruebas

## 1) Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- PM2 (`npm i -g pm2`)

## 2) Variables de entorno

### Backend (`backend/.env`)

```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/gestorcitas
JWT_SECRET=CAMBIAR_EN_PRUEBAS
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://127.0.0.1:3000
```

## 3) Puertos recomendados

- Frontend: **5173** (dev) o **4173/8080** (preview/serve)
- Backend: **3000**
- PostgreSQL: **5432** (solo acceso local)

> No exponer PostgreSQL públicamente.

## 4) Arranque con PM2

### Opción A — Pruebas rápidas (DEV con Vite + Backend DEV)

```bash
# =========================
# DEV (pm2)
# Frontend: Vite (5173)
# Backend: Node/Express (3000)
# =========================

# 0) Requisitos
npm -v
node -v
pm2 -v

# 1) Backend (DEV)
cd /root/.openclaw/workspace/backend
npm i
# (si usas Prisma)
npx prisma generate
npx prisma migrate status

pm2 delete gestorcitas-backend 2>/dev/null || true
pm2 start npm --name gestorcitas-backend -- run dev
pm2 save

# 2) Frontend (DEV con Vite)
cd /root/.openclaw/workspace/frontend
npm i

pm2 delete gestorcitas-frontend-dev 2>/dev/null || true
pm2 start npm --name gestorcitas-frontend-dev -- run dev -- --host 0.0.0.0 --port 5173
pm2 save

# 3) Verificación rápida
pm2 status
pm2 logs gestorcitas-backend --lines 120
pm2 logs gestorcitas-frontend-dev --lines 120

# URLs (según tu VPS)
# Frontend: http://TU_IP:5173
# Backend:  http://127.0.0.1:3000  (normalmente consumo interno desde el frontend por VITE_API_URL)
```

### Opción B (recomendada: build + serve)

```bash
cd frontend
npm i
npm run build
pm2 start npx --name gestorcitas-frontend -- serve -s dist -l 5173
```

## 5) Reinicio, estado y logs

```bash
pm2 status
pm2 restart gestorcitas-backend
pm2 restart gestorcitas-frontend
pm2 logs gestorcitas-backend --lines 200
pm2 logs gestorcitas-frontend --lines 200
```

## 6) Verificación rápida

1. `GET /health` del backend responde `{ ok: true }`.
2. Frontend carga login.
3. Login exitoso y acceso a dashboard.
4. Flujo básico: crear cliente, crear cita, crear nota.

## 7) Troubleshooting

1. **Puerto ocupado**
   ```bash
   lsof -i :3000
   lsof -i :5173
   ```
2. **Variables .env backend**
   ```bash
   cat backend/.env | grep -E "PORT|DATABASE_URL|JWT_SECRET"
   ```
3. **Reinicio de procesos**
   ```bash
   pm2 restart gestorcitas-backend
   pm2 restart gestorcitas-frontend-dev
   ```
4. **Logs en vivo**
   ```bash
   pm2 logs gestorcitas-backend --lines 200
   pm2 logs gestorcitas-frontend-dev --lines 200
   ```

## 8) Seguridad mínima para pruebas

- No publicar `JWT_SECRET` ni `.env` en repositorio.
- Restringir firewall para que PostgreSQL (5432) solo escuche en localhost o red privada.
- Revisar logs de PM2 periódicamente para detectar errores de auth/API.
