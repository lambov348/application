/**
 * Дымовые проверки в настоящем браузере.
 *
 * Проверяют то, что не ловится юнит-тестами: установку приложения на телефон,
 * работу входа без JavaScript, разделение доступа по ролям и скорость.
 *
 * Запуск:
 *   npm run build && npm start          # в одном окне
 *   SMOKE_URL=http://localhost:3000 \
 *   SMOKE_MONTEUR=max@firma.de:пароль \
 *   SMOKE_DISPONENT=petra@firma.de:пароль \
 *   npm run smoke                       # в другом
 *
 * Учётные данные берутся из окружения и в репозиторий не попадают. Без них
 * проверки входа пропускаются, остальные выполняются.
 *
 * ВНИМАНИЕ: проверки заводят тестового клиента с адресом. Запускать только на
 * базе для разработки, никогда на рабочей. Тестовые клиенты узнаются по
 * фамилии вида Smoke123456 и удаляются через архивирование в интерфейсе.
 *
 * Важно про проверки текста: document.body.textContent захватывает и
 * содержимое <script>, куда Next кладёт весь словарь переводов, — проверка
 * по нему проходила бы всегда. Поэтому здесь везде innerText.
 */
import { chromium } from "playwright";

const BASE = process.env.SMOKE_URL ?? "http://127.0.0.1:3000";
const CHROME = process.env.SMOKE_CHROMIUM; // путь к Chromium, если он не стандартный

let passed = 0;
let failed = 0;
let skipped = 0;

const check = (name, ok, extra = "") => {
  if (ok) {
    passed++;
    console.log(`  OK    ${name} ${extra}`);
  } else {
    failed++;
    console.log(`  СБОЙ  ${name} ${extra}`);
  }
};
const skip = (name, why) => {
  skipped++;
  console.log(`  ПРОП  ${name} — ${why}`);
};

/** Учётные данные вида "email:пароль" из переменной окружения. */
function credentials(varName) {
  const raw = process.env[varName];
  if (!raw) return null;
  const at = raw.indexOf(":");
  if (at < 1) {
    console.error(`  ${varName} должна быть вида email:пароль`);
    return null;
  }
  return { email: raw.slice(0, at), password: raw.slice(at + 1) };
}

const monteur = credentials("SMOKE_MONTEUR");
const disponent = credentials("SMOKE_DISPONENT");

const browser = await chromium.launch(
  CHROME ? { executablePath: CHROME } : undefined,
);

/** Кнопка отправки именно этой формы: на странице их несколько. */
const submitOf = (page, anchor) =>
  page.locator(`form:has(${anchor}) button[type="submit"]`);

const visibleText = (page) => page.evaluate(() => document.body.innerText);

/** Отправка формы серверного действия завершается позже, чем «сеть спокойна». */
async function settle(page, ms = 3000) {
  await page.waitForTimeout(ms);
  await page.waitForLoadState("networkidle").catch(() => {});
}

// ── 1. Установка на телефон ─────────────────────────────────────────────────
console.log("\n1. Установка на телефон");
{
  const res = await fetch(`${BASE}/manifest.webmanifest`);
  check("манифест отдаётся", res.ok, `(${res.status})`);

  if (res.ok) {
    const m = await res.json();
    check("запуск на весь экран", m.display === "standalone", `(${m.display})`);
    check("стартовая страница — кабинет бригады", m.start_url === "/m");
    check("есть значок для Android", m.icons?.some((i) => i.purpose === "maskable"));

    for (const icon of m.icons ?? []) {
      const r = await fetch(BASE + icon.src);
      check(
        `значок ${icon.sizes}`,
        r.ok && r.headers.get("content-type") === "image/png",
      );
    }
  }
  const apple = await fetch(`${BASE}/icons/apple-touch-icon.png`);
  check("значок для iPhone", apple.ok);
}

// ── 2. Работа при плохой связи ──────────────────────────────────────────────
console.log("\n2. Работа при плохой связи");
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const registered = await page.evaluate(
    async () => Boolean(await navigator.serviceWorker.getRegistration()),
  );
  check("service worker зарегистрирован", registered);

  await page.reload({ waitUntil: "networkidle" });
  const repeat = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .reduce((sum, r) => sum + (r.transferSize || 0), 0),
  );
  check(
    "повторный заход почти без загрузки",
    repeat < 60 * 1024,
    `— ${(repeat / 1024).toFixed(0)} КБ`,
  );
  await page.close();
}

// ── 3. Два раздельных входа ─────────────────────────────────────────────────
console.log("\n3. Раздельные входы");
{
  const page = await browser.newPage();

  await page.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
  const team = await visibleText(page);
  check("вход бригады открывается", team.includes("Zugang für Monteure"));
  const bg = await page.evaluate(
    () => getComputedStyle(document.querySelector("main")).backgroundColor,
  );
  check("тёмный экран как у приложения", bg === "rgb(30, 35, 38)", `(${bg})`);

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  check(
    "офисный вход открывается",
    (await visibleText(page)).includes("Anmeldung für Mitarbeiter"),
  );

  // Неавторизованного из кабинета ведём на вход бригады, а не на офисный.
  // Регрессия: страница входа лежала под защищённой разметкой и
  // перенаправляла сама на себя.
  await page.goto(`${BASE}/m`, { waitUntil: "networkidle" });
  check(
    "кабинет ведёт на вход бригады",
    page.url().includes("/m/anmelden"),
    `(${page.url()})`,
  );
  await page.close();
}

// ── 4. Вход без JavaScript ──────────────────────────────────────────────────
console.log("\n4. Вход без JavaScript (связь в подвале)");
if (!monteur) {
  skip("вход монтажника без JS", "не задана SMOKE_MONTEUR");
} else {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/m/anmelden`);

  // Next отдаёт форме серверного действия скрытые поля и обычную отправку
  // методом POST — благодаря им форма работает до загрузки скриптов.
  const hidden = await page.locator('form input[name^="$ACTION"]').count();
  check("форма готова к отправке без скриптов", hidden > 0, `(полей: ${hidden})`);

  await page.fill("#email", monteur.email);
  await page.fill("#password", monteur.password);
  await submitOf(page, "#email").click();
  await settle(page);

  check("вход выполнен", page.url().endsWith("/m"), `(${page.url()})`);
  check(
    "сессия выдана",
    (await ctx.cookies()).some((c) => c.name.includes("session-token")),
  );
  await ctx.close();
}

// ── 5. Роли ведут в свои разделы ────────────────────────────────────────────
console.log("\n5. Роли");
for (const [who, creds, entry, target] of [
  ["монтажник", monteur, "/m/anmelden", "/m"],
  ["диспетчер", disponent, "/login", "/heute"],
]) {
  if (!creds) {
    skip(`${who} попадает в ${target}`, `не задана SMOKE_${who === "монтажник" ? "MONTEUR" : "DISPONENT"}`);
    continue;
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + entry, { waitUntil: "networkidle" });
  await page.fill("#email", creds.email);
  await page.fill("#password", creds.password);
  await submitOf(page, "#email").click();
  await settle(page, 3500);
  check(`${who} попадает в ${target}`, page.url().endsWith(target), `(${page.url()})`);

  if (who === "монтажник") {
    await page.goto(`${BASE}/einstellungen/benutzer`, { waitUntil: "networkidle" });
    check(
      "монтажник не пущен в управление сотрудниками",
      !page.url().includes("/einstellungen"),
      `(${page.url()})`,
    );
  }
  await ctx.close();
}

// ── 6. Клиенты: поиск находит номер при любом написании ─────────────────────
console.log("\n6. Клиенты");
if (!disponent) {
  skip("работа с клиентами", "не задана SMOKE_DISPONENT");
} else {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", disponent.email);
  await page.fill("#password", disponent.password);
  await submitOf(page, "#email").click();
  await settle(page, 3500);

  // Заводим клиента с номером в национальном написании.
  const marker = `Smoke${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE}/kunden/neu`, { waitUntil: "networkidle" });
  await page.fill("#lastName", marker);
  await page.fill("#firstName", "Test");
  await page.fill("#phone", "0176 79892037");
  await submitOf(page, "#lastName").click();
  await settle(page, 3500);
  check("клиент заведён", page.url().includes("/kunden/"), `(${page.url()})`);

  const customerUrl = page.url();

  // Адрес для проверки поиска по улице.
  await page.locator("summary:has-text(\"Adresse hinzufügen\")").last().click();
  await page.fill("#street-neu", `${marker}straße 7`);
  await page.fill("#zip-neu", "10115");
  await page.fill("#city-neu", "Berlin");
  await submitOf(page, "#street-neu").click();
  await settle(page, 3000);
  check(
    "адрес добавлен",
    (await visibleText(page)).includes(`${marker}straße 7`),
  );

  // Один и тот же номер, записанный по-разному, должен находиться.
  for (const [written, label] of [
    ["0176 79892037", "как записали"],
    ["+49 176 79892037", "международный формат"],
    ["017679892037", "без пробелов"],
    ["79892037", "хвост номера"],
  ]) {
    await page.goto(`${BASE}/kunden?q=${encodeURIComponent(written)}`, {
      waitUntil: "networkidle",
    });
    check(`поиск по номеру (${label})`, (await visibleText(page)).includes(marker));
  }

  await page.goto(`${BASE}/kunden?q=${marker}`, { waitUntil: "networkidle" });
  check("поиск по фамилии", (await visibleText(page)).includes(marker));

  await page.goto(`${BASE}/kunden?q=${marker}stra`, { waitUntil: "networkidle" });
  check("поиск по улице", (await visibleText(page)).includes(marker));

  await page.goto(`${BASE}/kunden?q=ZZnichtvorhandenZZ`, { waitUntil: "networkidle" });
  check("несуществующий запрос ничего не находит", (await visibleText(page)).includes("Nichts gefunden"));

  // Диспетчер не должен видеть необратимое удаление данных: только владелец.
  await page.goto(customerUrl, { waitUntil: "networkidle" });
  check(
    "диспетчеру недоступно удаление данных DSGVO",
    !(await visibleText(page)).includes("Endgültig löschen"),
  );
  check("диспетчеру доступно архивирование", (await visibleText(page)).includes("archivieren"));

  await ctx.close();
}

// ── 7. Монтажник не видит клиентов ──────────────────────────────────────────
console.log("\n7. Клиенты закрыты от бригады");
if (!monteur) {
  skip("монтажник не видит клиентов", "не задана SMOKE_MONTEUR");
} else {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
  await page.fill("#email", monteur.email);
  await page.fill("#password", monteur.password);
  await submitOf(page, "#email").click();
  await settle(page, 3500);

  await page.goto(`${BASE}/kunden`, { waitUntil: "networkidle" });
  check("монтажник не пущен в клиентов", !page.url().includes("/kunden"), `(${page.url()})`);
  await ctx.close();
}

// ── 8. Скорость ─────────────────────────────────────────────────────────────
console.log("\n8. Скорость");
{
  const times = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    await fetch(`${BASE}/m/anmelden`);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  check("ответ сервера быстрее 150 мс", median < 150, `— ${median.toFixed(0)} мс`);

  const page = await browser.newPage();
  await page.goto(`${BASE}/m/anmelden`, { waitUntil: "load" });
  await page.waitForTimeout(500); // запись о первой отрисовке приходит позже load
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paint = performance
      .getEntriesByType("paint")
      .find((p) => p.name === "first-contentful-paint");
    const byType = { fonts: 0, scripts: 0, other: 0 };
    for (const r of performance.getEntriesByType("resource")) {
      const size = r.transferSize || 0;
      if (/\.woff2?/.test(r.name)) byType.fonts += size;
      else if (/\.js/.test(r.name)) byType.scripts += size;
      else byType.other += size;
    }
    return {
      fcp: paint ? Math.round(paint.startTime) : null,
      total: byType.fonts + byType.scripts + byType.other,
      ...byType,
    };
  });
  console.log(
    `        шрифты ${(m.fonts / 1024).toFixed(0)} КБ, скрипты ${(m.scripts / 1024).toFixed(0)} КБ, ` +
      `прочее ${(m.other / 1024).toFixed(0)} КБ`,
  );
  check("первая отрисовка быстрее 1 с", m.fcp !== null && m.fcp < 1000, `— ${m.fcp} мс`);
  check(
    "первый заход легче 200 КБ",
    m.total < 200 * 1024,
    `— ${(m.total / 1024).toFixed(0)} КБ`,
  );
  await page.close();
}

await browser.close();
console.log(`\nИтого: ${passed} пройдено, ${failed} сбоев, ${skipped} пропущено`);
process.exit(failed === 0 ? 0 : 1);
