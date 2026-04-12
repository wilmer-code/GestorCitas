import express from 'express'
import cors from 'cors'
import { setupSwagger } from './lib/swagger.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import clientsRoutes from './routes/clients.routes.js'
import appointmentsRoutes from './routes/appointments.routes.js'
import remindersRoutes from './routes/reminders.routes.js'
import tenantsRoutes from './routes/tenants.routes.js'
import { tenantMiddleware } from './middleware/tenant.js'

const app = express()

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Tenant-Slug']
}))

app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

// Registro de tenants — sin middleware de tenant
app.use('/tenants', tenantsRoutes)

// Rutas protegidas por tenant
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

export default app
