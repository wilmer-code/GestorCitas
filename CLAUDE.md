# CLAUDE.md — Contexto del proyecto Citio

Este archivo da contexto a cualquier sesión de Claude Code que trabaje en este proyecto. Léelo entero antes de proponer o ejecutar nada.

---

## Qué es Citio

Citio (antes GestorCitas) es un SaaS multi-tenant de gestión de citas y clientes — un mini-CRM para pequeños negocios y pymes en España y LATAM. Mercado objetivo: peluquerías, clínicas, consultores y similares.

Diferenciación frente a la competencia (Calendly, HubSpot, Zoho Bookings, Fresha, Acuity):
- Configuración vertical por sector (un producto, varios nichos)
- Precio agresivo con un plan gratuito real
- Reserva pública sin fricciones
- Funciones de IA ligeras

El objetivo es comercializarlo. El dueño (Wilmer) trabaja de lunes a viernes y solo revisa y prueba los fines de semana, por eso valora que el trabajo venga preparado y autónomo, pero SIEMPRE con su autorización explícita para acciones con consecuencias.

---

## Stack técnico

**Backend:** Node.js + Express en CommonJS (require/module.exports). NO migrar a ESM — se intentó y se revirtió por fallos. Todo el backend usa require.
**Base de datos:** PostgreSQL 16 en Docker (contenedor `gestorcitas-postgres`, puerto 5433).
**ORM:** Prisma 5.22.0.
**Auth:** JWT + bcrypt. El token incluye tenantId.
**Frontend:** React + Vite + Tailwind + FullCalendar + React Hook Form.
**Proceso:** pm2 gestiona `citio-backend` (puerto 3000) y `citio-frontend` (puerto 4173).
**Proxy:** Nginx enruta el puerto 80 → frontend (4173) y /api/ → backend (3000).
**Pagos:** Stripe (cuenta de test). Plan PRO 9,99€/mes.

**Infra:** VPS Hostinger. Proyecto en /home/dev/workspaces/gestorcitas. Usuario dev.
**Repo:** github.com/wilmer-code/GestorCitas. Rama de trabajo: dev.

---

## Arquitectura multi-tenant

Cada negocio es un Tenant con su slug único (ej. peluqueria-demo). Todas las entidades (User, Client, Appointment, Reminder, Note) tienen tenant_id y se filtran por él. El middleware de tenant resuelve el slug desde el header x-tenant-slug o el subdominio. El JWT lleva el tenantId y el middleware de auth verifica que coincida.

Tablas: tenants, users, clients, appointments, reminders, notes.
Planes: FREE (50 citas/mes, 100 clientes), PRO (500/1000), BUSINESS (ilimitado).

---

## Lecciones aprendidas — IMPORTANTE, no repetir errores

1. **Migraciones Prisma:** Los cambios de schema se hacen con `psql` directo dentro del contenedor Docker, NO con `prisma migrate`, porque el historial de migraciones entra en conflicto con el schema multi-tenant. Patrón: ALTER TABLE / CREATE TABLE por psql, luego ajustar schema.prisma para que coincida, luego regenerar cliente.

2. **Regenerar cliente Prisma:** `npx prisma generate` solo NO basta cuando cambian columnas. Hay que hacer el ciclo completo: `rm -rf node_modules/@prisma/client && npm install && npx prisma generate`. Si no, da errores P2022 (columna no existe) aunque la columna esté en la BD.

3. **Mapeo de columnas:** Las columnas añadidas por ALTER TABLE deben coincidir EXACTAMENTE con los nombres @map() del schema, o da P2022.

4. **Escribir ficheros en el VPS:** Usar bloques Python heredoc (python3 << 'PYEOF'). Los heredocs de bash con caracteres especiales corrompen los ficheros. Evitar template literals anidados de JS dentro de Python — rompen el parser. Para JSX usar concatenación con + en vez de template literals con backtick.

5. **Logs de pm2:** Hacer `pm2 flush <app>` antes de leer logs, porque los errores cacheados confunden y parecen errores actuales cuando ya están resueltos.

6. **Comando SQL de una línea:** `docker exec gestorcitas-postgres psql -U gestorcitas -d gestorcitas -c "..."`

---

## Estado actual (último: integración Stripe)

Completado y funcionando:
- BD multi-tenant con 6 tablas
- Registro de negocios (POST /tenants/register) y verificación de slug
- Login multi-tenant con tenantId en JWT
- CRUD de clientes, citas, recordatorios, usuarios — todos filtrados por tenant
- Notas por cliente
- Dashboard con calendario FullCalendar, agenda, clientes, notas
- Panel de admin de usuarios con roles ADMIN/USER
- Límite del plan FREE (50 citas/mes) vía middleware planLimits
- Integración Stripe: página /pricing, checkout PRO, webhook, portal de gestión, banner de límite
- Claves Stripe en backend/.env (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_PRICE_PRO)

Pendiente / siguiente:
- Configurar el webhook en Stripe (URL: http://187.124.28.30/api/billing/webhook) y poner STRIPE_WEBHOOK_SECRET en .env
- Probar el pago end-to-end con tarjeta de test 4242 4242 4242 4242
- Documentar en SQL los cambios manuales de BD (migrations/manual/)
- Configuración vertical por sector
- Reserva pública sin fricciones (link compartible)
- Estadísticas / dashboard de KPIs

---

## Reglas de seguridad — LÍMITES ABSOLUTOS

Estas líneas NUNCA se cruzan, ni con aprobación rápida del usuario:

1. NUNCA ejecutar DROP TABLE, DROP DATABASE, TRUNCATE ni vaciar datos de producción.
2. NUNCA modificar, exponer, imprimir ni commitear el archivo .env (contiene claves de Stripe y JWT_SECRET). El .env debe estar en .gitignore.
3. NUNCA hacer git push --force a main. Trabajar solo en dev o ramas nuevas.
4. NUNCA commitear secretos, claves API ni tokens al repositorio.

## Acciones que REQUIEREN autorización explícita del usuario

Antes de cada una, explicar QUÉ hace y POR QUÉ, y esperar el OK:

- git commit y git push
- git pull (trae código nuevo de GitHub al VPS)
- npm install (instalar dependencias — decir cuáles y por qué)
- pm2 restart (reinicia el servicio — corta el servicio 1-2s; si el código falla puede quedar caído)
- Cualquier cambio de schema en la base de datos
- Cualquier despliegue a producción

El patrón de despliegue es: proponer ("voy a desplegar X: pull para traer el código, install porque añade Y, restart del backend para activarlo"), el usuario lee el porqué, aprueba, y solo entonces se ejecuta. Si algo falla tras el restart, saber revertir con git revert y reiniciar a la versión anterior.

## Flujo de trabajo

El usuario aprueba desde el móvil (vía Telegram) estando en el trabajo. Las propuestas deben ser claras, cortas y explicar el porqué, porque las lee en el móvil sin el código delante. Una acción = una aprobación. No encadenar acciones con consecuencias sin aprobación individual.
