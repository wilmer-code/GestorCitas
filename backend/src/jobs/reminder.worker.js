const cron = require('node-cron');
const nodemailer = require('nodemailer');
const prisma = require('../lib/prisma');

function buildTransporter() {
  if (process.env.REMINDER_MODE !== 'email') return null;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

function startReminderWorker() {
  const transporter = buildTransporter();

  // Cron: cada minuto revisa recordatorios pendientes y marca sent_at al enviarlos.
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    const reminders = await prisma.reminder.findMany({
      where: {
        sendAt: { lte: now },
        sentAt: null
      },
      include: {
        appointment: {
          include: { user: true, client: true }
        }
      }
    });

    for (const reminder of reminders) {
      const ap = reminder.appointment;
      const msg = `Recordatorio: cita con ${ap.client.name} a las ${ap.startAt.toISOString()}`;

      try {
        if (transporter) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: ap.user.email,
            subject: 'Recordatorio de cita',
            text: msg
          });
        } else {
          console.log(`[REMINDER][DEV] ${msg}`);
        }

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { sentAt: new Date() }
        });
      } catch (error) {
        console.error('Error enviando recordatorio', reminder.id, error.message);
      }
    }
  });
}

module.exports = { startReminderWorker };
