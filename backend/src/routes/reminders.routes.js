const { Router } = require('express')
const { z } = require('zod')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = Router()
router.use(authRequired)

const reminderSchema = z.object({
  appointmentId: z.string().uuid(),
  sendAt: z.string().datetime({ offset: true }),
  message: z.string().max(500).optional()
})

router.get('/', async (req, res, next) => {
  try {
    const { appointmentId } = req.query
    const tenantId = req.user.tenantId

    const reminders = await prisma.reminder.findMany({
      where: {
        tenantId,
        ...(appointmentId ? { appointmentId } : {})
      },
      include: { appointment: { include: { client: true } } },
      orderBy: { sendAt: 'asc' }
    })

    res.json(reminders)
  } catch (err) { next(err) }
})

router.post('/', validate(reminderSchema), async (req, res, next) => {
  try {
    const { appointmentId, sendAt, message } = req.validatedBody
    const tenantId = req.user.tenantId

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId }
    })
    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' })
    }

    const reminder = await prisma.reminder.create({
      data: {
        tenantId,
        appointmentId,
        sendAt: new Date(sendAt),
        message: message || null
      }
    })

    res.status(201).json(reminder)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const exists = await prisma.reminder.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Recordatorio no encontrado' })

    await prisma.reminder.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

module.exports = router
