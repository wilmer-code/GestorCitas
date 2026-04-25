const prisma = require('../lib/prisma')

const PLAN_LIMITS = {
  FREE: { appointmentsPerMonth: 50, clients: 100 },
  PRO: { appointmentsPerMonth: 500, clients: 1000 },
  BUSINESS: { appointmentsPerMonth: Infinity, clients: Infinity }
}

async function checkAppointmentLimit(req, res, next) {
  try {
    const tenantId = req.user?.tenantId
    if (!tenantId) return next()

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return next()

    const limit = PLAN_LIMITS[tenant.plan]?.appointmentsPerMonth || 50

    if (limit === Infinity) return next()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const count = await prisma.appointment.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    })

    if (count >= limit) {
      return res.status(403).json({
        error: 'Limite del plan alcanzado',
        message: 'Has alcanzado el limite de ' + limit + ' citas este mes. Actualiza tu plan para continuar.',
        plan: tenant.plan,
        limit,
        current: count
      })
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { checkAppointmentLimit, PLAN_LIMITS }
