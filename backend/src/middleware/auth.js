const jwt = require('jsonwebtoken')

function authRequired(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no enviado' })
  }

  const token = header.slice(7)

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    // Asegurar que el tenant del token coincide con el tenant de la request
    if (req.tenantId && payload.tenantId && req.tenantId !== payload.tenantId) {
      return res.status(403).json({ message: 'Acceso denegado' })
    }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token invalido o expirado' })
  }
}

module.exports = authRequired
