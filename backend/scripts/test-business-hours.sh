#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3000}"
EMAIL="${EMAIL:-user@gestorcitas.local}"
PASSWORD="${PASSWORD:-user123}"

echo "== API_BASE=$API_BASE =="
echo "== health =="
curl -s "$API_BASE/health" | sed 's/.*/OK: &/'

echo
echo "== login =="
TOKEN="$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [ -z "$TOKEN" ]; then
  echo "ERROR: no token (login failed)."
  exit 1
fi
echo "TOKEN_LEN=${#TOKEN}"

echo
echo "== get first clientId =="
CLIENT_ID="$(curl -s "$API_BASE/clients" -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j?.[0]?.id||'');}catch(e){console.log('');}})")"

if [ -z "$CLIENT_ID" ]; then
  echo "No clients found. Creating a client..."
  CLIENT_ID="$(curl -s -X POST "$API_BASE/clients" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Cliente Smoke"}' \
    | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j?.id||'');}catch(e){console.log('');}})")"
fi

if [ -z "$CLIENT_ID" ]; then
  echo "ERROR: could not obtain clientId."
  exit 1
fi
echo "CLIENT_ID=$CLIENT_ID"

post_case () {
  local label="$1"
  local start="$2"
  local end="$3"
  local expect="$4" # 200 or 400

  echo
  echo "-- $label"
  echo "startAt=$start"
  echo "endAt=$end"

  local out
  out="$(curl -s -i -X POST "$API_BASE/appointments" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"clientId\":$CLIENT_ID,\"startAt\":\"$start\",\"endAt\":\"$end\"}")"

  local code
  code="$(printf "%s" "$out" | head -n 1 | awk '{print $2}')"
  echo "HTTP=$code"

  if [ "$code" != "$expect" ]; then
    echo "❌ Expected HTTP $expect, got $code"
    echo "$out" | sed -n '1,120p'
    exit 1
  fi

  if [ "$expect" = "400" ]; then
    echo "$out" | tail -n 1
  else
    echo "✅ OK"
  fi
}

# NOTA: Marzo en Madrid suele ser UTC+1 hasta el cambio a horario de verano (depende del día).
# Para evitar líos, probamos con horas ISO en UTC que correspondan a Madrid usando el propio ejemplo:
# 10:00 Madrid == 09:00Z
# 20:30 Madrid == 19:30Z

post_case "OK 10:00-11:00 (Madrid)"  "2026-03-19T09:00:00.000Z" "2026-03-19T10:00:00.000Z" "200"
post_case "NO 09:30-10:30 (Madrid)"  "2026-03-19T08:30:00.000Z" "2026-03-19T09:30:00.000Z" "400"
post_case "OK 20:00-20:30 (Madrid)"  "2026-03-19T19:00:00.000Z" "2026-03-19T19:30:00.000Z" "200"
post_case "OK 19:30-20:30 (Madrid)"  "2026-03-19T18:30:00.000Z" "2026-03-19T19:30:00.000Z" "200"
post_case "NO 20:00-21:00 (Madrid)"  "2026-03-19T19:00:00.000Z" "2026-03-19T20:00:00.000Z" "400"
post_case "NO 20:30-21:00 (Madrid)"  "2026-03-19T19:30:00.000Z" "2026-03-19T20:00:00.000Z" "400"

echo
echo "✅ ALL BUSINESS-HOURS TESTS PASSED"
