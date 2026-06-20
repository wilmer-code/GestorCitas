// bridge-test.js - Script puente Telegram en MODO PRUEBA
// IMPORTANTE: esta version NO ejecuta NADA en el servidor.
// Solo envia una propuesta a Telegram con botones y espera tu respuesta.
// Usa fetch nativo de Node 24 - sin librerias externas.

const fs = require('fs');
const path = require('path');

// Leer .env manualmente (sin dotenv)
const envPath = path.join(__dirname, '.env');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID en el .env');
  process.exit(1);
}

const API = 'https://api.telegram.org/bot' + TOKEN;

async function tg(method, body) {
  const res = await fetch(API + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

const propuesta = {
  titulo: 'Propuesta de prueba',
  descripcion: 'Esto es una PRUEBA. Imagina que propongo anadir un campo "telefono obligatorio" al formulario de cliente.\n\nPasos que propondria:\n1. git pull (traer codigo nuevo)\n2. npm install (sin dependencias nuevas)\n3. pm2 restart citio-backend (activar el cambio)\n\nEn esta version de prueba NO se ejecuta NADA aunque apruebes.'
};

async function main() {
  console.log('[BRIDGE-TEST] Enviando propuesta a Telegram...');

  const texto = '*' + propuesta.titulo + '*\n\n' + propuesta.descripcion;
  const sent = await tg('sendMessage', {
    chat_id: CHAT_ID,
    text: texto,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: 'Aprobar', callback_data: 'aprobar' },
        { text: 'Rechazar', callback_data: 'rechazar' }
      ]]
    }
  });

  if (!sent.ok) {
    console.error('[BRIDGE-TEST] Error enviando:', JSON.stringify(sent));
    process.exit(1);
  }

  console.log('[BRIDGE-TEST] Propuesta enviada. Revisa tu movil y pulsa un boton.');
  console.log('[BRIDGE-TEST] Esperando tu respuesta (hasta 2 minutos)...');

  // Esperar la respuesta (polling de getUpdates)
  let offset = 0;
  const limite = Date.now() + 120000; // 2 minutos

  while (Date.now() < limite) {
    const upd = await tg('getUpdates', { offset, timeout: 10 });
    if (upd.ok && upd.result.length > 0) {
      for (const u of upd.result) {
        offset = u.update_id + 1;
        if (u.callback_query) {
          const decision = u.callback_query.data;
          const ahora = new Date().toLocaleString('es-ES');

          await tg('answerCallbackQuery', { callback_query_id: u.callback_query.id });

          if (decision === 'aprobar') {
            await tg('sendMessage', {
              chat_id: CHAT_ID,
              text: 'APROBADO el ' + ahora + '.\n\nMODO PRUEBA: no se ejecuto nada en el servidor. En la version real, aqui se ejecutarian los pasos uno a uno, cada uno pidiendote confirmacion.'
            });
            console.log('[BRIDGE-TEST] Respuesta: APROBADO (modo prueba, no se ejecuta nada)');
          } else {
            await tg('sendMessage', {
              chat_id: CHAT_ID,
              text: 'RECHAZADO el ' + ahora + '. No se hace nada. Correcto.'
            });
            console.log('[BRIDGE-TEST] Respuesta: RECHAZADO');
          }

          console.log('[BRIDGE-TEST] Fin de la prueba.');
          process.exit(0);
        }
      }
    }
  }

  console.log('[BRIDGE-TEST] Tiempo agotado, no respondiste. Saliendo.');
  process.exit(0);
}

main().catch((e) => { console.error('[BRIDGE-TEST] Error:', e.message); process.exit(1); });
