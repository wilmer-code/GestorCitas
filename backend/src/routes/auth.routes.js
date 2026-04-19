const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = express.Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

// POST /auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.validatedBody
  const tenantId = req.tenantId

  try {
    const whereClause = tenantId
      ? { tenantId_email: { tenantId, email } }
      : { email }

    const user = await prisma.user.findUnique({ where: whereClause })

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    })
  } catch (err) {
    console.error('[AUTH] Login error:', err.message)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

// GET /auth/me
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        tenant: { select: { name: true, slug: true, plan: true } }
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

module.exports = router
