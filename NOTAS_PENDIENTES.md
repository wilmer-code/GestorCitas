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
