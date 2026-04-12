-- AlterTable
ALTER TABLE "citas" RENAME CONSTRAINT "Appointment_pkey" TO "citas_pkey";

-- AlterTable
ALTER TABLE "clientes" RENAME CONSTRAINT "Client_pkey" TO "clientes_pkey";

-- AlterTable
ALTER TABLE "notas" RENAME CONSTRAINT "Note_pkey" TO "notas_pkey";

-- AlterTable
ALTER TABLE "recordatorios" RENAME CONSTRAINT "Reminder_pkey" TO "recordatorios_pkey";

-- AlterTable
ALTER TABLE "usuarios" RENAME CONSTRAINT "User_pkey" TO "usuarios_pkey";

-- RenameForeignKey
ALTER TABLE "citas" RENAME CONSTRAINT "Appointment_clientId_fkey" TO "citas_clientId_fkey";

-- RenameForeignKey
ALTER TABLE "citas" RENAME CONSTRAINT "Appointment_userId_fkey" TO "citas_userId_fkey";

-- RenameForeignKey
ALTER TABLE "clientes" RENAME CONSTRAINT "Client_userId_fkey" TO "clientes_userId_fkey";

-- RenameForeignKey
ALTER TABLE "notas" RENAME CONSTRAINT "Note_clientId_fkey" TO "notas_clientId_fkey";

-- RenameForeignKey
ALTER TABLE "notas" RENAME CONSTRAINT "Note_userId_fkey" TO "notas_userId_fkey";

-- RenameForeignKey
ALTER TABLE "recordatorios" RENAME CONSTRAINT "Reminder_appointmentId_fkey" TO "recordatorios_appointmentId_fkey";

-- RenameIndex
ALTER INDEX "Appointment_clientId_idx" RENAME TO "citas_clientId_idx";

-- RenameIndex
ALTER INDEX "Appointment_userId_startAt_endAt_idx" RENAME TO "citas_userId_startAt_endAt_idx";

-- RenameIndex
ALTER INDEX "Client_userId_idx" RENAME TO "clientes_userId_idx";

-- RenameIndex
ALTER INDEX "Note_clientId_idx" RENAME TO "notas_clientId_idx";

-- RenameIndex
ALTER INDEX "Note_createdAt_idx" RENAME TO "notas_createdAt_idx";

-- RenameIndex
ALTER INDEX "Reminder_sendAt_sentAt_idx" RENAME TO "recordatorios_sendAt_sentAt_idx";

-- RenameIndex
ALTER INDEX "User_email_key" RENAME TO "usuarios_email_key";
