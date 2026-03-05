# VALIDATION.md - GestorCitas

## 0) Configuración portable

Define una URL base para no hardcodear `localhost`.

### bash / zsh (Linux/macOS)

```bash
# Fallback por defecto (si no existe API_BASE)
export API_BASE="${API_BASE:-http://localhost:3000}"

# Servidor (ejemplo)
# export API_BASE="https://mi-dominio-o-ip"
```

### PowerShell (Windows)

```powershell
# Local
$env:API_BASE = "http://localhost:3000"

# Servidor (ejemplo)
# $env:API_BASE = "https://mi-dominio-o-ip"
```

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ (local o Docker)
- `curl`
- `jq` (opcional, para extraer valores JSON)
- `python3` (alternativa portable a `jq`)

### Instalar jq (opcional)

- Ubuntu/Debian:

```bash
sudo apt update && sudo apt install -y jq
```

- macOS (Homebrew):

```bash
brew install jq
```

- Windows (Chocolatey, PowerShell admin):

```powershell
choco install jq -y
```

---

## Precondiciones

### Opción A) PostgreSQL con Docker

```bash
docker compose up -d
```

### Opción B) PostgreSQL local

#### Linux (systemd) — compatible con `.env` por defecto (`postgres/postgres`)

```bash
sudo systemctl start postgresql || true
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE gestorcitas;" 2>/dev/null || true
```

#### Opción secundaria: crear usuario dedicado `gestorcitas`

```bash
sudo systemctl start postgresql || true
sudo -u postgres psql -c "CREATE DATABASE gestorcitas;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER gestorcitas WITH PASSWORD 'gestorcitas';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gestorcitas TO gestorcitas;" 2>/dev/null || true
```

> Si usas usuario dedicado, actualiza `backend/.env` en `DATABASE_URL` (usuario/clave/host/puerto) para que coincida.
>
> macOS/Windows: inicia tu servicio PostgreSQL local con tu método habitual (Postgres.app, Homebrew services, instalador oficial o contenedor), y asegúrate de tener una base accesible en la URL de `DATABASE_URL`. Puedes usar el enfoque por defecto (`postgres/postgres`) o usuario dedicado, pero la URL debe coincidir.

### Backend

```bash
cd backend
cp .env.example .env
npm i
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

### Frontend (opcional para validar API)

```bash
cd ../frontend
npm i
npm run dev
```

Credenciales seed:
- admin: `admin@gestorcitas.local` / `admin123`
- user: `user@gestorcitas.local` / `user123`

---

## 1) Health

```bash
curl -s "${API_BASE}/health"
```

Esperado: `{"ok":true}`

---

## 2) Auth - login user

```bash
curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@gestorcitas.local","password":"user123"}'
```

Guardar token user (con `jq`):

```bash
USER_TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@gestorcitas.local","password":"user123"}' | jq -r '.token')

echo "$USER_TOKEN"
```

Alternativa sin `jq` (python3):

```bash
USER_TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@gestorcitas.local","password":"user123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "$USER_TOKEN"
```

## 3) Auth - login admin

Con `jq`:

```bash
ADMIN_TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gestorcitas.local","password":"admin123"}' | jq -r '.token')

echo "$ADMIN_TOKEN"
```

Sin `jq` (python3):

```bash
ADMIN_TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gestorcitas.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "$ADMIN_TOKEN"
```

### PowerShell (login rápido + token)

```powershell
$userBody = @{ email = "user@gestorcitas.local"; password = "user123" } | ConvertTo-Json
$adminBody = @{ email = "admin@gestorcitas.local"; password = "admin123" } | ConvertTo-Json

$USER_TOKEN = (Invoke-RestMethod -Uri "$env:API_BASE/auth/login" -Method Post -ContentType "application/json" -Body $userBody).token
$ADMIN_TOKEN = (Invoke-RestMethod -Uri "$env:API_BASE/auth/login" -Method Post -ContentType "application/json" -Body $adminBody).token
```

## 4) Auth - me

```bash
curl -s "${API_BASE}/auth/me" \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## 5) Users (solo admin)

### Listar usuarios (admin OK)

```bash
curl -s "${API_BASE}/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Listar usuarios con token user (debe fallar 403)

```bash
curl -i -s "${API_BASE}/users" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Crear usuario (admin)

```bash
curl -s -X POST "${API_BASE}/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"User Nuevo","email":"nuevo@gestorcitas.local","password":"user1234","role":"user"}'
```

---

## 6) Clients CRUD + search (user)

### Crear cliente

```bash
CLIENT=$(curl -s -X POST "${API_BASE}/clients" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente QA","email":"qa@cliente.com","phone":"600999888"}')

echo "$CLIENT"
```

Extraer `CLIENT_ID` con `jq`:

```bash
CLIENT_ID=$(echo "$CLIENT" | jq -r '.id')
```

Alternativa sin `jq`:

```bash
CLIENT_ID=$(echo "$CLIENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
```

### Listar clientes

```bash
curl -s "${API_BASE}/clients" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Buscar clientes

```bash
curl -s "${API_BASE}/clients?q=QA" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Ver cliente por id

```bash
curl -s "${API_BASE}/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Actualizar cliente

```bash
curl -s -X PUT "${API_BASE}/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"611222333"}'
```

---

## 7) Appointments CRUD + filtros + anti-solapes

Usa timestamps ISO fijos de ejemplo (sin `date -d`):

```bash
START="2030-01-15T10:00:00Z"
END="2030-01-15T11:00:00Z"
```

### Crear cita válida

```bash
APPT=$(curl -s -X POST "${API_BASE}/appointments" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":$CLIENT_ID,\"startAt\":\"$START\",\"endAt\":\"$END\"}")

echo "$APPT"
```

Extraer `APPT_ID` con `jq`:

```bash
APPT_ID=$(echo "$APPT" | jq -r '.id')
```

Alternativa sin `jq`:

```bash
APPT_ID=$(echo "$APPT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
```

### Probar solape (debe devolver 409)

```bash
START2="2030-01-15T10:30:00Z"
END2="2030-01-15T11:30:00Z"

curl -i -s -X POST "${API_BASE}/appointments" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":$CLIENT_ID,\"startAt\":\"$START2\",\"endAt\":\"$END2\"}"
```

### Listar citas por rango

```bash
RANGE_START="2030-01-15T00:00:00Z"
RANGE_END="2030-01-15T23:59:59Z"

curl -s "${API_BASE}/appointments?start=$RANGE_START&end=$RANGE_END" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Ver cita por id

```bash
curl -s "${API_BASE}/appointments/$APPT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Actualizar cita

```bash
NEW_END="2030-01-15T11:15:00Z"

curl -s -X PUT "${API_BASE}/appointments/$APPT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"endAt\":\"$NEW_END\"}"
```

---

## 8) Reminders crear/listar por cita

### Crear recordatorio (offsetMinutes)

```bash
REM=$(curl -s -X POST "${API_BASE}/reminders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"appointmentId\":$APPT_ID,\"offsetMinutes\":60}")

echo "$REM"
```

### Listar recordatorios por cita

```bash
curl -s "${API_BASE}/reminders?appointmentId=$APPT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Ver cron en modo dev

Cuando `REMINDER_MODE=dev`, al llegar `sendAt` debe aparecer log tipo:

```text
[REMINDER][DEV] Recordatorio: cita con ...
```

Y en DB/API el recordatorio debe quedar con `sentAt` distinto de `null`.

---

## 9) Swagger/OpenAPI

```bash
# UI docs (abre en navegador)
# Linux: xdg-open, macOS: open
xdg-open "${API_BASE}/api/docs" 2>/dev/null || open "${API_BASE}/api/docs" 2>/dev/null || true

# Chequeo rápido de disponibilidad
curl -I -s "${API_BASE}/api/docs"
```

```powershell
# Windows (PowerShell)
Start-Process "$env:API_BASE/api/docs"
```

Esperado: respuesta 200 y UI con paths `/auth/login`, `/users`, `/clients`, `/appointments`, `/reminders`.

---

## 10) Limpieza opcional (borrar recursos QA)

```bash
curl -s -X DELETE "${API_BASE}/appointments/$APPT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"

curl -s -X DELETE "${API_BASE}/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## 11) Pruebas manuales (UI)

1. Abrir el frontend:
   - Local: `http://localhost:5173`
   - Servidor/VPS (modo dev): `http://<IP_O_DOMINIO>:5173`
   - Producción (si se publica): `https://<DOMINIO>` (según reverse proxy)
2. Ir a `/login` e iniciar sesión con usuario normal:
   - `user@gestorcitas.local`
   - `user123`
3. Verificar Dashboard cargado con:
   - Calendario FullCalendar (vista mes y opciones semana/día)
   - Agenda del día
   - Lista de clientes con búsqueda
4. Crear un cliente desde la sección Clientes (formulario de alta) y confirmar que aparece en la lista.
5. Editar y eliminar un cliente desde la lista de clientes y verificar que los cambios se reflejan sin recargar la app.
6. Crear una cita válida dentro de horario (`09:00–18:00`) desde el formulario de cita (cliente + fecha/hora + duración).
7. Confirmar que la cita aparece en FullCalendar y en la agenda del día.
8. Intentar crear otra cita solapada para el mismo usuario y comprobar error visible en UI (mensaje de conflicto `409` por solape).
9. Abrir una cita existente y usar la acción “Cancelar cita”; validar que el estado cambia a cancelada.
10. Probar filtros de agenda:
   - Filtro por cliente
   - Filtro por estado (pendiente/realizada/cancelada)
11. Crear recordatorios desde la cita:
   - Preset `+24h`
   - Preset `+2h`
   - Offset manual (ej. `60` minutos)
12. Cerrar sesión, entrar como admin:
   - `admin@gestorcitas.local` / `admin123`
   - Ir a `/admin/users` (si está habilitado) y validar listado de usuarios.

### Evidencias para la memoria

- Captura de pantalla del login con campos completos.
- Captura del dashboard (calendario + agenda + clientes visibles).
- Captura de creación/edición de cita válida (modal o resultado en calendario).
- Captura del error de solape mostrado en UI (mensaje de conflicto).
- Captura de Swagger en `${API_BASE}/api/docs` con endpoints principales.
