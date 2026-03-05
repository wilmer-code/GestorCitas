const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');

const router = express.Router();

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(3).optional().or(z.literal(''))
});

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim();

  const where = {
    userId: req.user.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: 'asc' }
  });

  res.json(clients);
});

router.post('/', validate(clientSchema), async (req, res) => {
  const { name, email, phone } = req.validatedBody;

  const client = await prisma.client.create({
    data: {
      userId: req.user.id,
      name,
      email: email || null,
      phone: phone || null
    }
  });

  res.status(201).json(client);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const client = await prisma.client.findFirst({
    where: { id, userId: req.user.id }
  });

  if (!client) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }

  res.json(client);
});

router.put('/:id', validate(clientSchema.partial()), async (req, res) => {
  const id = Number(req.params.id);

  const exists = await prisma.client.findFirst({
    where: { id, userId: req.user.id }
  });

  if (!exists) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }

  const { name, email, phone } = req.validatedBody;

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {})
    }
  });

  res.json(client);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const exists = await prisma.client.findFirst({
    where: { id, userId: req.user.id }
  });

  if (!exists) {
    return res.status(404).json({ message: 'Cliente no encontrado' });
  }

  await prisma.client.delete({ where: { id } });
  res.status(204).send();
});

module.exports = router;
