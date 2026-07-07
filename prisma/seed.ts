import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Заполнение базы тестовыми данными: 1 админ, 2 исполнителя, 5 заявок
// в разных статусах. serviceType хранится как слаг, история — как коды
// (подписи подставляются на нужном языке при отображении).
const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Administrator",
      email: "admin@moebelstock24.de",
      passwordHash: hash("admin123"),
      role: "admin",
      active: true,
    },
  });

  const anna = await prisma.user.create({
    data: {
      name: "Anna Schulz",
      email: "anna@moebelstock24.de",
      passwordHash: hash("worker123"),
      role: "worker",
      active: true,
    },
  });

  const boris = await prisma.user.create({
    data: {
      name: "Boris Klein",
      email: "boris@moebelstock24.de",
      passwordHash: hash("worker123"),
      role: "worker",
      active: true,
    },
  });

  const day = 24 * 60 * 60 * 1000;
  const soon = (days: number) => new Date(Date.now() + days * day);

  // №1 — новая, без исполнителя
  await prisma.request.create({
    data: {
      clientName: "Peter Ivanov",
      clientContact: "+49 151 1112233",
      serviceType: "assembly",
      description: "IKEA PAX Schrank (2 Elemente) und Kommode aufbauen.",
      address: "Berlin, Alexanderplatz 1",
      preferredDate: soon(2),
      status: "new",
      logs: { create: { action: "created" } },
    },
  });

  // №2 — назначена Анне
  const req2 = await prisma.request.create({
    data: {
      clientName: "Maria Fischer",
      clientContact: "+49 160 2223344",
      serviceType: "moving",
      description: "Umzug Studio, ~15 Kartons, Sofa, Tisch. Aufzug vorhanden.",
      address: "München, Leopoldstraße 20",
      preferredDate: soon(3),
      status: "assigned",
      task: { create: { workerId: anna.id, status: "assigned" } },
      logs: {
        create: [
          { action: "created" },
          { actorId: admin.id, action: "assigned", note: anna.name },
        ],
      },
    },
  });

  // №3 — в работе у Бориса
  await prisma.request.create({
    data: {
      clientName: "Oleg Smirnov",
      clientContact: "+49 170 3334455",
      serviceType: "transport",
      description: "Esstisch und 6 Stühle in einen anderen Bezirk transportieren.",
      address: "Hamburg, Reeperbahn 10",
      preferredDate: soon(1),
      status: "in_progress",
      task: {
        create: {
          workerId: boris.id,
          status: "in_progress",
          workerComment: "Unterwegs zum Kunden, lade die Möbel.",
        },
      },
      logs: {
        create: [
          { action: "created" },
          { actorId: admin.id, action: "assigned", note: boris.name },
          { actorId: boris.id, action: "status_changed", note: "in_progress" },
        ],
      },
    },
  });

  // №4 — выполнена Анной
  await prisma.request.create({
    data: {
      clientName: "Elena Wagner",
      clientContact: "+49 152 4445566",
      serviceType: "mounting",
      description: 'TV 55" und zwei Regale im Wohnzimmer aufhängen.',
      address: "Köln, Hohe Straße 5",
      preferredDate: soon(-1),
      status: "done",
      task: {
        create: {
          workerId: anna.id,
          status: "done",
          workerComment: "TV und Regale montiert, alles geprüft.",
        },
      },
      logs: {
        create: [
          { action: "created" },
          { actorId: admin.id, action: "assigned", note: anna.name },
          { actorId: anna.id, action: "status_changed", note: "done" },
        ],
      },
    },
  });

  // №5 — отменена
  await prisma.request.create({
    data: {
      clientName: "Dmitry Kowalev",
      clientContact: "+49 176 5556677",
      serviceType: "cleaning",
      description: "Altes Sofa entsorgen. Kunde hat es sich anders überlegt.",
      address: "Frankfurt, Zeil 30",
      status: "cancelled",
      logs: {
        create: [
          { action: "created" },
          { actorId: admin.id, action: "status_changed", note: "cancelled" },
        ],
      },
    },
  });

  console.log("Seed done:");
  console.log(`  Admin:   ${admin.email} / admin123`);
  console.log(`  Worker:  ${anna.email} / worker123`);
  console.log(`  Worker:  ${boris.email} / worker123`);
  console.log(`  Request #${req2.id} assigned, 5 requests total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
