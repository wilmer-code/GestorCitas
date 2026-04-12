import { prisma } from '../lib/prisma.js'

export async function tenantMiddleware(req, res, next) {
  try {
    const slug =
      req.headers['x-tenant-slug'] ||
      req.hostname.split('.')[0]

    if (!slug || slug === 'localhost' || slug === '187') {
      req.tenantSlug = 'demo'
      return next()
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug, active: true }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' })
    }

    req.tenant = tenant
    req.tenantId = tenant.id
    next()
  } catch (err) {
    next(err)
  }
}
