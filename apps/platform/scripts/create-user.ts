/**
 * Создание пользователя из командной строки.
 *
 * Нужен для самого первого входа: в базе пусто, зайти некому, а сидов с
 * выдуманными людьми в проекте нет намеренно — это настоящая система с
 * настоящими сотрудниками.
 *
 * Запуск:
 *   npm run create-user
 *   docker compose run --rm app npm run create-user
 *
 * Пароль вводится скрыто и в истории команд не остаётся.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient, type Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, validatePasswordStrength } from "../src/lib/password";

const ROLES: Role[] = ["INHABER", "DISPONENT", "MONTEUR", "BUCHHALTUNG"];

const ROLE_HINTS: Record<Role, string> = {
  INHABER: "владелец: видит всё, единственный ставит цены, обязателен 2FA",
  DISPONENT: "диспетчер: заявки, календарь, Angebot. Не видит прибыль",
  MONTEUR: "монтажник: только свои выезды, цену заказа не видит",
  BUCHHALTUNG: "бухгалтер: счета и экспорт (появится в Этапе 2)",
};

// Управляющие символы терминала.
const KEY_ENTER = "\r";
const KEY_NEWLINE = "\n";
const KEY_CTRL_C = String.fromCharCode(3);
const KEY_CTRL_D = String.fromCharCode(4);
const KEY_BACKSPACE = String.fromCharCode(127);
const KEY_BACKSPACE_ALT = String.fromCharCode(8);

/**
 * Ввод работает в двух режимах.
 *
 * С терминала — обычный диалог, пароль без эха. Без терминала (конвейер,
 * `docker compose run` без -it, скрипт провижининга) readline закрывается
 * раньше, чем успевает ответить, поэтому весь ввод читается разом и
 * разбирается построчно.
 */
const interactive = Boolean(stdin.isTTY);

let pipedLines: string[] = [];
let pipedIndex = 0;

async function readAllStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

const rl = interactive
  ? createInterface({ input: stdin, output: stdout })
  : null;

function nextPipedLine(): string {
  if (pipedIndex >= pipedLines.length) {
    throw new Error(
      "Ввод закончился раньше, чем вопросы. " +
        "Ожидается по строке на каждый вопрос: имя, email, номер роли, " +
        "телефон, пароль, повтор пароля.",
    );
  }
  return pipedLines[pipedIndex++] ?? "";
}

async function ask(question: string): Promise<string> {
  if (!rl) {
    const answer = nextPipedLine();
    stdout.write(`${question}${answer}\n`);
    return answer;
  }
  return rl.question(question);
}

/** Ввод без эха: пароль не должен остаться на экране и в прокрутке. */
async function askHidden(question: string): Promise<string> {
  if (!rl) {
    stdout.write(`${question}(скрыто)\n`);
    return nextPipedLine();
  }

  stdout.write(question);
  const wasRaw = stdin.isRaw ?? false;
  stdin.setRawMode?.(true);

  return new Promise((resolve) => {
    let value = "";

    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");

      if (char === KEY_ENTER || char === KEY_NEWLINE || char === KEY_CTRL_D) {
        stdin.setRawMode?.(wasRaw);
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (char === KEY_CTRL_C) {
        stdout.write("\n");
        process.exit(130);
      }

      if (char === KEY_BACKSPACE || char === KEY_BACKSPACE_ALT) {
        value = value.slice(0, -1);
        return;
      }

      // Отсекаем управляющие последовательности: стрелки и прочие клавиши.
      if (char >= " ") value += char;
    };

    stdin.on("data", onData);
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL не задан. Заполните .env и повторите.");
    process.exit(1);
  }

  if (!interactive) {
    pipedLines = (await readAllStdin()).split("\n");
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await db.user.count();
    console.log(
      existing === 0
        ? "\nВ базе пока нет ни одного пользователя. Создаём первого.\n"
        : `\nВ базе уже ${existing} пользователей. Добавляем ещё одного.\n`,
    );

    const name = (await ask("Имя и фамилия: ")).trim();
    if (!name) throw new Error("Имя не может быть пустым");

    const email = (await ask("Email (он же логин): "))
      .trim()
      .toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error(`Не похоже на email: ${email}`);
    }
    if (await db.user.findUnique({ where: { email } })) {
      throw new Error(`Пользователь с email ${email} уже существует`);
    }

    console.log("\nРоли:");
    ROLES.forEach((r, i) => console.log(`  ${i + 1}. ${r} — ${ROLE_HINTS[r]}`));
    const roleAnswer = (await ask("\nНомер роли: ")).trim();
    const role = ROLES[Number(roleAnswer) - 1];
    if (!role) throw new Error(`Нет роли под номером ${roleAnswer}`);

    const phone = (await ask("Телефон (можно пропустить): ")).trim();

    const password = await askHidden(
      "Пароль (минимум 12 символов, ввод скрыт): ",
    );
    const weak = validatePasswordStrength(password);
    if (weak) throw new Error(weak);

    const repeat = await askHidden("Повторите пароль: ");
    if (password !== repeat) throw new Error("Пароли не совпадают");

    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role,
        passwordHash: await hashPassword(password),
      },
    });

    // Создание пользователя — событие для журнала. Автор — командная строка,
    // поэтому userId пуст: живого инициатора у этого действия нет.
    await db.activityLog.create({
      data: {
        entity: "User",
        entityId: user.id,
        userId: null,
        action: "user.created_via_cli",
        diff: { role: [null, role], email: [null, email] },
      },
    });

    console.log(`\nСоздан ${role}: ${name} <${email}>`);

    if (role === "INHABER") {
      console.log(
        "\nВажно: роль INHABER не пускает в систему без второго фактора.\n" +
          "При первом входе откроется настройка 2FA — понадобится приложение\n" +
          "Google Authenticator, Aegis, 1Password или подобное.\n",
      );
    }
  } finally {
    rl?.close();
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    `\nОшибка: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
