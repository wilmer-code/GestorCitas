const { Router } = require('express')
const { z } = require('zod')
const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = Router()
router.use(authRequired)

const userSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'USER']).optional()
})

function adminOnly(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Solo administradores' })
  }
  next()
}

router.get('/', adminOnly, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: 'asc' }
    })
    res.json(users)
  } catch (err) { next(err) }
})

router.post('/', adminOnly, validate(userSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validatedBody
    const tenantId = req.user.tenantId

    const exists = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } }
    })
    if (exists) return res.status(409).json({ message: 'Email ya registrado en este negocio' })

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { tenantId, name, email, passwordHash, role: role || 'USER' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })

    res.status(201).json(user)
  } catch (err) { next(err) }
})

router.put('/:id', adminOnly, validate(userSchema.partial()), async (req, res, next) => {
  try {
    const exists = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' })

    const { name, email, password, role } = req.validatedBody
    const data = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (password) data.passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true }
    })

    res.json(user)
  } catch (err) { next(err) }
})

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' })
    }
    const exists = await prisma.user.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' })

    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

module.exports = router
