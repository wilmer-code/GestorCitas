# G5 — Evidencia mínima (A11y + rendimiento)

## 1) Alcance

Este documento recoge la evidencia mínima de calidad para la entrega del proyecto, centrada en:

- Accesibilidad básica (A11y) en pantallas clave.
- Rendimiento con Lighthouse en entorno real de pruebas.

No se incluyen resultados inventados. Los campos pendientes deben completarse con capturas y datos reales.

---

## 2) Checklist A11y (10 puntos)

| # | Criterio | Resultado (✅/❌) | Evidencia |
|---|---|---|---|
| 1 | Navegación por teclado en Login (`Tab`, `Shift+Tab`) | [PENDIENTE] | [PENDIENTE: Captura X] |
| 2 | Navegación por teclado en Dashboard | [PENDIENTE] | [PENDIENTE: Captura X] |
| 3 | Focus visible en inputs, botones y selects | [PENDIENTE] | [PENDIENTE: Captura X] |
| 4 | Contraste suficiente en tema claro | [PENDIENTE] | [PENDIENTE: Captura X] |
| 5 | Contraste suficiente en tema oscuro | [PENDIENTE] | [PENDIENTE: Captura X] |
| 6 | Campos con label o nombre accesible | [PENDIENTE] | [PENDIENTE: Captura X] |
| 7 | Menús desplegables cierran con `Escape` y click fuera | [PENDIENTE] | [PENDIENTE: Captura X] |
| 8 | Estados deshabilitados entendibles (ej. Notas sin cliente) | [PENDIENTE] | [PENDIENTE: Captura X] |
| 9 | Textos de ayuda/estado vacío presentes | [PENDIENTE] | [PENDIENTE: Captura X] |
| 10 | Tamaño de controles usable (objetivos táctiles/click) | [PENDIENTE] | [PENDIENTE: Captura X] |

---

## 3) Capturas requeridas (procedimiento)

1. Abrir la app en el VPS: `http://IP:5173`.
2. Ir a `/login`.
3. Pulsar `Tab` varias veces y capturar foco visible en:
   - Email
   - Password
   - Botón de acceso
4. Iniciar sesión con usuario de pruebas.
5. En `/dashboard`, repetir navegación con `Tab` y capturar foco visible en:
   - Botones de vista (Hoy/Mes/Semana/Día)
   - Botones del panel derecho
   - Inputs de Clientes/Notas
6. Cambiar a tema oscuro y repetir al menos una captura de contraste.
7. Guardar todas las capturas con nombres claros, por ejemplo:
   - `a11y_login_focus_01.png`
   - `a11y_dashboard_focus_01.png`
   - `a11y_dark_contrast_01.png`

---

## 4) Lighthouse en Chrome (pasos exactos)

1. Abrir **Chrome en incógnito**.
2. Ir a `http://IP:5173/login`.
3. Abrir DevTools → pestaña **Lighthouse**.
4. Configurar:
   - Mode: `Navigation`
   - Device: `Desktop`
   - Categories: `Performance`, `Accessibility`, `Best Practices`, `SEO` (opcional)
5. Ejecutar la auditoría **2 veces** en Login.
6. Guardar reporte de la segunda pasada (JSON/HTML o captura).
7. Repetir el mismo proceso en `http://IP:5173/dashboard` (2 pasadas).
8. Guardar reportes y capturas con nombre identificable:
   - `lh_login_pass1.png`, `lh_login_pass2.png`
   - `lh_dashboard_pass1.png`, `lh_dashboard_pass2.png`

### Qué guardar de Lighthouse

- Score por categoría.
- Métricas:
  - FCP
  - LCP
  - TBT
  - CLS
- Evidencia de que se hizo en Desktop e incógnito.

---

## 5) Plantilla para pegar resultados

### 5.1 Datos generales

- URL VPS: `[PENDIENTE: http://IP:5173]`
- Fecha de medición: `[PENDIENTE]`
- Navegador/versión: `[PENDIENTE]`

### 5.2 Login (`/login`)

**Scores Lighthouse**
- Performance: `[PENDIENTE]`
- Accessibility: `[PENDIENTE]`
- Best Practices: `[PENDIENTE]`
- SEO: `[PENDIENTE]`

**Métricas (segunda pasada)**
- FCP: `[PENDIENTE]`
- LCP: `[PENDIENTE]`
- TBT: `[PENDIENTE]`
- CLS: `[PENDIENTE]`

**Evidencia asociada**
- `[PENDIENTE: archivo reporte/captura]`

### 5.3 Dashboard (`/dashboard`)

**Scores Lighthouse**
- Performance: `[PENDIENTE]`
- Accessibility: `[PENDIENTE]`
- Best Practices: `[PENDIENTE]`
- SEO: `[PENDIENTE]`

**Métricas (segunda pasada)**
- FCP: `[PENDIENTE]`
- LCP: `[PENDIENTE]`
- TBT: `[PENDIENTE]`
- CLS: `[PENDIENTE]`

**Evidencia asociada**
- `[PENDIENTE: archivo reporte/captura]`

---

## 6) Huecos a rellenar por el alumno

- URL final usada en pruebas: `[PENDIENTE: http://IP:5173]`
- Scores Lighthouse de Login: `[PENDIENTE]`
- Scores Lighthouse de Dashboard: `[PENDIENTE]`
- Métricas Login (FCP/LCP/TBT/CLS): `[PENDIENTE]`
- Métricas Dashboard (FCP/LCP/TBT/CLS): `[PENDIENTE]`
- Lista de capturas realizadas (nombre de archivo):
  - `[PENDIENTE]`
  - `[PENDIENTE]`
  - `[PENDIENTE]`

---

## 7) Observaciones

- Incidencias detectadas durante pruebas: `[PENDIENTE]`
- Cambios aplicados tras revisión: `[PENDIENTE]`
- Riesgos pendientes para entrega final: `[PENDIENTE]`
