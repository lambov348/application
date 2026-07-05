import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Заполнение базы тестовыми данными: 1 админ, 2 исполнителя, 5 заявок
// в разных статусах — чтобы сразу увидеть работу интерфейса.
const prisma = new PrismaClient();

async function main() {
  // Чистим таблицы для идемпотентности seed (порядок важен из-за связей).
  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  // Пользователи
  const admin = await prisma.user.create({
    data: {
      name: "Администратор",
      email: "admin@moebelstock24.de",
      passwordHash: hash("admin123"),
      role: "admin",
      active: true,
    },
  });

  const anna = await prisma.user.create({
    data: {
      name: "Анна Шульц",
      email: "anna@moebelstock24.de",
      passwordHash: hash("worker123"),
      role: "worker",
      active: true,
    },
  });

  const boris = await prisma.user.create({
    data: {
      name: "Борис Кляйн",
      email: "boris@moebelstock24.de",
      passwordHash: hash("worker123"),
      role: "worker",
      active: true,
    },
  });

  const day = 24 * 60 * 60 * 1000;
  const soon = (days: number) => new Date(Date.now() + days * day);

  // Заявка №1 — новая, без исполнителя
  await prisma.request.create({
    data: {
      clientName: "Пётр Иванов",
      clientContact: "+49 151 1112233",
      serviceType: "Сборка мебели",
      description: "Собрать шкаф IKEA PAX (2 секции) и комод.",
      address: "Berlin, Alexanderplatz 1",
      preferredDate: soon(2),
      status: "new",
      logs: { create: { action: "created", note: "Заявка создана клиентом" } },
    },
  });

  // Заявка №2 — назначена Анне
  const req2 = await prisma.request.create({
    data: {
      clientName: "Мария Фишер",
      clientContact: "+49 160 2223344",
      serviceType: "Помощь с переездом",
      description: "Переезд студии, ~15 коробок, диван, стол. Есть лифт.",
      address: "München, Leopoldstraße 20",
      preferredDate: soon(3),
      status: "assigned",
      task: { create: { workerId: anna.id, status: "assigned" } },
      logs: {
        create: [
          { action: "created", note: "Заявка создана клиентом" },
          {
            actorId: admin.id,
            action: "assigned",
            note: "Назначен исполнитель: Анна Шульц",
          },
        ],
      },
    },
  });

  // Заявка №3 — в работе у Бориса
  await prisma.request.create({
    data: {
      clientName: "Олег Смирнов",
      clientContact: "+49 170 3334455",
      serviceType: "Перевозка и доставка",
      description: "Перевезти обеденный стол и 6 стульев в другой район.",
      address: "Hamburg, Reeperbahn 10",
      preferredDate: soon(1),
      status: "in_progress",
      task: {
        create: {
          workerId: boris.id,
          status: "in_progress",
          workerComment: "Выехал к клиенту, загружаю мебель.",
        },
      },
      logs: {
        create: [
          { action: "created", note: "Заявка создана клиентом" },
          {
            actorId: admin.id,
            action: "assigned",
            note: "Назначен исполнитель: Борис Кляйн",
          },
          {
            actorId: boris.id,
            action: "worker_update",
            note: "Статус изменён на «В работе»",
          },
        ],
      },
    },
  });

  // Заявка №4 — выполнена Анной
  await prisma.request.create({
    data: {
      clientName: "Елена Вагнер",
      clientContact: "+49 152 4445566",
      serviceType: "Монтаж на стену",
      description: "Повесить телевизор 55\" и две полки в гостиной.",
      address: "Köln, Hohe Straße 5",
      preferredDate: soon(-1),
      status: "done",
      task: {
        create: {
          workerId: anna.id,
          status: "done",
          workerComment: "Телевизор и полки закреплены, всё проверено.",
        },
      },
      logs: {
        create: [
          { action: "created", note: "Заявка создана клиентом" },
          {
            actorId: admin.id,
            action: "assigned",
            note: "Назначен исполнитель: Анна Шульц",
          },
          {
            actorId: anna.id,
            action: "worker_update",
            note: "Статус изменён на «Выполнена»; Добавлен комментарий исполнителя",
          },
        ],
      },
    },
  });

  // Заявка №5 — отменена
  await prisma.request.create({
    data: {
      clientName: "Дмитрий Ковалёв",
      clientContact: "+49 176 5556677",
      serviceType: "Уборка и вынос",
      description: "Вынести старый диван. Клиент передумал.",
      address: "Frankfurt, Zeil 30",
      status: "cancelled",
      logs: {
        create: [
          { action: "created", note: "Заявка создана клиентом" },
          {
            actorId: admin.id,
            action: "status_changed",
            note: "Статус изменён на «Отменена»",
          },
        ],
      },
    },
  });

  console.log("Seed завершён:");
  console.log(`  Админ:        ${admin.email} / admin123`);
  console.log(`  Исполнитель:  ${anna.email} / worker123`);
  console.log(`  Исполнитель:  ${boris.email} / worker123`);
  console.log(`  Заявка №${req2.id} назначена, всего 5 заявок.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
