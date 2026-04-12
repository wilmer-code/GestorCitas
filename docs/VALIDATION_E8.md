# VALIDACIÓN E8 — Notas por cliente

Define variables:

```bash
TOKEN="<TU_TOKEN_BEARER>"
CLIENT_ID="<ID_CLIENTE>"
NOTE_ID="<ID_NOTA>"
API="http://127.0.0.1:3000"
```

## 1) Listar notas por cliente

```bash
curl -sS -X GET "$API/notes?clientId=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## 2) Crear nota

```bash
curl -sS -X POST "$API/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\": $CLIENT_ID, \"content\": \"Seguimiento E8 desde curl\"}"
```

## 3) Eliminar nota

```bash
curl -i -X DELETE "$API/notes/$NOTE_ID" \
  -H "Authorization: Bearer $TOKEN"
```
