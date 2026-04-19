const express = require('express')
const { z } = require('zod')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = express.Router()

router.use(authRequired)

const clientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(3).max(30).optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string()).optional()
})

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim()
    const tenantId = req.user.tenantId

    const where = {
      tenantId,
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } }
        ]
      } : {})
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    res.json(clients)
  } catch (err) { next(err) }
})

router.post('/', validate(clientSchema), async (req, res, next) => {
  try {
    const { name, email, phone, notes, tags } = req.validatedBody
    const client = await prisma.client.create({
      data: {
        tenantId: req.user.tenantId,
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        tags: tags || []
      }
    })
    res.status(201).json(client)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json(client)
  } catch (err) { next(err) }
})

router.put('/:id', validate(clientSchema.partial()), async (req, res, next) => {
  try {
    const exists = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Cliente no encontrado' })

    const { name, email, phone, notes, tags } = req.validatedBody
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(tags !== undefined ? { tags } : {})
      }
    })
    res.json(client)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const exists = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Cliente no encontrado' })
    await prisma.client.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

module.exports = router
