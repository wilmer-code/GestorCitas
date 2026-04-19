const express = require('express')
const { z } = require('zod')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')
const validate = require('../middleware/validate')

const router = express.Router()

router.use(authRequired)

const appointmentSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2).max(100),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  notes: z.string().max(500).optional()
})

async function hasOverlap(tenantId, userId, startTime, endTime, excludeId) {
  const overlap = await prisma.appointment.findFirst({
    where: {
      tenantId,
      userId,
      status: { not: 'CANCELLED' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startTime: { lt: new Date(endTime) },
      endTime: { gt: new Date(startTime) }
    }
  })
  return !!overlap
}

router.get('/', async (req, res, next) => {
  try {
    const { start, end, clientId, status } = req.query
    const tenantId = req.user.tenantId

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        ...(clientId ? { clientId } : {}),
        ...(status ? { status } : {}),
        ...(start || end ? {
          startTime: {
            ...(start ? { gte: new Date(start) } : {}),
            ...(end ? { lte: new Date(end) } : {})
          }
        } : {})
      },
      include: { client: true, reminders: true },
      orderBy: { startTime: 'asc' }
    })

    res.json(appointments)
  } catch (err) { next(err) }
})

router.post('/', validate(appointmentSchema), async (req, res, next) => {
  try {
    const { clientId, title, startTime, endTime, status, notes } = req.validatedBody
    const tenantId = req.user.tenantId
    const userId = req.user.id

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (startDate >= endDate) {
      return res.status(400).json({ message: 'La hora de fin debe ser mayor que la de inicio' })
    }

    const clientExists = await prisma.client.findFirst({
      where: { id: clientId, tenantId }
    })
    if (!clientExists) {
      return res.status(404).json({ message: 'Cliente no encontrado' })
    }

    const overlap = await hasOverlap(tenantId, userId, startTime, endTime)
    if (overlap) {
      return res.status(409).json({ message: 'Existe solape con otra cita' })
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        userId,
        clientId,
        title,
        startTime: startDate,
        endTime: endDate,
        status: status || 'PENDING',
        notes: notes || null
      },
      include: { client: true, reminders: true }
    })

    res.status(201).json(appointment)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { client: true, reminders: true }
    })
    if (!appointment) return res.status(404).json({ message: 'Cita no encontrada' })
    res.json(appointment)
  } catch (err) { next(err) }
})

router.put('/:id', validate(appointmentSchema.partial()), async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId
    const current = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId }
    })
    if (!current) return res.status(404).json({ message: 'Cita no encontrada' })

    const nextStart = req.validatedBody.startTime ? new Date(req.validatedBody.startTime) : current.startTime
    const nextEnd = req.validatedBody.endTime ? new Date(req.validatedBody.endTime) : current.endTime

    if (nextStart >= nextEnd) {
      return res.status(400).json({ message: 'La hora de fin debe ser mayor que la de inicio' })
    }

    if (req.validatedBody.startTime || req.validatedBody.endTime) {
      const overlap = await hasOverlap(tenantId, current.userId, nextStart, nextEnd, req.params.id)
      if (overlap) return res.status(409).json({ message: 'Existe solape con otra cita' })
    }

    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        ...(req.validatedBody.clientId ? { clientId: req.validatedBody.clientId } : {}),
        ...(req.validatedBody.title ? { title: req.validatedBody.title } : {}),
        ...(req.validatedBody.startTime ? { startTime: nextStart } : {}),
        ...(req.validatedBody.endTime ? { endTime: nextEnd } : {}),
        ...(req.validatedBody.status ? { status: req.validatedBody.status } : {}),
        ...(req.validatedBody.notes !== undefined ? { notes: req.validatedBody.notes } : {})
      },
      include: { client: true, reminders: true }
    })

    res.json(appointment)
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const exists = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId }
    })
    if (!exists) return res.status(404).json({ message: 'Cita no encontrada' })
    await prisma.appointment.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) { next(err) }
})

module.exports = router
