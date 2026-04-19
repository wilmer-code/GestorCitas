const cron = require('node-cron')
const nodemailer = require('nodemailer')
const prisma = require('../lib/prisma')

function buildTransporter() {
  if (process.env.REMINDER_MODE !== 'email') return null
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  })
}

function startReminderWorker() {
  const transporter = buildTransporter()

  cron.schedule('* * * * *', async () => {
    const now = new Date()
    try {
      const reminders = await prisma.reminder.findMany({
        where: { sendAt: { lte: now }, sentAt: null },
        include: {
          appointment: { include: { user: true, client: true } }
        }
      })

      for (const reminder of reminders) {
        const ap = reminder.appointment
        const msg = reminder.message || 
          'Recordatorio: cita con ' + ap.client.name + ' a las ' + ap.startTime.toISOString()

        try {
          if (transporter) {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: ap.user.email,
              subject: 'Recordatorio de cita - Citio',
              text: msg
            })
          } else {
            console.log('[REMINDER][DEV]', msg)
          }

          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { sentAt: new Date() }
          })
        } catch (err) {
          console.error('[REMINDER] Error en reminder', reminder.id, err.message)
        }
      }
    } catch (err) {
      console.error('[REMINDER] Error en cron', err.message)
    }
  })

  console.log('[REMINDER] Worker iniciado')
}

module.exports = { startReminderWorker }
