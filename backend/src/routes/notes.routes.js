const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');

const router = express.Router();

const createNoteSchema = z.object({
  clientId: z.number().int().positive(),
  content: z.string().min(1).max(2000)
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(2000)
});

function ensureNoteModel(res) {
  if (!prisma.note) {
    res.status(500).json({ message: 'Prisma Note model not generated' });
    return false;
  }
  return true;
}

function getAuthUserId(req) {
  const raw = req.user?.id ?? req.user?.id_usuario ?? req.user?.sub ?? req.user?.uid;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/', async (req, res, next) => {
  try {
    if (!ensureNoteModel(res)) return;

    const clientId = req.query.clientId ? Number(req.query.clientId) : null;

    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ message: 'clientId es requerido' });
    }

    const authUserId = getAuthUserId(req);
    if (!authUserId) return res.status(401).json({ message: 'Usuario no autenticado' });

    const notes = await prisma.note.findMany({
      where: {
        clientId,
        userId: authUserId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(notes);
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createNoteSchema), async (req, res, next) => {
  try {
    if (!ensureNoteModel(res)) return;

    const { clientId, content } = req.validatedBody;
    const authUserId = getAuthUserId(req);
    if (!authUserId) return res.status(401).json({ message: 'Usuario no autenticado' });

    const client = await prisma.client.findFirst({ where: { id: clientId, userId: authUserId } });
    if (!client) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    const note = await prisma.note.create({
      data: {
        clientId,
        userId: authUserId,
        content
      }
    });

    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updateNoteSchema), async (req, res, next) => {
  try {
    if (!ensureNoteModel(res)) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id inválido' });
    }

    const { content } = req.validatedBody;
    const authUserId = getAuthUserId(req);
    if (!authUserId) return res.status(401).json({ message: 'Usuario no autenticado' });

    const note = await prisma.note.findFirst({ where: { id, userId: authUserId } });
    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { content }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!ensureNoteModel(res)) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'id inválido' });
    }

    const authUserId = getAuthUserId(req);
    if (!authUserId) return res.status(401).json({ message: 'Usuario no autenticado' });

    const note = await prisma.note.findFirst({ where: { id, userId: authUserId } });
    if (!note) {
      return res.status(404).json({ message: 'Nota no encontrada' });
    }

    await prisma.note.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
