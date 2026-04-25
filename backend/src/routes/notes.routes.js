const { Router } = require('express')
const { z } = require('zod')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = Router()
router.use(authRequired)

const noteSchema = z.object({
  clientId: z.string().uuid(),
  content: z.string().min(1).max(2000)
})

router.get('/', async (req, res, next) => {
  try {
    const { clientId } = req.query
    const tenantId = req.user.tenantId

    if (!clientId) return res.status(400).json({ message: 'clientId es requerido' })

    const notes = await prisma.note.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(notes)
  } catch (err) { next(err) }
})

router.post('/', validate(noteSchema), async (req, res, next) => {
  try {
    const { clientId, content } = req.validatedBody
    const tenantId = req.user.tenantId

    const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' })

    const note = await prisma.note.create({
      data: { tenantId, clientId, userId: req.user.id, content }
    })

    res.status(201).json(note)
  } catch (err) { next(err) }
})

router.put('/:id', validate(z.object({ content: z.string().min(1).max(2000) })), async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!note) return res.status(404).json({ message: 'Nota no encontrada' })

    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: { content: req.validatedBody.content }
    })

    res.json(updated)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!note) return res.status(404).json({ message: 'Nota no encontrada' })

    await prisma.note.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

module.exports = router
