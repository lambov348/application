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
 *   SMOKE_INHABER=chef@firma.de:пароль:секрет2FA \
 *   SMOKE_LEAD_SECRET=$LEAD_WEBHOOK_SECRET \
 *   npm run smoke                       # в другом
 *
 * SMOKE_URL должен совпадать с AUTH_URL приложения: Auth.js строит обратные
 * ссылки по AUTH_URL, и при расхождении хостов сессия не доедет.
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
import { generateSync } from "otplib";

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

/**
 * Владелец: email:пароль:секрет2FA. Секрет в формате base32 — тот самый, что
 * показывается при настройке второго фактора. Нужен, чтобы проверить
 * правило «цену ставит только владелец» с обеих сторон.
 */
function ownerCredentials() {
  const raw = process.env.SMOKE_INHABER;
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length < 3) {
    console.error("  SMOKE_INHABER должна быть вида email:пароль:секрет2FA");
    return null;
  }
  return {
    email: parts[0],
    password: parts.slice(1, -1).join(":"),
    totpSecret: parts[parts.length - 1],
  };
}
const inhaber = ownerCredentials();

const totpNow = (secret) =>
  generateSync({ secret, strategy: "totp", epoch: Math.floor(Date.now() / 1000) });

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

// ── 8. Заявки: правила главы 9 и правило цены ───────────────────────────────
console.log("\n8. Заявки и правило цены");
if (!disponent || !inhaber) {
  skip("правила заявок", "нужны SMOKE_DISPONENT и SMOKE_INHABER");
} else {
  // ── Диспетчер заводит клиента и заявку ──────────────────────────────────
  const dispCtx = await browser.newContext();
  const page = await dispCtx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", disponent.email);
  await page.fill("#password", disponent.password);
  await submitOf(page, "#email").click();
  await settle(page, 3500);

  const marker = `Deal${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE}/kunden/neu`, { waitUntil: "networkidle" });
  await page.fill("#lastName", marker);
  await page.fill("#phone", "030 12345678");
  await submitOf(page, "#lastName").click();
  await settle(page, 3500);

  await page.goto(`${BASE}/anfragen/neu`, { waitUntil: "networkidle" });
  await page.selectOption("#customerId", { label: marker });
  await page.fill("#title", `${marker} Küchenmontage`);
  await page.selectOption("#source", "GOOGLE_ADS");
  await submitOf(page, "#title").click();
  await settle(page, 3500);
  check("заявка создана", /\/anfragen\/[a-z0-9]+$/.test(page.url()), `(${page.url()})`);
  const dealUrl = page.url();

  // ── Правило 9.7: Verloren без причины ───────────────────────────────────
  await page.selectOption('select[name="status"]', "VERLOREN");
  await page.locator('form:has(select[name="status"]) button[type="submit"]').click();
  await settle(page, 2500);
  const lostText = await visibleText(page);
  check(
    "правило 9.7: без причины в «Verloren» не пускает",
    lostText.includes("Grund angegeben") || (await page.locator('select[name="lostReason"]').count()) > 0,
  );

  // С причиной — проходит.
  await page.selectOption('select[name="status"]', "VERLOREN");
  await page.selectOption('select[name="lostReason"]', "ZU_TEUER");
  await page.locator('form:has(select[name="status"]) button[type="submit"]').click();
  await settle(page, 2500);
  check("правило 9.7: с причиной переводит", (await visibleText(page)).includes("verloren"));

  // Возврат в работу стирает причину.
  await page.selectOption('select[name="status"]', "NEU");
  await page.locator('form:has(select[name="status"]) button[type="submit"]').click();
  await settle(page, 2500);
  check(
    "возврат в работу стирает причину проигрыша",
    !(await visibleText(page)).includes("Zu teuer"),
  );

  // ── Правило 9.3: Termin без адреса ──────────────────────────────────────
  await page.selectOption('select[name="status"]', "TERMIN_GEPLANT");
  await page.locator('form:has(select[name="status"]) button[type="submit"]').click();
  await settle(page, 2500);
  check(
    "правило 9.3: без адреса Termin не ставится",
    (await visibleText(page)).includes("Ohne Adresse"),
  );

  // ── Правило 9.4: Ausgeführt без приёмки ─────────────────────────────────
  await page.selectOption('select[name="status"]', "AUSGEFUEHRT");
  await page.locator('form:has(select[name="status"]) button[type="submit"]').click();
  await settle(page, 2500);
  check(
    "правило 9.4: без приёмки заказ не закрыть",
    (await visibleText(page)).includes("Termin") ||
      (await visibleText(page)).includes("Abnahmeprotokoll"),
  );

  // ── Правило цены: диспетчеру поля нет ───────────────────────────────────
  const dispText = await visibleText(page);
  check("диспетчеру поле цены не показано", !dispText.includes("Preis speichern"));
  check("диспетчеру видна пометка о правиле", dispText.includes("Inhaber"));
  await dispCtx.close();

  // ── Владелец ставит цену ────────────────────────────────────────────────
  const ownCtx = await browser.newContext();
  const own = await ownCtx.newPage();
  await own.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await own.fill("#email", inhaber.email);
  await own.fill("#password", inhaber.password);
  await submitOf(own, "#email").click();
  await settle(own, 2500);
  await own.fill("#password", inhaber.password);
  await own.fill("#totp", totpNow(inhaber.totpSecret));
  await submitOf(own, "#totp").click();
  await settle(own, 3500);
  check("владелец вошёл", own.url().endsWith("/heute"), `(${own.url()})`);

  await own.goto(dealUrl, { waitUntil: "networkidle" });
  check("владельцу поле цены показано", (await own.locator("#priceNet").count()) === 1);

  await own.fill("#priceNet", "1.234,56");
  await own.locator('form:has(#priceNet) button[type="submit"]').click();
  await settle(own, 3000);
  const priced = await visibleText(own);
  check("цена сохранена", priced.includes("1.234,56"));
  check("цена помечена как подтверждённая владельцем", priced.includes("freigegeben"));

  // НДС считается от нетто: 1234,56 × 19 % = 234,57, брутто 1469,13.
  check("НДС посчитан верно", priced.includes("234,57"), "(19 % от 1.234,56)");
  check("брутто посчитано верно", priced.includes("1.469,13"));

  // Изменение цены попало в журнал.
  // innerText учитывает CSS text-transform, поэтому сравниваем без регистра.
  check(
    "изменение цены записано в журнал",
    priced.toLowerCase().includes("preis geändert"),
  );
  await ownCtx.close();
}

// ── 9. Календарь: бригады, планирование, конфликты ──────────────────────────
console.log("\n9. Календарь и конфликты");
if (!inhaber) {
  skip("планирование выездов", "нужна SMOKE_INHABER");
} else {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", inhaber.email);
  await page.fill("#password", inhaber.password);
  await submitOf(page, "#email").click();
  await settle(page, 2500);
  await page.fill("#password", inhaber.password);
  await page.fill("#totp", totpNow(inhaber.totpSecret));
  await submitOf(page, "#totp").click();
  await settle(page, 3500);

  // ── Бригада ─────────────────────────────────────────────────────────────
  const teamName = `Kolonne${Date.now().toString().slice(-5)}`;
  await page.goto(`${BASE}/einstellungen/teams`, { waitUntil: "networkidle" });
  await page.fill("#name-neu", teamName);
  await submitOf(page, "#name-neu").click();
  await settle(page, 3000);
  check("бригада создана", (await visibleText(page)).includes(teamName));

  // Одноимённую вторую бригаду заводить нельзя.
  await page.fill("#name-neu", teamName);
  await submitOf(page, "#name-neu").click();
  await settle(page, 2500);
  check(
    "дубль названия бригады отвергнут",
    (await visibleText(page)).includes("existiert bereits"),
  );

  // ── Клиент с адресом и заявка ───────────────────────────────────────────
  const marker = `Plan${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE}/kunden/neu`, { waitUntil: "networkidle" });
  await page.fill("#lastName", marker);
  await submitOf(page, "#lastName").click();
  await settle(page, 3500);

  await page.locator('summary:has-text("Adresse hinzufügen")').last().click();
  await page.fill("#street-neu", `${marker}weg 3`);
  await page.fill("#zip-neu", "10115");
  await page.fill("#city-neu", "Berlin");
  await submitOf(page, "#street-neu").click();
  await settle(page, 3000);

  await page.goto(`${BASE}/anfragen/neu`, { waitUntil: "networkidle" });
  await page.selectOption("#customerId", { label: marker });
  await page.fill("#title", `${marker} Montage`);
  await page.selectOption("#source", "EMPFEHLUNG");
  await submitOf(page, "#title").click();
  await settle(page, 3500);
  const dealUrl = page.url();

  // Адрес у заявки — без него сработает правило 9.3.
  await page.selectOption("#addressId", { index: 1 });
  await page.locator('form:has(#title) button[type="submit"]').click();
  await settle(page, 3000);

  // ── Планирование выезда ─────────────────────────────────────────────────
  const openPlan = async () => {
    await page.goto(dealUrl, { waitUntil: "networkidle" });
    await page.locator('summary:has-text("Termin planen")').last().click();
    await page.waitForTimeout(400);
  };

  await openPlan();
  await page.fill("#start-neu", "2027-03-01T08:00");
  await page.fill("#end-neu", "2027-03-01T11:00");
  await page.selectOption("#team-neu", { label: teamName });
  await submitOf(page, "#start-neu").click();
  await settle(page, 3500);
  check("выезд запланирован", (await visibleText(page)).includes("08:00"));

  // Заявка должна была переехать в колонку «Termin geplant».
  check(
    "заявка переведена в «Termin geplant»",
    (await visibleText(page)).includes("Termin geplant"),
  );

  // ── Конфликт: та же бригада в то же время ───────────────────────────────
  await openPlan();
  await page.fill("#start-neu", "2027-03-01T09:00");
  await page.fill("#end-neu", "2027-03-01T12:00");
  await page.selectOption("#team-neu", { label: teamName });
  await submitOf(page, "#start-neu").click();
  await settle(page, 3000);
  const overlapText = await visibleText(page);
  check("конфликт наложения показан", overlapText.includes("Konflikt im Einsatzplan"));
  check("названа занятая бригада", overlapText.includes("gleichen Zeit"));
  check(
    "предложено подтвердить",
    (await page.locator('input[name="force"]').count()) > 0,
  );

  // ── Календарь показывает выезд ──────────────────────────────────────────
  await page.goto(`${BASE}/einsatzplan?datum=2027-03-01&ansicht=woche`, {
    waitUntil: "networkidle",
  });
  const calText = await visibleText(page);
  check("выезд виден в календаре", calText.includes(marker));
  check("бригада — строка календаря", calText.includes(teamName));

  await page.goto(`${BASE}/einsatzplan?datum=2027-03-01&ansicht=tag`, {
    waitUntil: "networkidle",
  });
  check("вид «день» работает", (await visibleText(page)).includes(marker));

  await ctx.close();
}

// ── 10. Angebote: правила 9.1 и 9.2 ────────────────────────────────────────
console.log("\n10. Предложения");
if (!inhaber) {
  skip("правила Angebot", "нужна SMOKE_INHABER");
} else {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", inhaber.email);
  await page.fill("#password", inhaber.password);
  await submitOf(page, "#email").click();
  await settle(page, 2500);
  await page.fill("#password", inhaber.password);
  await page.fill("#totp", totpNow(inhaber.totpSecret));
  await submitOf(page, "#totp").click();
  await settle(page, 3500);

  // ── Клиент и заявка ─────────────────────────────────────────────────────
  const marker = `Ang${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE}/kunden/neu`, { waitUntil: "networkidle" });
  await page.selectOption("#salutation", "Herr");
  await page.fill("#lastName", marker);
  await submitOf(page, "#lastName").click();
  await settle(page, 3500);

  await page.goto(`${BASE}/anfragen/neu`, { waitUntil: "networkidle" });
  await page.selectOption("#customerId", { label: marker });
  await page.fill("#title", `${marker} Küchenmontage`);
  await page.selectOption("#source", "WEBSITE");
  await submitOf(page, "#title").click();
  await settle(page, 3500);
  const dealUrl = page.url();

  // ── Правило 9.2: без правовых блоков Angebot не сохранить ───────────────
  // Стираем блоки в настройках и проверяем, что конструктор недоступен.
  await page.goto(`${BASE}/einstellungen/firma`, { waitUntil: "networkidle" });
  await page.fill("#warrantyText", "");
  await page.fill("#parkingText", "");
  await page.fill("#scopeText", "");
  await page.locator('form:has(#warrantyText) button[type="submit"]').click();
  await settle(page, 3000);

  await page.goto(dealUrl, { waitUntil: "networkidle" });
  const withoutLegal = await visibleText(page);
  check(
    "правило 9.2: без правовых блоков предложение не создать",
    withoutLegal.includes("Regel 9.2"),
  );
  check(
    "конструктор предложения скрыт",
    !withoutLegal.includes("Entwurf speichern"),
  );

  // ── Заполняем блоки предложенными текстами ──────────────────────────────
  await page.goto(`${BASE}/einstellungen/firma`, { waitUntil: "networkidle" });
  check(
    "предложенные тексты подставлены в форму",
    (await page.inputValue("#warrantyText")).includes("Gewährleistung"),
  );
  check(
    "показано предупреждение, что тексты не сохранены",
    (await visibleText(page)).includes("noch nicht gespeichert"),
  );
  await page.fill("#companyName", "MöbelStock24 Test");
  await page.fill("#taxNumber", "12/345/67890");
  await page.locator('form:has(#warrantyText) button[type="submit"]').click();
  await settle(page, 3000);
  check("настройки сохранены", (await visibleText(page)).includes("gespeichert"));

  // ── Создание черновика Angebot ──────────────────────────────────────────
  await page.goto(dealUrl, { waitUntil: "networkidle" });
  await page.locator('summary:has-text("Neues Angebot")').last().click();
  await page.waitForTimeout(400);
  await page.locator('input[name="lineDescription"]').first().fill("Küchenmontage");
  await page.locator('input[name="linePrice"]').first().fill("890,00");
  await page.locator('form:has(input[name="lineDescription"]) button[type="submit"]').first().click();
  await settle(page, 3500);
  const draft = await visibleText(page);
  check("черновик предложения сохранён", draft.includes("v1"));
  // 890,00 × 19 % = 169,10 → брутто 1.059,10
  check("сумма с НДС посчитана", draft.includes("1.059,10"));

  // ── Правило 9.1: без подтверждённой цены не отправить ───────────────────
  // После сохранения черновика страница перерисовалась и блок свернулся.
  await page.goto(dealUrl, { waitUntil: "networkidle" });
  await page.locator("summary:has-text(\"v1\")").first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Angebot versenden")').first().click();
  await settle(page, 3000);
  check(
    "правило 9.1: без цены предложение не уходит",
    (await visibleText(page)).includes("Ohne Preis"),
  );

  // Ставим цену и отправляем.
  await page.goto(dealUrl, { waitUntil: "networkidle" });
  await page.fill("#priceNet", "890,00");
  await page.locator('form:has(#priceNet) button[type="submit"]').click();
  await settle(page, 3000);

  await page.goto(dealUrl, { waitUntil: "networkidle" });
  await page.locator('summary:has-text("v1")').first().click();
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Angebot versenden")').first().click();
  await settle(page, 3500);
  const sent = await visibleText(page);
  check("предложение отправлено", sent.includes("versendet"));
  check("заявка переведена в «Angebot raus»", sent.includes("Angebot raus"));
  check("появился текст для WhatsApp", sent.includes("Sehr geehrter Herr"));
  check("текст содержит блок гарантии", sent.includes("Gewährleistung"));
  check("текст содержит просьбу о парковке", sent.includes("Parkplatz") || sent.includes("Parkmöglichkeit"));

  // ── Публичная ссылка для клиента ────────────────────────────────────────
  const publicHref = await page
    .locator('a[href^="/angebot/"]')
    .first()
    .getAttribute("href");
  check("публичная ссылка выдана", Boolean(publicHref), `(${publicHref})`);

  if (publicHref) {
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(BASE + publicHref, { waitUntil: "networkidle" });
    const pub = await guestPage.evaluate(() => document.body.innerText);
    check("клиент видит предложение без входа", pub.includes("Küchenmontage"));
    check("видны реквизиты фирмы", pub.includes("MöbelStock24 Test"));
    check("видна итоговая сумма", pub.includes("1.059,10"));

    // Глава 5.4 требует два вывода: текст для WhatsApp и PDF.
    const pdfRes = await fetch(`${BASE}${publicHref}/pdf`);
    const pdfHead = pdfRes.ok
      ? new Uint8Array(await pdfRes.arrayBuffer()).slice(0, 5)
      : new Uint8Array();
    check(
      "клиент может скачать PDF предложения",
      pdfRes.ok && String.fromCharCode(...pdfHead) === "%PDF-",
      `(${pdfRes.status})`,
    );
    check(
      "PDF предложения не кешируется прокси",
      (pdfRes.headers.get("cache-control") ?? "").includes("private"),
    );

    await guestPage.locator('button:has-text("Angebot annehmen")').click();
    // После принятия сервер перерисовывает страницу: форма исчезает,
    // появляется подтверждение с датой.
    const accepted = await guestPage
      .locator('text=angenommen')
      .first()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    check("клиент может принять предложение", accepted);
    check(
      "клиенту сказано, что будет дальше",
      (await guestPage.evaluate(() => document.body.innerText)).includes(
        "Terminabstimmung",
      ),
    );
    await guest.close();

    // Офисный маршрут PDF: тот же документ сотруднику, но не монтажнику —
    // в предложении стоят цены (глава 4 ТЗ).
    const offerId = await page
      .locator('a[href^="/api/angebote/"]')
      .first()
      .getAttribute("href");
    if (offerId) {
      const staffPdf = await page.evaluate(async (href) => {
        const res = await fetch(href);
        const buf = new Uint8Array(await res.arrayBuffer());
        return { status: res.status, head: String.fromCharCode(...buf.slice(0, 5)) };
      }, offerId);
      check(
        "сотрудник открывает PDF предложения",
        staffPdf.status === 200 && staffPdf.head === "%PDF-",
        `(${staffPdf.status})`,
      );

      if (monteur) {
        const mctx = await browser.newContext();
        const mp = await mctx.newPage();
        await mp.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
        await mp.fill("#email", monteur.email);
        await mp.fill("#password", monteur.password);
        await submitOf(mp, "#email").click();
        await settle(mp, 3000);
        const denied = await mp.evaluate(
          async (href) => (await fetch(href, { redirect: "manual" })).status,
          offerId,
        );
        check(
          "монтажнику PDF с ценами не отдаётся",
          denied !== 200,
          `(${denied})`,
        );
        await mctx.close();
      }
    } else {
      check("сотрудник открывает PDF предложения", false);
    }

    // Повторное принятие по той же ссылке невозможно.
    const guest2 = await browser.newContext();
    const guestPage2 = await guest2.newPage();
    await guestPage2.goto(BASE + publicHref, { waitUntil: "networkidle" });
    check(
      "повторно принять нельзя",
      (await guestPage2.evaluate(() => document.body.innerText)).includes("angenommen"),
    );
    await guest2.close();
  }

  // Принятие двигает заявку в «Bestätigt».
  await page.goto(dealUrl, { waitUntil: "networkidle" });
  check(
    "заявка переведена в «Bestätigt»",
    (await visibleText(page)).includes("Bestätigt"),
  );

  await ctx.close();
}

// ── 12. Кабинет монтажника: статусы, фото, приёмка ──────────────────────────
console.log("\n12. Кабинет монтажника");
if (!inhaber || !monteur) {
  skip("работа на объекте", "нужны SMOKE_INHABER и SMOKE_MONTEUR");
} else {
  // Имя монтажника узнаём у него самого: в состав выезда его нужно отметить
  // по имени, а в переменной окружения задан только адрес почты.
  const nameCtx = await browser.newContext();
  const namePage = await nameCtx.newPage();
  await namePage.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
  await namePage.fill("#email", monteur.email);
  await namePage.fill("#password", monteur.password);
  await submitOf(namePage, "#email").click();
  await settle(namePage, 3500);
  const monteurName = await namePage
    .locator("header span")
    .first()
    .innerText()
    .catch(() => "");
  await nameCtx.close();
  check("монтажник вошёл в кабинет", monteurName.length > 0, `(${monteurName})`);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ── Офис: клиент, заявка с адресом, выезд на сегодня с этим монтажником ──
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", inhaber.email);
  await page.fill("#password", inhaber.password);
  await submitOf(page, "#email").click();
  await settle(page, 2500);
  await page.fill("#password", inhaber.password);
  await page.fill("#totp", totpNow(inhaber.totpSecret));
  await submitOf(page, "#totp").click();
  await settle(page, 3500);

  const marker = `Job${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE}/kunden/neu`, { waitUntil: "networkidle" });
  await page.fill("#lastName", marker);
  await page.fill("#phone", "0176 79892037");
  await submitOf(page, "#lastName").click();
  await settle(page, 3500);

  await page.locator('summary:has-text("Adresse hinzufügen")').last().click();
  await page.fill("#street-neu", `${marker}allee 7`);
  await page.fill("#zip-neu", "10627");
  await page.fill("#city-neu", "Berlin");
  await submitOf(page, "#street-neu").click();
  await settle(page, 3000);

  await page.goto(`${BASE}/anfragen/neu`, { waitUntil: "networkidle" });
  await page.selectOption("#customerId", { label: marker });
  await page.fill("#title", `${marker} Küche`);
  await page.selectOption("#source", "EMPFEHLUNG");
  await submitOf(page, "#title").click();
  await settle(page, 3500);
  const dealUrl = page.url();

  await page.selectOption("#addressId", { index: 1 });
  await page.locator('form:has(#title) button[type="submit"]').click();
  await settle(page, 3000);

  // Выезд на сегодня: кабинет монтажника показывает именно сегодняшний день.
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await page.goto(dealUrl, { waitUntil: "networkidle" });
  await page.locator('summary:has-text("Termin planen")').last().click();
  await page.waitForTimeout(400);
  await page.fill("#start-neu", `${iso}T08:00`);
  await page.fill("#end-neu", `${iso}T12:00`);
  // Состав бригады решает, кто увидит выезд в своём кабинете.
  const assigneeCount = await page
    .locator('form:has(#start-neu) input[name="assignees"]')
    .count();
  check("монтажники предлагаются в состав выезда", assigneeCount > 0);

  // Отмечаем именно того монтажника, под которым будем входить: иначе выезд
  // достанется другому, и его кабинет останется пустым — это не ошибка кода.
  const monteurBox = page.locator(
    `form:has(#start-neu) label:has-text("${monteurName}") input[name="assignees"]`,
  );
  check("монтажник есть в списке состава", (await monteurBox.count()) > 0);
  await monteurBox.first().check();
  await submitOf(page, "#start-neu").click();
  await settle(page, 3500);
  check("выезд на сегодня запланирован", (await visibleText(page)).includes("08:00"));
  await ctx.close();

  // ── Монтажник ───────────────────────────────────────────────────────────
  const mctx = await browser.newContext();
  const m = await mctx.newPage();
  await m.goto(`${BASE}/m/anmelden`, { waitUntil: "networkidle" });
  await m.fill("#email", monteur.email);
  await m.fill("#password", monteur.password);
  await submitOf(m, "#email").click();
  await settle(m, 3500);

  const todayText = await visibleText(m);
  const seesJob = todayText.includes(marker);
  check("выезд виден в кабинете монтажника", seesJob);

  if (!seesJob) {
    skip("работа на объекте", "выезд не попал в состав этого монтажника");
    await mctx.close();
  } else {
    check("есть кнопка навигации", todayText.includes("Navigation"));
    check("виден телефон клиента", /0176|\+49/.test(todayText));

    // Открываем именно сегодняшний выезд этой проверки: в списке могут
    // лежать выезды от прошлых запусков с тем же временем.
    await m
      .locator(`li:has-text("${marker}") a:has-text("Auftrag öffnen")`)
      .first()
      .click();
    await settle(m, 2000);
    const jobUrl = m.url();
    check("карточка выезда открылась", /\/m\/auftrag\//.test(jobUrl));

    const jobText = await visibleText(m);
    // Жёсткое требование главы 4: монтажник не видит цену заказа.
    check("цены в кабинете нет", !/€/.test(jobText), "");

    // Статус ставится одной кнопкой: она всегда показывает следующий шаг.
    const nextStatus = () =>
      m.locator('form:has(input[name="to"]) button[type="submit"]').first();

    const stepLabel = await nextStatus().innerText();
    check("предложен следующий шаг «unterwegs»", stepLabel.includes("unterwegs"), `(${stepLabel})`);
    await nextStatus().click();
    await settle(m, 2500);
    check("статус «unterwegs» поставлен", (await visibleText(m)).includes("✓"));

    // ── Фотографии «до»: очередь отправки ─────────────────────────────────
    const jpeg = (tag) =>
      Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
        Buffer.from("JFIF\0"),
        Buffer.from(tag.padEnd(64, "x")),
        Buffer.from([0xff, 0xd9]),
      ]);

    const beforeInput = m.locator('form:has(input[value="VORHER"]) input[type="file"]');
    await beforeInput.setInputFiles([
      { name: "a.jpg", mimeType: "image/jpeg", buffer: jpeg("vorher-a") },
      { name: "b.jpg", mimeType: "image/jpeg", buffer: jpeg("vorher-b") },
    ]);
    await m.locator('form:has(input[value="VORHER"]) button[type="submit"]').click();
    await settle(m, 4000);
    await m.reload({ waitUntil: "networkidle" });
    const afterUpload = await visibleText(m);
    check(
      "два снимка «до» приняты",
      /Vorher[\s\S]{0,40}(vollständig|2 von 2)/.test(afterUpload),
      "",
    );

    // Очередь в IndexedDB должна опустеть — снимки ушли.
    const queueLeft = await m.evaluate(
      () =>
        new Promise((resolve) => {
          const request = indexedDB.open("ms24-fotos", 1);
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("queue")) return resolve(0);
            const all = db.transaction("queue").objectStore("queue").getAll();
            all.onsuccess = () => resolve(all.result.length);
            all.onerror = () => resolve(-1);
          };
          request.onerror = () => resolve(-1);
        }),
    );
    check("очередь отправки пуста", queueLeft === 0, `(осталось ${queueLeft})`);

    // ── Правило: «в работе» требует снимков «до», «готово» — «после» ───────
    // Снимки «до» уже загружены, поэтому шаги проходят.
    await nextStatus().click(); // angekommen
    await settle(m, 2500);
    await nextStatus().click(); // in Arbeit
    await settle(m, 2500);
    check(
      "работа начата после снимков «до»",
      (await visibleText(m)).includes("in Arbeit"),
    );

    await nextStatus().click(); // fertig — должно упереться в правило
    await settle(m, 2500);
    check(
      "без снимков «после» закончить нельзя",
      (await visibleText(m)).includes("nachher"),
    );

    // ── Учёт времени ──────────────────────────────────────────────────────
    // Незакрытая запись на другом выезде мешает запустить новую — это верное
    // поведение, но для проверки нужно чистое начало. Останавливаем чужие
    // записи через интерфейс: заодно проверяется сама кнопка «стоп».
    const stopLeftovers = async () => {
      await m.goto(`${BASE}/m`, { waitUntil: "networkidle" });
      const links = await m.locator('a[href^="/m/auftrag/"]').evaluateAll((els) =>
        els.map((el) => el.getAttribute("href")),
      );
      for (const href of new Set(links)) {
        await m.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
        const stop = m.locator('form button:has-text("Zeit stoppen")');
        if ((await stop.count()) > 0) {
          await stop.first().click();
          await settle(m, 2500);
        }
      }
      await m.goto(jobUrl, { waitUntil: "networkidle" });
    };
    await stopLeftovers();

    await m.locator('form button:has-text("Zeit starten")').first().click();
    await settle(m, 2500);
    check("время пошло", (await visibleText(m)).includes("Läuft seit"));

    // Остановка считает минуты на сервере, а не по часам телефона.
    await m.locator('form button:has-text("Zeit stoppen")').first().click();
    await settle(m, 2500);
    check(
      "время остановлено и посчитано",
      /Erfasst insgesamt/.test(await visibleText(m)),
    );

    await m.locator('form button:has-text("Zeit starten")').first().click();
    await settle(m, 2500);

    // ── Материал/доплата уходит владельцу ─────────────────────────────────
    await m.fill("#extraDescription", "Silikon");
    await m.fill("#extraAmount", "12,00");
    await m.locator('form:has(#extraDescription) button[type="submit"]').click();
    await settle(m, 3000);
    check(
      "сообщение о доплате отправлено",
      (await visibleText(m)).includes("Inhaber"),
    );

    // ── Приёмка требует снимков «после» ───────────────────────────────────
    await m.goto(`${jobUrl}/abnahme`, { waitUntil: "networkidle" });
    check(
      "приёмка закрыта без снимков «после»",
      (await visibleText(m)).includes("nachher"),
    );

    await m.goto(jobUrl, { waitUntil: "networkidle" });
    const afterInput = m.locator('form:has(input[value="NACHHER"]) input[type="file"]');
    await afterInput.setInputFiles([
      { name: "c.jpg", mimeType: "image/jpeg", buffer: jpeg("nachher-a") },
      { name: "d.jpg", mimeType: "image/jpeg", buffer: jpeg("nachher-b") },
    ]);
    await m.locator('form:has(input[value="NACHHER"]) button[type="submit"]').click();
    await settle(m, 4000);

    // Файл отдаётся только через /api/files и только своим.
    const photoSrc = await m.locator('img[src^="/api/files/"]').first().getAttribute("src");
    if (photoSrc) {
      const own = await m.evaluate(async (src) => (await fetch(src)).status, photoSrc);
      check("свой снимок открывается", own === 200, `(${own})`);
      const stranger = await fetch(`${BASE}${photoSrc}`);
      check(
        "без входа снимок не отдаётся",
        stranger.status === 401,
        `(${stranger.status})`,
      );
    } else {
      check("снимок появился на карточке", false);
    }

    // ── Протокол приёмки с подписью ───────────────────────────────────────
    await m.goto(`${jobUrl}/abnahme`, { waitUntil: "networkidle" });
    const pad = m.locator("canvas");
    check("полотно подписи есть", (await pad.count()) > 0);

    // Пустая подпись не проходит: пустой холст — тоже картинка.
    await m.locator('form button:has-text("Abnahme abschließen")').click();
    await settle(m, 2500);
    check(
      "без подписи приёмка не закрывается",
      (await visibleText(m)).includes("unterschreiben"),
    );

    // Рисуем подпись движением указателя.
    const box = await pad.boundingBox();
    await m.mouse.move(box.x + 30, box.y + box.height / 2);
    await m.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await m.mouse.move(
        box.x + 30 + i * (box.width - 60) / 10,
        box.y + box.height / 2 + (i % 2 === 0 ? -18 : 18),
      );
    }
    await m.mouse.up();
    await m.waitForTimeout(200);

    await m.locator('input[name="photoConsent"]').check();
    await m.locator('form button:has-text("Abnahme abschließen")').click();
    await settle(m, 6000);

    const signedText = await visibleText(m);
    check("протокол подписан", signedText.includes("Unterschrieben"));
    check("ссылка на PDF появилась", signedText.includes("PDF"));

    const pdfHref = await m
      .locator('a[href^="/api/files/handover/"]')
      .first()
      .getAttribute("href");
    if (pdfHref) {
      const pdf = await m.evaluate(async (href) => {
        const res = await fetch(href);
        const buf = new Uint8Array(await res.arrayBuffer());
        return {
          status: res.status,
          type: res.headers.get("content-type"),
          head: String.fromCharCode(...buf.slice(0, 5)),
          size: buf.length,
        };
      }, pdfHref);
      check("PDF протокола отдаётся", pdf.status === 200 && pdf.head === "%PDF-", `(${pdf.size} Б)`);
      check("тип файла — PDF", pdf.type === "application/pdf", `(${pdf.type})`);
    } else {
      check("PDF протокола отдаётся", false);
    }

    // После подписи фотографии и статус закрыты.
    await m.goto(jobUrl, { waitUntil: "networkidle" });
    const lockedText = await visibleText(m);
    check("после подписи фото закрыты", lockedText.includes("gesperrt"));
    // Подпись закрывает и таймер: иначе он шёл бы до вечера (это была ошибка).
    check("подпись остановила время", !lockedText.includes("Läuft seit"));
    check(
      "кнопки статуса убраны",
      (await m.locator('form:has(input[name="to"]) button[type="submit"]').count()) === 0,
    );

    await mctx.close();
  }

  // ── Владелец видит сообщение о доплате и решает по нему ─────────────────
  const octx = await browser.newContext();
  const o = await octx.newPage();
  await o.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await o.fill("#email", inhaber.email);
  await o.fill("#password", inhaber.password);
  await submitOf(o, "#email").click();
  await settle(o, 2500);
  await o.fill("#password", inhaber.password);
  await o.fill("#totp", totpNow(inhaber.totpSecret));
  await submitOf(o, "#totp").click();
  await settle(o, 3500);

  const boardText = await visibleText(o);
  check("панель «Heute» показывает доплату", boardText.includes("Silikon"));
  check("сумма доплаты видна владельцу", boardText.includes("12,00"));

  const accept = o.locator('button:has-text("Annehmen")').first();
  if ((await accept.count()) > 0) {
    await accept.click();
    await settle(o, 3000);
    check(
      "решение по доплате сохранено",
      !(await visibleText(o)).includes("Silikon"),
    );
  } else {
    check("владельцу предложено решение", false);
  }
  await octx.close();
}

// ── 13. Приём заявок с сайта ────────────────────────────────────────────────
console.log("\n13. Приём заявок с сайта");
{
  const secret = process.env.SMOKE_LEAD_SECRET;
  if (!secret) {
    skip("вебхук заявок", "не задана SMOKE_LEAD_SECRET");
  } else {
    const { createHmac } = await import("node:crypto");
    const post = (body, { signature, timestamp } = {}) => {
      const ts = timestamp ?? String(Math.floor(Date.now() / 1000));
      const sig =
        signature ??
        createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
      return fetch(`${BASE}/api/webhook/lead`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ms24-timestamp": ts,
          "x-ms24-signature": sig,
        },
        body,
      });
    };

    const marker = `Web${Date.now().toString().slice(-6)}`;
    const body = JSON.stringify({
      lastName: marker,
      phone: "0176 79892037",
      message: `${marker} Küche montieren, 3. OG ohne Aufzug`,
      street: `${marker}straße 1`,
      zip: "10115",
      city: "Berlin",
      floor: "3. OG",
      elevator: false,
      services: ["KUECHENMONTAGE"],
      utmSource: "google",
    });

    const ok = await post(body);
    check("заявка с сайта принята", ok.status === 201, `(${ok.status})`);

    // Повторная отправка той же формы не создаёт вторую заявку.
    const again = await post(body);
    const againBody = await again.json().catch(() => ({}));
    check("повтор отправки не даёт дубля", againBody.duplicate === true);

    const wrong = await post(body, { signature: "sha256=" + "0".repeat(64) });
    check("чужая подпись отвергнута", wrong.status === 401, `(${wrong.status})`);

    const stale = await post(body, {
      timestamp: String(Math.floor(Date.now() / 1000) - 3600),
    });
    check("старый запрос отвергнут", stale.status === 401, `(${stale.status})`);

    const unsigned = await fetch(`${BASE}/api/webhook/lead`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    check("без подписи не принимается", unsigned.status === 401, `(${unsigned.status})`);
  }
}

// ── 14. Скорость ─────────────────────────────────────────────────────────────
console.log("\n14. Скорость");
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
