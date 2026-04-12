const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');

const router = express.Router();

const appointmentSchema = z.object({
  clientId: z.number().int().positive(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional()
});

const BUSINESS_TIMEZONE = 'Europe/Madrid';
const businessStartMinutes = 10 * 60; // 10:00
const businessEndMinutes = 20 * 60 + 30; // 20:30
const DEBUG_HORARIO = process.env.DEBUG_HORARIO === '1';
const PAST_TOLERANCE_MS = 60 * 1000;

const madridTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  timeZone: BUSINESS_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function parseMinutesFromFormatter(date) {
  const hhmm = madridTimeFormatter.format(date);
  const match = hhmm.match(/(\d{1,2})\D+(\d{2})/);

  if (!match) {
    return Number.NaN;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return Number.NaN;
  }

  return hour * 60 + minute;
}

function lastSundayOfMonthUtc(year, monthIndex) {
  const lastDayUtc = new Date(Date.UTC(year, monthIndex + 1, 0));
  const dayOfWeek = lastDayUtc.getUTCDay();
  lastDayUtc.setUTCDate(lastDayUtc.getUTCDate() - dayOfWeek);
  return lastDayUtc;
}

function madridOffsetMinutes(date) {
  const year = date.getUTCFullYear();
  const dstStart = lastSundayOfMonthUtc(year, 2); // marzo
  const dstEnd = lastSundayOfMonthUtc(year, 9); // octubre

  dstStart.setUTCHours(1, 0, 0, 0); // 01:00 UTC
  dstEnd.setUTCHours(1, 0, 0, 0); // 01:00 UTC

  return date >= dstStart && date < dstEnd ? 120 : 60;
}

function fallbackMadridMinutes(date) {
  const offset = madridOffsetMinutes(date);
  const fallbackDate = new Date(date.getTime() + offset * 60000);
  return fallbackDate.getUTCHours() * 60 + fallbackDate.getUTCMinutes();
}

function isIntlMadridReliable() {
  const resolvedTimeZone = madridTimeFormatter.resolvedOptions().timeZone;
  if (resolvedTimeZone !== BUSINESS_TIMEZONE) return false;

  const probeDate = new Date('2026-03-19T09:00:00.000Z');
  const probeMinutes = parseMinutesFromFormatter(probeDate);
  return probeMinutes === 10 * 60;
}

const intlMadridReliable = isIntlMadridReliable();

function toMadridMinutes(date) {
  if (intlMadridReliable) {
    const parsed = parseMinutesFromFormatter(date);
    if (Number.isFinite(parsed)) {
      return { minutes: parsed, method: 'intl' };
    }
  }

  return { minutes: fallbackMadridMinutes(date), method: 'fallback' };
}

function logBusinessHoursDebug(context, start, end, startResult, endResult) {
  if (!DEBUG_HORARIO) return;

  console.log('[appointments:business-hours]', {
    context,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startMadrid: madridTimeFormatter.format(start),
    endMadrid: madridTimeFormatter.format(end),
    startMinutes: startResult.minutes,
    endMinutes: endResult.minutes,
    startMethod: startResult.method,
    endMethod: endResult.method,
    resolvedTimeZone: madridTimeFormatter.resolvedOptions().timeZone,
    intlMadridReliable
  });
}

function isWithinBusinessHours(start, end) {
  const startResult = toMadridMinutes(start);
  const endResult = toMadridMinutes(end);

  if (!Number.isFinite(startResult.minutes) || !Number.isFinite(endResult.minutes)) {
    return { ok: false, startResult, endResult };
  }

  return {
    ok: startResult.minutes >= businessStartMinutes && endResult.minutes <= businessEndMinutes,
    startResult,
    endResult
  };
}

async function ensureClientOwnership(clientId, userId) {
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  return !!client;
}

async function hasOverlap(userId, startAt, endAt, excludeId) {
  // Anti-solapes: start < existing.end && end > existing.start
  const overlap = await prisma.appointment.findFirst({
    where: {
      userId,
      status: { not: 'cancelled' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startAt: { lt: endAt },
      endAt: { gt: startAt }
    }
  });

  return !!overlap;
}

router.get('/', async (req, res) => {
  const start = req.query.start ? new Date(req.query.start) : null;
  const end = req.query.end ? new Date(req.query.end) : null;
  const clientId = req.query.clientId ? Number(req.query.clientId) : null;
  const status = req.query.status ? req.query.status.toString() : null;
  const normalizedStatus = status === 'done' ? 'completed' : status;

  if (status && !['scheduled', 'done', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: req.user.id,
      ...(clientId ? { clientId } : {}),
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
      ...(start || end
        ? {
            startAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    },
    include: {
      client: true,
      reminders: true
    },
    orderBy: { startAt: 'asc' }
  });

  res.json(appointments);
});

router.post('/', validate(appointmentSchema), async (req, res) => {
  const { clientId, startAt, endAt, status } = req.validatedBody;
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (startDate >= endDate) {
    return res.status(400).json({ message: 'La hora de fin debe ser mayor que la de inicio' });
  }

  const now = new Date();
  if (startDate.getTime() < now.getTime() - PAST_TOLERANCE_MS) {
    return res.status(400).json({ message: 'No se pueden crear citas en el pasado' });
  }

  const businessHours = isWithinBusinessHours(startDate, endDate);
  logBusinessHoursDebug('POST', startDate, endDate, businessHours.startResult, businessHours.endResult);

  if (!businessHours.ok) {
    return res.status(400).json({ message: 'Fuera de horario permitido (10:00-20:30)' });
  }

  const ownsClient = await ensureClientOwnership(clientId, req.user.id);
  if (!ownsClient) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }

  const overlap = await hasOverlap(req.user.id, startDate, endDate);
  if (overlap) {
    return res.status(409).json({ message: 'Existe solape con otra cita del usuario' });
  }

  const appointment = await prisma.appointment.create({
    data: {
      userId: req.user.id,
      clientId,
      startAt: startDate,
      endAt: endDate,
      status: status || 'scheduled'
    },
    include: { client: true, reminders: true }
  });

  res.status(201).json(appointment);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const appointment = await prisma.appointment.findFirst({
    where: { id, userId: req.user.id },
    include: { client: true, reminders: true }
  });

  if (!appointment) {
    return res.status(404).json({ message: 'Cita no encontrada' });
  }

  res.json(appointment);
});

router.put('/:id', validate(appointmentSchema.partial()), async (req, res) => {
  const id = Number(req.params.id);
  const current = await prisma.appointment.findFirst({
    where: { id, userId: req.user.id }
  });

  if (!current) {
    return res.status(404).json({ message: 'Cita no encontrada' });
  }

  const triesToModifyCoreFields =
    req.validatedBody.clientId !== undefined ||
    req.validatedBody.startAt !== undefined ||
    req.validatedBody.endAt !== undefined;

  if (current.status === 'cancelled' && triesToModifyCoreFields) {
    return res.status(400).json({ message: 'La cita está cancelada. Reactívala para editarla.' });
  }

  const nextClientId = req.validatedBody.clientId ?? current.clientId;
  const nextStart = req.validatedBody.startAt ? new Date(req.validatedBody.startAt) : current.startAt;
  const nextEnd = req.validatedBody.endAt ? new Date(req.validatedBody.endAt) : current.endAt;

  if (nextStart >= nextEnd) {
    return res.status(400).json({ message: 'La hora de fin debe ser mayor que la de inicio' });
  }

  if (req.validatedBody.startAt) {
    const now = new Date();
    if (nextStart.getTime() < now.getTime() - PAST_TOLERANCE_MS) {
      return res.status(400).json({ message: 'No se pueden crear citas en el pasado' });
    }
  }

  const businessHours = isWithinBusinessHours(nextStart, nextEnd);
  logBusinessHoursDebug('PUT', nextStart, nextEnd, businessHours.startResult, businessHours.endResult);

  if (!businessHours.ok) {
    return res.status(400).json({ message: 'Fuera de horario permitido (10:00-20:30)' });
  }

  const ownsClient = await ensureClientOwnership(nextClientId, req.user.id);
  if (!ownsClient) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }

  const overlap = await hasOverlap(req.user.id, nextStart, nextEnd, id);
  if (overlap) {
    return res.status(409).json({ message: 'Existe solape con otra cita del usuario' });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      clientId: nextClientId,
      startAt: nextStart,
      endAt: nextEnd,
      ...(req.validatedBody.status ? { status: req.validatedBody.status } : {})
    },
    include: { client: true, reminders: true }
  });

  res.json(appointment);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const exists = await prisma.appointment.findFirst({ where: { id, userId: req.user.id } });

  if (!exists) {
    return res.status(404).json({ message: 'Cita no encontrada' });
  }

  await prisma.appointment.delete({ where: { id } });
  res.status(204).send();
});

module.exports = router;
