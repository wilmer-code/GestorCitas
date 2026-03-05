const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'GestorCitas API',
    version: '1.0.0'
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'OK' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/users': {
      get: { summary: 'Listar usuarios (admin)' },
      post: { summary: 'Crear usuario (admin)' }
    },
    '/clients': {
      get: { summary: 'Listar clientes + búsqueda' },
      post: { summary: 'Crear cliente' }
    },
    '/appointments': {
      get: { summary: 'Listar citas por rango' },
      post: { summary: 'Crear cita (anti-solapes)' }
    },
    '/reminders': {
      get: { summary: 'Listar recordatorios (por cita)' },
      post: { summary: 'Crear recordatorio por offset' }
    }
  }
};

module.exports = swaggerDocument;
