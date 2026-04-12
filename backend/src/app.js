const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./lib/swagger');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const clientsRoutes = require('./routes/clients.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const remindersRoutes = require('./routes/reminders.routes');
const notesRoutes = require('./routes/notes.routes');
const authRequired = require('./middleware/auth');
const requireRole = require('./middleware/role');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/auth', authRoutes);
app.use('/users', authRequired, requireRole('admin'), usersRoutes);
app.use('/clients', authRequired, clientsRoutes);
app.use('/appointments', authRequired, appointmentsRoutes);
app.use('/reminders', authRequired, remindersRoutes);
app.use('/notes', authRequired, notesRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;
