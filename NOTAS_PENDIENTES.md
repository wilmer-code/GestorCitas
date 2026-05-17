# Notas Pendientes

## Tabla `notes` ausente en migración multitenant

### Descripción del problema

La migración `20260419161652_multitenant_citio` elimina todas las tablas del schema anterior (incluyendo `notas`) y recrea el schema completo para multi-tenant, pero **omite el `CREATE TABLE` para la tabla `notes`**. El modelo `Note` sí existe en `prisma/schema.prisma` con todas sus relaciones, pero no hay ninguna instrucción SQL que cree físicamente esa tabla en la base de datos.

### Impacto potencial

- Si la base de datos se destruye y se recrea aplicando las migraciones desde cero (`prisma migrate deploy`), la tabla `notes` no existirá.
- Cualquier operación sobre notas (crear, leer, actualizar, eliminar) lanzará un error en runtime.
- El entorno de producción actual puede estar funcionando solo porque la tabla fue creada manualmente o porque la DB no fue reiniciada desde la migración multitenant.

### Posible solución

Crear una nueva migración que añada la tabla `notes` con su estructura correcta:

```sql
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

O bien, ejecutar `prisma migrate dev --name add_notes_table` para que Prisma genere la migración automáticamente comparando el schema contra el estado real de la DB.

---

## Validación de horario comercial: drift entre documentación y código

### Descripción del problema

El `README.md` afirma que el backend valida el horario "09:00-18:00". El script `backend/scripts/test-business-hours.sh` documenta un rango diferente: **10:00–20:30 hora Madrid**. Sin embargo, **`backend/src/routes/appointments.routes.js` no contiene ninguna validación de rango horario**. El handler de `POST /appointments` solo comprueba que `startTime < endTime`, solape entre citas y existencia del cliente.

### Problemas adicionales detectados en el script

El script `test-business-hours.sh` usa los campos `startAt`/`endAt` en el body de la petición, pero el schema Zod actual requiere `startTime`/`endTime`. El script está roto y nunca pasaría contra la API actual.

### Impacto potencial

- Actualmente se pueden crear citas a cualquier hora del día (00:00–23:59), lo que contradice la documentación oficial del producto.
- El script de smoke-test da falsa seguridad: falla por razones distintas a las que pretende testear.

### Posible solución

1. Decidir el rango definitivo (¿10:00–20:30 Madrid, o 09:00–18:00?).
2. Implementar la validación en `appointments.routes.js` (en el handler de POST y PUT), convirtiendo `startTime` a la timezone correcta antes de comparar horas.
3. Actualizar el script para usar los campos `startTime`/`endTime` y ajustar los casos de prueba al rango real.
4. Actualizar `README.md` y `CLAUDE.md` para reflejar el rango implementado.

---

## Campos Stripe en Tenant ausentes en migraciones

### Descripción del problema

El modelo `Tenant` en `backend/prisma/schema.prisma` declara dos campos que no están cubiertos por ninguna migración existente:

- `stripeCustomerId String? @map("stripe_customer_id")`
- `stripeSubscriptionId String? @map("stripe_subscription_id")`

Estos campos fueron añadidos directamente al schema (probablemente durante la integración de Stripe) sin ejecutar `prisma migrate dev` para generar el `ALTER TABLE` correspondiente. Las migraciones actuales en `prisma/migrations/` no contienen ninguna instrucción que añada las columnas `stripe_customer_id` ni `stripe_subscription_id` a la tabla `tenants`.

### Impacto potencial

- Si se ejecuta `prisma migrate deploy` en un entorno limpio (nueva instalación, staging, CI), la tabla `tenants` no tendrá esas columnas.
- El flujo de checkout de Stripe (`/billing/checkout`) fallará al intentar guardar el `customerId` devuelto por Stripe.
- El webhook de Stripe (`/billing/webhook`) fallará al intentar actualizar `stripeSubscriptionId` tras un evento `checkout.session.completed` o `customer.subscription.deleted`.
- En producción el entorno actual puede funcionar solo porque las columnas fueron creadas manualmente o porque la DB nunca fue reconstruida desde cero tras la integración de Stripe.

### Posible solución

**Ruta A — entorno de desarrollo (DB sin datos críticos):**

```bash
npx prisma migrate dev --name add_stripe_fields_to_tenant
```

Prisma detectará la diferencia entre el schema y la DB, generará el `ALTER TABLE` automáticamente y registrará la migración.

**Ruta B — producción (columnas ya existen en la DB):**

Crear manualmente el archivo `prisma/migrations/<timestamp>_add_stripe_fields_to_tenant/migration.sql` con el siguiente contenido:

```sql
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" TEXT;
```

Luego marcarla como ya aplicada sin ejecutarla:

```bash
npx prisma migrate resolve --applied <timestamp>_add_stripe_fields_to_tenant
```

Esto sincroniza el historial de migraciones con el estado real de la DB sin riesgo de duplicar columnas.
