const { Router } = require('express')
const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma')
const { z } = require('zod')

const router = Router()

const registerSchema = z.object({
  businessName: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo minusculas, numeros y guiones'),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2)
})

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body)

    const slugExists = await prisma.tenant.findUnique({ where: { slug: data.slug } })
    if (slugExists) return res.status(409).json({ error: 'Ese nombre ya esta en uso' })

    const emailExists = await prisma.tenant.findUnique({ where: { email: data.adminEmail } })
    if (emailExists) return res.status(409).json({ error: 'Ese email ya tiene una cuenta' })

    const passwordHash = await bcrypt.hash(data.adminPassword, 12)

    const tenant = await prisma.tenant.create({
      data: {
        name: data.businessName,
        slug: data.slug,
        email: data.adminEmail,
        plan: 'FREE',
        users: {
          create: {
            email: data.adminEmail,
            passwordHash,
            name: data.adminName,
            role: 'ADMIN'
          }
        }
      },
      include: {
        users: { select: { id: true, email: true, name: true, role: true } }
      }
    })

    res.status(201).json({
      message: 'Negocio registrado correctamente',
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      admin: tenant.users[0]
    })
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    next(err)
  }
})

router.get('/check-slug/:slug', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: req.params.slug } })
  res.json({ available: !tenant })
})

module.exports = router
