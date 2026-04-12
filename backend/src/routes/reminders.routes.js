const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');

const router = express.Router();

const createReminderSchema = z
  .object({
    appointmentId: z.number().int().positive(),
    offsetMinutes: z.number().int().positive().max(10080).optional(),
    offsetHours: z.number().positive().max(168).optional()
  })
  .refine((data) => data.offsetMinutes !== undefined || data.offsetHours !== undefined, {
    message: 'offsetMinutes u offsetHours requerido'
  });

router.get('/', async (req, res) => {
  const appointmentId = req.query.appointmentId ? Number(req.query.appointmentId) : null;

  const reminders = await prisma.reminder.findMany({
    where: {
      ...(appointmentId ? { appointmentId } : {}),
      appointment: { userId: req.user.id }
    },
    include: {
      appointment: {
        include: { client: true }
      }
    },
    orderBy: { sendAt: 'asc' }
  });

  res.json(reminders);
});

router.post('/', validate(createReminderSchema), async (req, res) => {
  const { appointmentId, offsetMinutes: rawOffsetMinutes, offsetHours } = req.validatedBody;

  const offsetMinutes =
    rawOffsetMinutes !== undefined ? Number(rawOffsetMinutes) : Number(offsetHours) * 60;

  if (!Number.isFinite(offsetMinutes) || offsetMinutes <= 0) {
    return res
      .status(400)
      .json({ message: 'Datos inválidos', errors: [{ message: 'offsetMinutes u offsetHours requerido' }] });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, userId: req.user.id },
    include: { client: true }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Cita no encontrada' });
  }

  const sendAt = new Date(appointment.startAt.getTime() - offsetMinutes * 60 * 1000);

  const reminder = await prisma.reminder.create({
    data: {
      appointmentId,
      sendAt
    }
  });

  res.status(201).json(reminder);
});

module.exports = router;
