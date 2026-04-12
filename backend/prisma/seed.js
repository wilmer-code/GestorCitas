const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@gestorcitas.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@gestorcitas.local',
      passwordHash: adminPassword,
      role: 'admin'
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@gestorcitas.local' },
    update: {},
    create: {
      name: 'Usuario',
      email: 'user@gestorcitas.local',
      passwordHash: userPassword,
      role: 'user'
    }
  });

  await prisma.reminder.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();

  const clientA = await prisma.client.create({
    data: {
      userId: user.id,
      name: 'Carlos López',
      email: 'carlos@example.com',
      phone: '600111222'
    }
  });

  const clientB = await prisma.client.create({
    data: {
      userId: user.id,
      name: 'María Pérez',
      email: 'maria@example.com',
      phone: '600333444'
    }
  });

  const now = new Date();
  const start1 = new Date(now);
  start1.setHours(10, 0, 0, 0);
  const end1 = new Date(now);
  end1.setHours(11, 0, 0, 0);

  const start2 = new Date(now);
  start2.setHours(15, 0, 0, 0);
  const end2 = new Date(now);
  end2.setHours(15, 30, 0, 0);

  const ap1 = await prisma.appointment.create({
    data: {
      userId: user.id,
      clientId: clientA.id,
      startAt: start1,
      endAt: end1,
      status: 'scheduled'
    }
  });

  await prisma.appointment.create({
    data: {
      userId: user.id,
      clientId: clientB.id,
      startAt: start2,
      endAt: end2,
      status: 'scheduled'
    }
  });

  const sendAt = new Date(start1.getTime() - 60 * 60 * 1000);

  await prisma.reminder.create({
    data: {
      appointmentId: ap1.id,
      sendAt
    }
  });

  console.log('Seed completado ✅');
  console.log('Admin: admin@gestorcitas.local / admin123');
  console.log('User: user@gestorcitas.local / user123');
  console.log('Admin id:', admin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
