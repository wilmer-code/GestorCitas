-- Migration manual creada el 2026-05-23 para registrar los campos
-- stripe_customer_id y stripe_subscription_id en la tabla "tenants",
-- que ya existian en la DB pero no estaban representados en el historial
-- de migraciones (drift). Anadidos al schema.prisma durante la integracion
-- de Stripe en abril 2026 sin generar la migracion correspondiente.
-- Se aplica con: prisma migrate resolve --applied.
-- Ver NOTAS_PENDIENTES.md (entrada "Campos Stripe en Tenant ausentes en migraciones")
-- y el caso historico de la tabla notes (commit a5714cf) para contexto.

-- AlterTable
ALTER TABLE "tenants"
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT;
