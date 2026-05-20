-- Migration manual creada el 2026-05-20 para registrar la tabla "notes",
-- que ya existia en la DB pero no estaba representada en el historial
-- de migraciones (drift). Se aplica con: prisma migrate resolve --applied.
-- Ver NOTAS_PENDIENTES.md (entrada "Tabla notes ausente en migracion multitenant")
-- para el contexto historico.

CREATE TABLE "notes" (
    "id"         TEXT NOT NULL,
    "tenant_id"  TEXT NOT NULL,
    "client_id"  TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "notes" ADD CONSTRAINT "notes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
