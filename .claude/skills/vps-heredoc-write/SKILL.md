---
name: vps-heredoc-write
description: >
  Escribir archivos via bash (sin Write tool) cuando el contenido contiene
  caracteres que bash puede interpretar: $variables, backticks, comillas dobles,
  \n, expansiones, scripts shell anidados, código SQL/JavaScript/Python con
  dólares o backticks. Trigger típico: "escribir archivo X via ssh", "crear
  script en el VPS", "exportar contenido a un archivo via cat", "no usar Write
  porque la sesión remota no lo soporta".
allowed-tools:
  - Bash(cat:*)
  - Bash(tee:*)
  - Bash(echo:*)
---

# Escritura de archivos via heredoc en bash/SSH

## 1. Cuándo se activa

- Sesión SSH directa sin acceso al Write tool
- Contenido con `$variables`, backticks, comillas dobles, `\n` o código anidado
- Necesidad de crear scripts Python, SQL, JS o de shell desde bash puro
- "Escribir archivo X via cat", "crear el archivo en el VPS", "generar config inline"

---

## 2. Principio base

**Siempre** usar el delimitador entre comillas simples (`'EOF'`) para contenido literal.

| Sintaxis | Comportamiento | Usar cuando |
|---|---|---|
| `<< 'EOF'` | Contenido **literal**: `$VAR`, `` ` ``, `\` sin expandir | Casi siempre |
| `<< EOF` | Contenido **expandido**: `$VAR` se sustituye por su valor | Solo si necesitas interpolar variables del shell activo |

---

## 3. Patrón básico

```bash
cat > /ruta/al/archivo << 'EOF'
contenido literal sin expansión de $variables ni `backticks`
ni interpretación de \n ni comillas "dobles"
EOF
```

Reglas de oro:
- `'EOF'` va **solo** en su línea (sin espacios antes ni después del delimitador de cierre)
- El delimitador de cierre `EOF` también va solo en su línea, en columna 0

---

## 4. Variantes según caso

**a) Append en vez de overwrite:**
```bash
cat >> /ruta/al/archivo << 'EOF'
líneas adicionales al final
EOF
```

**b) Script Python multilínea:**
```bash
python3 << 'PYEOF'
import os
print(f"Esto es literal: {os.getcwd()}")
PYEOF
```

**c) SQL inline via psql:**
```bash
psql -U usuario -d base -c "$(cat << 'SQLEOF'
SELECT id, nombre
FROM tabla
WHERE campo = '$valor_literal'
SQLEOF
)"
```

**d) Cuando SÍ necesitas interpolación** (usar `<< EOF` sin comillas, con precaución):
```bash
TS=$(date '+%Y%m%d%H%M%S')
cat > /ruta/migration.sql << EOF
-- Generado el $TS
ALTER TABLE tenants ADD COLUMN nueva TEXT;
EOF
```
> ⚠ Sin comillas en el delimitador: `$TS` se expande. Todos los demás `$` del contenido también se expandirán — asegúrate de que no hay `$variables` no intencionadas.

**e) Mezcla — parte literal + parte interpolada:**
```bash
# Primero bloque literal
cat > /ruta/archivo << 'EOF'
#!/usr/bin/env python3
# Contenido fijo con $SYMBOLS literales
EOF

# Luego append con interpolación
cat >> /ruta/archivo << EOF
TIMESTAMP = "$TS"
EOF
```

---

## 5. Trampas comunes

| Error | Síntoma | Solución |
|---|---|---|
| Olvidar `'` en `'EOF'` | `$variables` se expanden a vacío; archivo corrupto | Revisar: `<< 'EOF'` no `<< EOF` |
| Delimitador de cierre con espacios/indentación | bash espera más input; shell se "cuelga" | `EOF` en columna 0, solo en su línea |
| Olvidar el `>` de redirección | Contenido va a stdout, no se escribe el archivo | `cat > archivo` no `cat archivo` |
| Delimitador de cierre con texto extra (`EOF;`) | Bash no lo reconoce como cierre | Solo `EOF` en esa línea, nada más |
| Escapar `\$` en bloque literal | Queda literalmente `\$VAR` en el archivo | Con `'EOF'` no hace falta escapar nada |

---

## 6. Cuándo NO usar heredoc

Si el **Write tool está disponible**, úsalo — es más seguro, revisable y no depende de la sintaxis del shell. Heredoc solo cuando estamos en bash puro (sesión SSH directa, hooks de shell, CI sin herramientas de Claude Code).

---

## 7. Caso histórico de referencia — Citio, 2026

Aprendido al crear archivos de migración SQL y scripts en el VPS (187.124.28.30). El contenido de `migration.sql` incluye `"tenants"`, `$1`, y strings con comillas — todo habría roto el shell sin el delimitador entre comillas simples. Documentado en `CLAUDE.md` sección "Trabajo desde el VPS por SSH".
