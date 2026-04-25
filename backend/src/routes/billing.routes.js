const { Router } = require('express')
const Stripe = require('stripe')
const prisma = require('../lib/prisma')
const authRequired = require('../middleware/auth')

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// GET /billing/config - devuelve la clave publica al frontend
router.get('/config', (_req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY })
})

// GET /billing/status - estado de la suscripcion del tenant
router.get('/status', authRequired, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { plan: true, stripeCustomerId: true, stripeSubscriptionId: true }
    })
    res.json(tenant)
  } catch (err) { next(err) }
})

// POST /billing/create-checkout - crea sesion de pago Stripe
router.post('/create-checkout', authRequired, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId }
    })

    if (tenant.plan !== 'FREE') {
      return res.status(400).json({ error: 'Ya tienes un plan activo' })
    }

    let customerId = tenant.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id, slug: tenant.slug }
      })
      customerId = customer.id

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId }
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
      mode: 'subscription',
      success_url: process.env.APP_URL + '/dashboard?upgrade=success',
      cancel_url: process.env.APP_URL + '/pricing?upgrade=cancelled',
      metadata: { tenantId: tenant.id }
    })

    res.json({ url: session.url })
  } catch (err) { next(err) }
})

// POST /billing/portal - portal de gestion de suscripcion
router.post('/portal', authRequired, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId }
    })

    if (!tenant.stripeCustomerId) {
      return res.status(400).json({ error: 'No tienes suscripcion activa' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: process.env.APP_URL + '/dashboard'
    })

    res.json({ url: session.url })
  } catch (err) { next(err) }
})

// POST /billing/webhook - eventos de Stripe
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    } else {
      event = req.body
    }
  } catch (err) {
    console.error('[WEBHOOK] Error verificando firma:', err.message)
    return res.status(400).send('Webhook error: ' + err.message)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const tenantId = session.metadata?.tenantId
        if (tenantId && session.subscription) {
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: 'PRO',
              stripeSubscriptionId: session.subscription
            }
          })
          console.log('[WEBHOOK] Tenant', tenantId, 'actualizado a PRO')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const tenant = await prisma.tenant.findFirst({
          where: { stripeSubscriptionId: sub.id }
        })
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: 'FREE', stripeSubscriptionId: null }
          })
          console.log('[WEBHOOK] Tenant', tenant.id, 'degradado a FREE')
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.log('[WEBHOOK] Pago fallido para customer:', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('[WEBHOOK] Error procesando evento:', err.message)
  }

  res.json({ received: true })
})

module.exports = router
