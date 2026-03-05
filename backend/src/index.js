const app = require('./app');
const { startReminderWorker } = require('./jobs/reminder.worker');

const port = Number(process.env.PORT || 3000);

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Faltan variables de entorno obligatorias (DATABASE_URL, JWT_SECRET)');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`API lista en http://localhost:${port}`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
  startReminderWorker();
});
