import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Заполнение базы тестовыми данными: 1 админ, 2 исполнителя, 5 заявок
// в разных статусах. serviceType хранится как слаг, история — как коды
// (подписи подставляются на нужном языке при отображении).
const prisma = new PrismaClient();

async function main() {
  await prisma.crmTask.deleteMany();
  await prisma.dealComment.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
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

  // ── CRM: клиенты и сделки в разных этапах воронки ──────────
  const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);
  const atToday = (h: number) => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d;
  };

  const c1 = await prisma.contact.create({
    data: { name: "Familie Müller", phone: "+49 151 2345678", whatsapp: "+49 151 2345678", email: "mueller@example.de", address: "Berlin, Wedding, Müllerstr. 12", language: "DE", source: "whatsapp" },
  });
  const c2 = await prisma.contact.create({
    data: { name: "Oleg Petrenko", phone: "+49 160 7778899", whatsapp: "+49 160 7778899", address: "Berlin, Neukölln, Sonnenallee 40", language: "RU", source: "kleinanzeigen" },
  });
  const c3 = await prisma.contact.create({
    data: { name: "Ana Popescu", phone: "+49 176 5551122", address: "Berlin, Mitte, Torstr. 5", language: "RO", source: "instagram" },
  });
  const c4 = await prisma.contact.create({
    data: { name: "James Brown", phone: "+49 152 3334455", email: "james@example.com", address: "Berlin, Charlottenburg, Kantstr. 88", language: "EN", source: "google" },
  });
  const c5 = await prisma.contact.create({
    data: { name: "Familie Schneider", phone: "+49 171 9008070", whatsapp: "+49 171 9008070", address: "Berlin, Pankow, Breite Str. 3", language: "DE", source: "referral" },
  });

  // Сделка 1 — новая заявка + авто-задача
  await prisma.deal.create({
    data: {
      title: "Кухня — Müller, Wedding", pipeline: "moebelstock24", stage: "new",
      contactId: c1.id, serviceType: "kitchen", amount: 1450, amountType: "brutto",
      description: "Монтаж кухни ~4 м, есть фото. Нужен вынос старой мебели.",
      workAddress: c1.address, ownerId: admin.id, paymentStatus: "unpaid",
      needDismantle: true, needWaste: true,
      comments: { create: [
        { channel: "system", body: "Сделка создана", authorId: admin.id },
        { channel: "whatsapp", body: "Guten Tag! Können Sie eine Küche montieren? ~4 Meter." },
      ] },
      crmTasks: { create: { title: "Позвонить клиенту, уточнить фото/размеры/адрес", kind: "call", dueAt: atToday(18) } },
    },
  });

  // Сделка 2 — нужны данные
  await prisma.deal.create({
    data: {
      title: "Переезд студии — Petrenko", pipeline: "moebelstock24", stage: "need_info",
      contactId: c2.id, serviceType: "moving", amount: 600,
      description: "Переезд 1-комн., ~15 коробок, диван, стол.", workAddress: c2.address,
      ownerId: admin.id, paymentStatus: "unpaid", hasLift: true,
      crmTasks: { create: { title: "Запросить фото, размеры и адрес объекта", kind: "photo", dueAt: atToday(17) } },
    },
  });

  // Сделка 3 — Angebot отправлен + просроченная follow-up задача
  await prisma.deal.create({
    data: {
      title: "Шкаф PAX — Popescu", pipeline: "moebelstock24", stage: "offer_sent",
      contactId: c3.id, serviceType: "wardrobe", amount: 380, amountType: "brutto",
      description: "Сборка 2× PAX, комод. Фото есть.", workAddress: c3.address,
      ownerId: admin.id, paymentStatus: "unpaid", parking: "unclear", floor: "3. OG", hasLift: false,
      comments: { create: { channel: "note", body: "Отправил Angebot 380€ Brutto по WhatsApp." } },
      crmTasks: { create: { title: "Написать клиенту (прошёл 1 день после Angebot)", kind: "followup", dueAt: hoursFromNow(-20) } },
    },
  });

  // Сделка 4 — термин согласован на сегодня + напоминание о парковке
  await prisma.deal.create({
    data: {
      title: "Кухня + подключение — Brown", pipeline: "moebelstock24", stage: "scheduled",
      contactId: c4.id, serviceType: "kitchen", amount: 2100, amountType: "brutto",
      description: "Монтаж кухни 5 м + подключение посудомойки и воды.",
      workAddress: c4.address, ownerId: admin.id, team: "team1",
      scheduledAt: atToday(9), paymentStatus: "unpaid", parking: "yes", floor: "EG",
      needConnect: true, warranty1y: true,
      comments: { create: { channel: "system", body: "Термин согласован на сегодня 09:00" } },
      crmTasks: { create: { title: "Напомнить клиенту о парковке (Opel Combo/Citan)", kind: "parking", dueAt: atToday(8) } },
    },
  });

  // Сделка 5 — в работе сегодня, Team 2
  await prisma.deal.create({
    data: {
      title: "Демонтаж + вывоз — Schneider", pipeline: "moebelstock24", stage: "in_work",
      contactId: c5.id, serviceType: "dismantle", amount: 750, amountType: "brutto",
      description: "Демонтаж старой кухни и вывоз мусора.", workAddress: c5.address,
      ownerId: admin.id, team: "team2", scheduledAt: atToday(13),
      paymentStatus: "partial", parking: "yes", needWaste: true, needDismantle: true,
    },
  });

  // Сделка 6 — выполнено/оплата + задача проверить оплату
  await prisma.deal.create({
    data: {
      title: "Транспорт дивана — Müller", pipeline: "moebelstock24", stage: "done_paid",
      contactId: c1.id, serviceType: "transport", amount: 220, amountType: "brutto",
      description: "Перевозка дивана в другой район.", ownerId: admin.id, team: "team1",
      paymentStatus: "unpaid", paymentMethod: "bar",
      crmTasks: { create: { title: "Проверить оплату и попросить отзыв", kind: "payment", dueAt: atToday(19) } },
    },
  });

  // Сделка 7 — отказ
  await prisma.deal.create({
    data: {
      title: "Кровать — отказ", pipeline: "moebelstock24", stage: "lost",
      contactId: c2.id, serviceType: "bed", amount: 150, ownerId: admin.id, paymentStatus: "unpaid",
      comments: { create: { channel: "note", body: "Клиент нашёл дешевле. Причина потери: цена." } },
    },
  });

  // Пример второй воронки — ReinigungBerlin24
  await prisma.deal.create({
    data: {
      title: "Уборка после переезда — Popescu", pipeline: "reinigung", stage: "offer_sent",
      contactId: c3.id, serviceType: "other", amount: 260, ownerId: admin.id, paymentStatus: "unpaid",
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
