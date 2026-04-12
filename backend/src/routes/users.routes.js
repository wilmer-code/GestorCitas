const express = require('express');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user'])
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'user']).optional()
});

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { id: 'asc' }
  });

  res.json(users);
});

router.post('/', validate(createUserSchema), async (req, res) => {
  const { name, email, password, role } = req.validatedBody;
  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    return res.status(409).json({ message: 'Ya existe un usuario con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true }
  });

  res.status(201).json(user);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true }
  });

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  res.json(user);
});

router.put('/:id', validate(updateUserSchema), async (req, res) => {
  const id = Number(req.params.id);
  const data = { ...req.validatedBody };

  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true }
    });

    res.json(user);
  } catch (error) {
    res.status(404).json({ message: 'Usuario no encontrado' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ message: 'Usuario no encontrado' });
  }
});

module.exports = router;
