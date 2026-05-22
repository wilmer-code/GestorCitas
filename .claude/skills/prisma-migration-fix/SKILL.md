---
name: prisma-migration-fix
description: >
  Diagnostica y resuelve drift entre schema.prisma, el historial de
  migraciones y la base de datos real. Se auto-invoca cuando el usuario
  reporta: tabla que existe en la DB pero no tiene migración asociada,
  prisma migrate status muestra migraciones pendientes que la DB ya tiene,
  errores Prisma P3009 / P3017 / P3018, schema.prisma modificado sin
  migración generada, prisma migrate deploy falla en entorno limpio o
  nuevo VPS, o drift detectado entre schema y DB.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(psql:*)
  - Bash(npx prisma:*)
  - Bash(ls:*)
  - Bash(git:*)
  - Bash(git check-ignore:*)
---

# Diagnóstico y resolución de drift en Prisma

## 1. Cuándo se activa

- "La tabla X existe en la DB pero Prisma no la conoce"
- "migrate status dice N migraciones pendientes pero la DB ya las tiene"
- "prisma migrate deploy falla en entorno nuevo / staging / CI"
- "schema.prisma tiene cambios pero no creé ninguna migración"
- "drift detectado" / errores P3009, P3017, P3018
- "las migraciones no están en git"

---

## 2. Principios base — antes de tocar nada

- **NUNCA** `prisma migrate reset` en un entorno con datos de producción.
- La **DB real es la fuente de verdad**, no `schema.prisma`. Verifica la DB primero.
- `schema.prisma` puede tener drift respecto a la DB; documenta antes de "arreglar".
- Si `backend/prisma/migrations/` no está en git, **arregla eso primero**. Todo lo demás es secundario (ver Situación E).
- Antes de cualquier `rm -rf` sobre carpetas de migraciones: verificar con `git log -- <ruta>` que son recuperables. Si no están en git, confirmar con el usuario antes de borrar.

---

## 3. Diagnóstico paso a paso

**3.1.** Verificar si las migraciones están en git y si hay regla en `.gitignore`:
```bash
git check-ignore -v backend/prisma/migrations/
git log --oneline -3 -- backend/prisma/migrations/
```

**3.2.** Ver carpetas físicas en disco:
```bash
ls backend/prisma/migrations/
```

**3.3.** Ver qué está registrado como aplicado en la DB:
```bash
PGPASSWORD=<pass> psql -h <host> -p <port> -U <user> -d <db> -c \
  "SELECT migration_name, applied_steps_count, finished_at, rolled_back_at \
   FROM _prisma_migrations ORDER BY started_at;"
```

**3.4.** Cruzar con lo que Prisma ve:
```bash
cd backend && npx prisma migrate status
```

**3.5.** Cruce de los tres outputs:
- Carpetas en disco que NO están en `_prisma_migrations` → candidatas a borrar (obsoletas).
- Entradas en `_prisma_migrations` sin carpeta en disco → migración aplicada pero perdida del filesystem.
- Carpetas en disco sin entrada en `_prisma_migrations` → Prisma las ve como pendientes; puede ser drift real.

**3.6.** Para cada tabla con drift, obtener DDL real de la DB:
```bash
PGPASSWORD=<pass> psql -h <host> -p <port> -U <user> -d <db> -c "\d <tabla>"
```
Anotar: columnas con tipo y nullability, defaults, PK, FKs (ON DELETE / ON UPDATE), índices adicionales.

**3.7.** Comparar DDL real con el modelo en `schema.prisma`. Reportar explícitamente:
- Columnas que coinciden ✓
- Diferencias de tipo, nullable o default
- FKs con ON UPDATE diferente (Prisma genera CASCADE, DB manual puede tener NO ACTION)
- Índices ausentes

---

## 4. Catálogo de situaciones

**A) Tabla existe en DB, modelo en schema.prisma, NO hay migración** (caso `notes`, Citio 2026-05-20):
```bash
# 1. Crear directorio con timestamp actual
mkdir backend/prisma/migrations/<YYYYMMDDHHMMSS>_<nombre>/

# 2. Escribir migration.sql con el DDL real (no el de schema.prisma)
#    Incluir CREATE TABLE + ALTER TABLE para cada FK

# 3. Registrar como aplicada sin ejecutarla
cd backend && npx prisma migrate resolve --applied <YYYYMMDDHHMMSS>_<nombre>

# 4. Verificar
npx prisma migrate status   # debe decir "Database schema is up to date"
```

**B) Modelo nuevo en schema.prisma, tabla NO existe en DB:**
```bash
cd backend && npx prisma migrate dev --name <nombre_descriptivo>
# Prisma genera el SQL, lo aplica y registra la migración automáticamente.
```

**C) Modelo modificado en schema.prisma, tabla existe con columnas distintas:**
Decidir conscientemente la fuente de verdad:
- Si la DB está bien y schema.prisma se adelantó → Situación A (migración manual del ALTER TABLE real).
- Si schema.prisma está bien y la DB falta columnas → Situación B (`migrate dev`).
- **No ejecutar nunca `migrate dev` si la tabla ya existe con datos** sin verificar antes que Prisma no intentará recrearla.

**D) Migraciones en filesystem no están en `_prisma_migrations`** (pre-multitenant Citio):
Son migraciones obsoletas de un schema anterior, superado por una migración posterior que hizo wipe-and-recreate. Se pueden borrar del filesystem solo si:
1. `git log -- <ruta>` confirma que están en git (recuperables), O
2. El usuario da OK explícito sabiendo que no son recuperables.
```bash
rm -rf backend/prisma/migrations/<nombre_obsoleto>/
```

**E) `backend/prisma/migrations/` ignorado en `.gitignore`** (caso real Citio, primer commit):
```bash
# 1. Identificar la regla exacta
git check-ignore -v backend/prisma/migrations/migration.sql

# 2. Editar .gitignore y eliminar la línea que ignora migrations/
# 3. Verificar que ya no está ignorado
git check-ignore -v backend/prisma/migrations/   # debe devolver exit 1 sin output

# 4. git add + commit de .gitignore y todas las migraciones
# IMPORTANTE: hacer esto ANTES de cualquier fix de drift de schema
```

---

## 5. Comandos de referencia

```bash
# Conexión psql (leer DATABASE_URL de backend/.env)
PGPASSWORD=<pass> psql -h <host> -p <puerto> -U <user> -d <db>

# DDL de una tabla
psql ... -c "\d <tabla>"

# FKs con ON DELETE y ON UPDATE desde information_schema
psql ... -c "SELECT tc.constraint_name, kcu.column_name, ccu.table_name,
  rc.delete_rule, rc.update_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  WHERE tc.table_name = '<tabla>' AND tc.constraint_type = 'FOREIGN KEY';"

# Historial de migraciones en la DB
psql ... -c "SELECT migration_name, applied_steps_count, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;"

# Estado desde Prisma
cd backend && npx prisma migrate status

# Marcar migración como aplicada (sin ejecutar SQL)
npx prisma migrate resolve --applied <nombre_completo>

# Marcar migración como revertida (para reintentar)
npx prisma migrate resolve --rolled-back <nombre_completo>

# Timestamp para nombre de migración
date '+%Y%m%d%H%M%S'
```

---

## 6. Errores comunes y cómo evitarlos

| Error | Consecuencia | Cómo evitarlo |
|---|---|---|
| `rm -rf` de migración que sí está en `_prisma_migrations` | Prisma pierde el registro; `migrate deploy` intentará re-aplicar | Siempre cruzar filesystem con `_prisma_migrations` antes de borrar |
| `migrate dev` cuando la tabla ya existe en DB | Prisma puede intentar DROP y recrear, perdiendo datos | Usar Situación A (manual + resolve) si la tabla ya existe |
| `resolve --applied` sin verificar que el SQL coincide con la DB real | Drift silencioso; un `migrate deploy` futuro en DB limpia produce schema diferente | Obtener `\d <tabla>` antes de escribir el `migration.sql` |
| Pushear migraciones sin verificar que están en git | Otros entornos no las reciben; `migrate deploy` falla en CI | `git check-ignore` y `git ls-files` antes de cualquier deploy |

---

## 7. Caso histórico de referencia — Citio, 2026-05-20

La tabla `notes` existía en producción sin migración asociada desde la reescritura multitenant de abril 2026. Al investigar, se descubrió que `backend/prisma/migrations/` llevaba en `.gitignore` desde el primer commit del repo — ningún entorno limpio podía aplicar las migraciones.

Resolución completa: commits `a5714cf` (fix .gitignore + añadir migraciones a git) y `d60d0ae` (documentación). Ver `NOTAS_PENDIENTES.md` entradas "✅ RESUELTA — Tabla notes" y "Verificación end-to-end de migraciones pendiente".

El próximo drift conocido pendiente es **Campos Stripe en Tenant** (`stripe_customer_id`, `stripe_subscription_id` en `schema.prisma` sin migración). Aplicar Situación A.
