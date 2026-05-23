# Consola DevOps — Documento de diseño

Estado: borrador inicial v1
Fecha: 2026-05-23
Autor: Wilmer

## 1. Visión y alcance

Aplicación web personal para monitorizar y operar los proyectos del VPS
desde múltiples dispositivos (iPhone, Mac mini, Windows del trabajo).
La consola es la pieza que sustituye conceptualmente lo que se intentó
con OpenClaw, pero construida sobre Claude Code y la infraestructura
existente del VPS.

**Para quién:** solo Wilmer (multi-dispositivo, un único usuario).
**Proyectos cubiertos:** Citio, MaxConsultas, Audioguía.
**Frecuencia de uso esperada:** 1-2 vistazos diarios + sesiones de trabajo
puntuales desde móvil cuando surja algo urgente.

**Lo que NO es:**
- No es un sistema de monitorización para clientes finales.
- No es una herramienta multiusuario con permisos por rol.
- No reemplaza a herramientas externas como Sentry, Datadog o Grafana.
- No es un dashboard de negocio (KPIs, ventas, etc.) — es operativo/DevOps.

## 2. Arquitectura general
**Componentes:**

- **Cloudflare Tunnel** (ya hay cuenta de Cloudflare existente): expone
  la consola en `consola.<dominio>.com` sin abrir puertos del VPS.
- **Cloudflare Access**: filtro de email antes incluso de llegar a la app.
  Solo el email de Wilmer puede llegar al login.
- **Backend Express en Node 24**: API REST + servir build de React.
  Corre en pm2 como proceso aparte de Citio.
- **Frontend React**: SPA móvil-first con tailwind, polling para datos
  en tiempo "casi real" (refresh cada 5-10s).
- **SQLite**: persistencia local de usuario, sesiones, historial de
  acciones, configuración de automatismos. No necesita Postgres aquí.

## 3. Fases de desarrollo

Plan honesto. Cada fase es **commiteable y útil por sí sola**.
Si en algún momento se decide parar, lo construido sigue valiendo.

### Fase 1 — Monitoreo (3 sesiones, 6-9h)

Solo lectura. Sin acciones todavía.

- Setup inicial del repo `consola-devops`.
- Cloudflare Tunnel funcionando.
- Login básico email/password con JWT.
- Dashboard con tiles: rendimiento VPS, pm2 status, espacio en disco.
- Lectura de logs recientes de Citio.
- Vista del estado de sesiones tmux:claude-*.

**Resultado al final de Fase 1:** podés abrir la consola desde el móvil
y ver de un vistazo si todo está bien. Sin tocar nada.

### Fase 2 — Lifecycle de agentes (3 sesiones, 6-9h)

Acciones simples controladas.

- Botones para start/stop/restart de procesos pm2.
- Botón para reiniciar servicios systemd específicos (whitelist).
- Lectura de logs en vivo (websocket o long-polling sobre stdout).
- Historial de acciones en SQLite (auditoría: qué se hizo y cuándo).

**Resultado al final de Fase 2:** podés actuar sobre el VPS sin abrir SSH.

### Fase 3 — Chat con agentes (5 sesiones, 10-15h)

La pieza compleja.

- Detección de sesiones de Claude Code activas (`tmux ls`, lectura de
  `~/.claude/projects/*/conversations`).
- Vista del prompt actual y el output reciente de cada sesión.
- Envío de prompts a una sesión tmux específica vía `tmux send-keys`.
- Visualización del historial de conversaciones por proyecto.
- Creación de nuevas sesiones tmux con un proyecto base.

**Resultado al final de Fase 3:** podés mantener conversaciones con
Claude Code desde el móvil sin abrir SSH ni terminal.

### Fase 4 — Automatismos (5 sesiones, 10-15h)

La pieza opcional y más fácil de aplazar.

- Definición de tareas cron desde la UI.
- Triggers basados en eventos (logs que coinciden con patrón → acción).
- Workflows multi-paso (si X falla, ejecutar Y).
- Notificaciones push al móvil (PWA o Telegram bot propio).

**Resultado al final de Fase 4:** la consola actúa por sí sola en
situaciones rutinarias.

## 4. Dashboard — qué muestra

Una sola pantalla, scroll vertical, tiles agrupados:

### Sección "VPS"
- CPU (gráfico de últimos 5 min)
- RAM usada/libre
- Disco usado/libre por partición principal
- Uptime
- Conexiones de red activas (resumen)

### Sección "Procesos Citio"
- Estado de `citio-backend` (online/offline, uptime, restarts, memoria)
- Estado de `citio-frontend` (idem)
- Healthcheck (curl a /health)
- Últimos 5 errores en logs

### Sección "Procesos MaxConsultas y Audioguía"
- Estado y healthcheck (cuando esté integrado, vacío por ahora)

### Sección "Agentes Claude Code"
- Lista de sesiones tmux:claude-* activas
- De cada una: proyecto, última actividad, en qué prompt está
- Estado: "trabajando" / "esperando input" / "idle"

### Sección "Bases de datos"
- PostgreSQL puerto 5433: conexiones activas, tamaño DB
- SQLite local: solo para info de la propia consola

### Sección "Despliegues"
- Último commit en cada rama relevante
- Si el commit del HEAD coincide con el desplegado

## 5. Consola — qué permite hacer

Acciones disponibles, agrupadas por fase:

**Fase 1 (solo lectura):**
- Ver logs en vivo de cualquier servicio o sesión
- Ver el estado completo de cualquier proceso
- Buscar en logs por texto/regex

**Fase 2 (lifecycle):**
- Reiniciar procesos pm2 (Citio backend, frontend)
- Restart de servicios systemd (whitelist controlada)
- Limpiar logs antiguos

**Fase 3 (chat con agentes):**
- Lanzar prompt a sesión Claude Code activa
- Ver historial de conversaciones con cada agente
- Crear nueva sesión tmux para un proyecto
- Detener sesión existente

**Fase 4 (automatismos):**
- Definir cron jobs ejecutables desde la consola
- Configurar triggers basados en logs
- Recibir alertas push cuando algo se sale de lo normal

## 6. Endpoints REST mínimos (Fase 1)
## 7. Stack técnico

**Backend:**
- Node 24 + Express
- JWT para autenticación (mismo patrón que Citio)
- SQLite con `better-sqlite3` para persistencia local
- `systeminformation` para datos del VPS
- Ejecución de comandos del sistema (`pm2 jlist`, `systemctl status`,
  `tmux send-keys`) vía `child_process.exec` con whitelist estricta

**Frontend:**
- React + Vite + Tailwind (móvil-first)
- Polling cada 5-10s para refresco
- React Router para vistas
- Build estática servida por Express en producción

**Comunicación con Claude Code:**
- Lectura de archivos en `~/.claude/projects/*/` para historial
- `tmux list-sessions` y `tmux capture-pane` para estado actual
- `tmux send-keys -t <sesión> '<prompt>' Enter` para enviar prompts

**Persistencia:**
- SQLite local en el VPS (no Postgres)
- Tablas: `users`, `sessions`, `audit_log`, `automations`

**Acceso desde fuera:**
- Cloudflare Tunnel (`cloudflared`) + Cloudflare Access
- Sin abrir puertos en el VPS
- HTTPS automático

## 8. Pendientes y decisiones aplazadas

- **Dominio definitivo**: actualmente `consola.<TBD>`. Decidir si
  registrar uno nuevo o reutilizar el de MaxConsultas (con subdominio).
- **Polling vs WebSocket** para refrescos en tiempo real: empezar con
  polling, migrar a WebSocket si la experiencia es pobre.
- **PWA o app nativa** para iOS: el plan inicial es PWA simple. Si
  funciona bien, no hace falta nativa.
- **Backup del SQLite**: estrategia simple (cron de copia diaria a otro
  directorio del VPS) pero por decidir cuándo.
- **Permisos por usuario**: ahora un único usuario. Si en el futuro
  David o Lolo necesitan acceso, añadir roles.
- **Integración con MaxConsultas y Audioguía**: cuando se estabilicen
  como proyectos en el VPS, añadirlos al dashboard.
- **Notificaciones push**: en Fase 4, evaluar Web Push API vs bot de
  Telegram dedicado.
- **Logging del propio backend de la consola**: usar pino + rotación
  de archivos, o algo más simple como console + redirect a archivo.
