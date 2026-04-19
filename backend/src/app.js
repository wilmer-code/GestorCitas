const express = require('express')
const cors = require('cors')
const { setupSwagger } = require('./lib/swagger')
const authRoutes = require('./routes/auth.routes')
const usersRoutes = require('./routes/users.routes')
const clientsRoutes = require('./routes/clients.routes')
const appointmentsRoutes = require('./routes/appointments.routes')
const remindersRoutes = require('./routes/reminders.routes')
const tenantsRoutes = require('./routes/tenants.routes')
const { tenantMiddleware } = require('./middleware/tenant')

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Tenant-Slug']
}))

app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/tenants', tenantsRoutes)

app.use(tenantMiddleware)
app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/clients', clientsRoutes)
app.use('/appointments', appointmentsRoutes)
app.use('/reminders', remindersRoutes)

setupSwagger(app)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

module.exports = app
