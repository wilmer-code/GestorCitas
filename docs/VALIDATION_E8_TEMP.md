### PRUEBA E8 (Notas de seguimiento por cliente)

```bash
# ==========================================
# PRUEBA E8 — Notas por cliente (CRUD)
# Requiere: backend arriba (3000) y usuario demo
# ==========================================

API_BASE="${API_BASE:-http://localhost:3000}"

# 0) Login (token)
USER_TOKEN=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@gestorcitas.local","password":"user123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "USER_TOKEN_LEN=${#USER_TOKEN}"

# 1) Crear cliente QA
CLIENT_ID=$(curl -s -X POST "${API_BASE}/clients" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente QA E8 Notas","email":"qa.e8.notas@cliente.com","phone":"600888777"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "CLIENT_ID=$CLIENT_ID"

# 2) Crear nota (POST /notes)
NOTE_ID=$(curl -s -X POST "${API_BASE}/notes" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":$CLIENT_ID,\"content\":\"Primera nota QA (E8) — seguimiento inicial.\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "NOTE_ID=$NOTE_ID"

# 3) Listar notas por cliente (GET /notes?clientId=)
echo "---- GET notes (after create) ----"
curl -s "${API_BASE}/notes?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | head -c 2000
echo

# 4) Editar nota (PUT /notes/:id)
echo "---- PUT note (update) ----"
curl -s -X PUT "${API_BASE}/notes/$NOTE_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"Nota QA (E8) EDITADA — seguimiento actualizado.\"}" | head -c 2000
echo

# 5) Listar notas por cliente (GET /notes?clientId=) y verificar contenido actualizado
echo "---- GET notes (after update) ----"
curl -s "${API_BASE}/notes?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | head -c 2000
echo

# 6) Eliminar nota (DELETE /notes/:id)
echo "---- DELETE note ----"
curl -s -i -X DELETE "${API_BASE}/notes/$NOTE_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | head -n 20
echo

# 7) Listar notas por cliente (debe devolver [])
echo "---- GET notes (after delete) ----"
curl -s "${API_BASE}/notes?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | head -c 2000
echo

# 8) Cleanup cliente
curl -s -X DELETE "${API_BASE}/clients/$CLIENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" >/dev/null || true
echo "cleanup ok"
```