const swaggerUi = require('swagger-ui-express')

const swaggerDocument = {
  openapi: '3.0.0',
  info: { title: 'Citio API', version: '1.0.0' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': { get: { summary: 'Health check', security: [] } },
    '/tenants/register': { post: { summary: 'Registrar nuevo negocio', security: [] } },
    '/tenants/check-slug/{slug}': { get: { summary: 'Verificar slug', security: [] } },
    '/auth/login': { post: { summary: 'Login', security: [] } },
    '/auth/me': { get: { summary: 'Usuario autenticado' } },
    '/users': { get: { summary: 'Listar usuarios' }, post: { summary: 'Crear usuario' } },
    '/clients': { get: { summary: 'Listar clientes' }, post: { summary: 'Crear cliente' } },
    '/appointments': { get: { summary: 'Listar citas' }, post: { summary: 'Crear cita' } },
    '/reminders': { get: { summary: 'Listar recordatorios' }, post: { summary: 'Crear recordatorio' } }
  }
}

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
}

module.exports = { setupSwagger }
