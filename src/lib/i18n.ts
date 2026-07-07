// Простая i18n без внешних зависимостей: словари + типы + помощники.
// Этот модуль безопасен для клиента (без next/headers).
// Чтение локали из куки — в i18n.server.ts (только сервер).
// По умолчанию — немецкий (бизнес в Германии). Доступны de / en / ru.

export type Locale = "de" | "en" | "ru";

export const LOCALES: Locale[] = ["de", "en", "ru"];
export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  ru: "Русский",
};

// Немецкий словарь — эталонная форма (по нему типизируются остальные).
const de = {
  nav: {
    track: "Anfrage verfolgen",
    order: "Anfrage stellen",
    staffLogin: "Mitarbeiter-Login",
  },
  common: {
    backHome: "Zur Startseite",
    photo: "Foto",
    photosNone: "Keine Fotos",
    logout: "Abmelden",
  },
  home: {
    heroTitle: "Geprüfte Helfer für Möbel und Umzug",
    heroSubtitle:
      "Montage, Transport, Wandmontage und Reinigung. Stellen Sie eine Anfrage — wir finden einen Helfer und bringen die Aufgabe zum Ergebnis.",
    ctaOrder: "Anfrage stellen",
    ctaTrack: "Anfrage verfolgen",
    servicesTitle: "Welchen Service brauchen Sie?",
    howTitle: "So funktioniert es",
    steps: [
      {
        t: "Aufgabe beschreiben",
        d: "Füllen Sie ein kurzes Formular aus: was, wo und wann. Keine Registrierung nötig.",
      },
      {
        t: "Wir weisen einen Helfer zu",
        d: "Der Administrator wählt einen geprüften Helfer und übergibt ihm die Anfrage.",
      },
      {
        t: "Aufgabe erledigt",
        d: "Verfolgen Sie den Status per Anfragenummer — von Eingang bis Erledigung.",
      },
    ],
    trust: [
      {
        t: "Geprüfte Helfer",
        d: "Jeder Helfer wird manuell vom Administrator hinzugefügt.",
      },
      {
        t: "Transparenter Status",
        d: "Sie sehen jederzeit, in welcher Phase Ihre Anfrage ist.",
      },
      {
        t: "Schnelle Reaktion",
        d: "Die Anfrage erreicht den Administrator sofort nach dem Absenden.",
      },
    ],
    footerSuffix: "MöbelStock24 — Transport, Montage und Möbelmontage.",
  },
  services: {
    assembly: {
      title: "Möbelmontage",
      description:
        "Auf- und Abbau von Schränken, Betten, Küchen und IKEA-Möbeln.",
    },
    moving: {
      title: "Umzugshilfe",
      description: "Be- und Entladen, Umzug von Wohnung oder Büro.",
    },
    transport: {
      title: "Transport und Lieferung",
      description: "Lieferung und Transport von Möbeln in der Stadt, inkl. Etage.",
    },
    mounting: {
      title: "Wandmontage",
      description: "Aufhängen von Regalen, Bildern, Spiegeln und Fernsehern.",
    },
    cleaning: {
      title: "Reinigung und Entsorgung",
      description: "Reinigung nach dem Umzug und Entsorgung alter Möbel.",
    },
    repair: {
      title: "Kleine Reparaturen",
      description: "Kleine Reparaturen und Handwerksarbeiten zu Hause.",
    },
  },
  order: {
    title: "Anfrage stellen",
    subtitle:
      "Füllen Sie das Formular aus — keine Registrierung. Nach dem Absenden erhalten Sie eine Anfragenummer zur Verfolgung.",
    nameLabel: "Ihr Name *",
    contactLabel: "Telefon oder Kontakt *",
    serviceLabel: "Art des Services *",
    descriptionLabel: "Aufgabenbeschreibung *",
    descriptionPlaceholder:
      "Was ist zu tun, wie viele Gegenstände, gibt es einen Aufzug usw.",
    addressLabel: "Adresse *",
    dateLabel: "Wunschdatum und -zeit",
    photosLabel: "Fotos (optional)",
    photosHint: "Sie können mehrere Fotos anhängen (bis 8 MB pro Foto).",
    submit: "Anfrage senden",
    submitting: "Senden…",
  },
  success: {
    title: "Anfrage angenommen!",
    text: "Wir haben Ihre Anfrage erhalten und weisen bald einen Helfer zu.",
    numberLabel: "Ihre Anfragenummer",
    saveHint: "Speichern Sie die Nummer — damit können Sie den Status verfolgen.",
    trackBtn: "Anfrage verfolgen",
    homeBtn: "Zur Startseite",
  },
  track: {
    title: "Anfrage verfolgen",
    subtitle: "Geben Sie die Anfragenummer ein, die Sie nach dem Absenden erhalten haben.",
    placeholder: "Zum Beispiel: 3",
    check: "Prüfen",
    notFound: "Anfrage Nr. {id} nicht gefunden. Prüfen Sie die Nummer.",
    requestNo: "Anfrage Nr. {id}",
    service: "Service",
    address: "Adresse",
    preferredDate: "Wunschdatum",
    created: "Erstellt",
  },
  login: {
    title: "Mitarbeiter-Login",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    submitting: "Anmeldung…",
    error: "Falsche E-Mail oder falsches Passwort",
    fillBoth: "E-Mail und Passwort eingeben",
  },
  status: {
    new: "Neu",
    assigned: "Zugewiesen",
    in_progress: "In Arbeit",
    done: "Erledigt",
    cancelled: "Storniert",
  },
  taskStatus: {
    assigned: "Annehmen",
    in_progress: "In Arbeit",
    done: "Erledigt",
  },
  admin: {
    badge: "Admin",
    navRequests: "Anfragen",
    navWorkers: "Helfer",
    sumNew: "Neu",
    sumAssigned: "Zugewiesen",
    sumInProgress: "In Arbeit",
    sumDone: "Erledigt",
    filterAll: "Alle",
    thNo: "Nr.",
    thClient: "Kunde",
    thService: "Service",
    thWorker: "Helfer",
    thStatus: "Status",
    thCreated: "Erstellt",
    empty: "Keine Anfragen",
    // Karte einer Anfrage
    backToRequests: "Zu allen Anfragen",
    clientData: "Kundendaten",
    fName: "Name",
    fContact: "Kontakt",
    fAddress: "Adresse",
    fPreferredDate: "Wunschdatum",
    fCreated: "Erstellt",
    description: "Aufgabenbeschreibung",
    clientPhotos: "Fotos vom Kunden",
    workerWork: "Arbeit des Helfers",
    worker: "Helfer",
    taskStatusLabel: "Aufgabenstatus",
    workerComment: "Kommentar des Helfers",
    resultPhotos: "Ergebnis-Fotos",
    history: "Verlauf",
    assignTitle: "Helfer zuweisen",
    chooseWorker: "Helfer auswählen",
    assign: "Zuweisen",
    reassign: "Neu zuweisen",
    noWorkers: "Keine aktiven Helfer.",
    addLink: "Hinzufügen",
    statusTitle: "Anfragestatus",
    saveStatus: "Status speichern",
    noteTitle: "Interne Notiz",
    notePlaceholder: "Notiz nur für Mitarbeiter sichtbar",
    addNote: "Notiz hinzufügen",
  },
  workers: {
    title: "Helfer",
    thName: "Name",
    thEmail: "E-Mail",
    thTasks: "Aufgaben",
    thStatus: "Status",
    active: "Aktiv",
    disabled: "Deaktiviert",
    disable: "Deaktivieren",
    enable: "Aktivieren",
    empty: "Noch keine Helfer",
    addTitle: "Helfer hinzufügen",
    nameLabel: "Name",
    emailLabel: "E-Mail (Login)",
    passwordLabel: "Passwort",
    passwordHint: "mindestens 6 Zeichen",
    addBtn: "Hinzufügen",
    errName: "Namen angeben",
    errEmail: "Ungültige E-Mail",
    errPassword: "Passwort mindestens 6 Zeichen",
    errExists: "Ein Benutzer mit dieser E-Mail existiert bereits",
    added: "Helfer {name} hinzugefügt",
  },
  worker: {
    badge: "Helfer",
    title: "Meine Aufgaben",
    activeOf: "Aktive Aufgaben: {open} von {total}",
    empty: "Ihnen wurde noch keine Aufgabe zugewiesen.",
    requestNo: "Anfrage Nr. {id}",
    fClient: "Kunde",
    fContact: "Kontakt",
    fAddress: "Adresse",
    fPreferredDate: "Wunschdatum",
    description: "Aufgabenbeschreibung",
    clientPhotos: "Fotos vom Kunden",
    uploadedResults: "Hochgeladene Ergebnis-Fotos",
    statusLabel: "Status",
    resultPhotosLabel: "Ergebnis-Fotos",
    commentLabel: "Kommentar",
    commentPlaceholder: "Kommentar zur Aufgabe (optional)",
    currentComment: "Aktueller Kommentar: {comment}",
    save: "Speichern",
  },
  orderErrors: {
    name: "Namen angeben",
    contact: "Telefon oder Kontakt angeben",
    service: "Service auswählen",
    description: "Aufgabe genauer beschreiben",
    address: "Adresse angeben",
    generic: "Bitte prüfen Sie die Felder",
  },
  log: {
    created: "Anfrage erstellt",
    assigned: "Helfer zugewiesen",
    statusChanged: "Status geändert",
    workerUpdate: "Kommentar oder Fotos aktualisiert",
  },
};

export type Messages = typeof de;

const en: Messages = {
  nav: {
    track: "Track request",
    order: "New request",
    staffLogin: "Staff login",
  },
  common: {
    backHome: "Back to home",
    photo: "Photo",
    photosNone: "No photos",
    logout: "Log out",
  },
  home: {
    heroTitle: "Vetted helpers for furniture and moving",
    heroSubtitle:
      "Assembly, transport, wall mounting and cleaning. Submit a request — we'll find a helper and get the job done.",
    ctaOrder: "New request",
    ctaTrack: "Track request",
    servicesTitle: "Which service do you need?",
    howTitle: "How it works",
    steps: [
      {
        t: "Describe the task",
        d: "Fill a short form: what, where and when. No registration required.",
      },
      {
        t: "We assign a helper",
        d: "The administrator picks a vetted helper and hands over the request.",
      },
      {
        t: "Task done",
        d: "Track the status by request number — from intake to completion.",
      },
    ],
    trust: [
      {
        t: "Vetted helpers",
        d: "Every helper is added manually by the administrator.",
      },
      {
        t: "Transparent status",
        d: "You can see which stage your request is at any time.",
      },
      {
        t: "Fast response",
        d: "The request reaches the administrator right after you submit it.",
      },
    ],
    footerSuffix: "MöbelStock24 — furniture transport, assembly and mounting.",
  },
  services: {
    assembly: {
      title: "Furniture assembly",
      description:
        "Assembly and disassembly of wardrobes, beds, kitchens and IKEA furniture.",
    },
    moving: {
      title: "Moving help",
      description: "Loading, unloading and moving an apartment or office.",
    },
    transport: {
      title: "Transport and delivery",
      description: "Delivery and transport of furniture across the city, incl. floor.",
    },
    mounting: {
      title: "Wall mounting",
      description: "Hanging shelves, pictures, mirrors and TVs.",
    },
    cleaning: {
      title: "Cleaning and removal",
      description: "Cleaning after a move and removal of old furniture.",
    },
    repair: {
      title: "Minor repairs",
      description: "Small home repairs and minor handyman work.",
    },
  },
  order: {
    title: "New request",
    subtitle:
      "Fill the form — no registration. After submitting you'll get a request number to track it.",
    nameLabel: "Your name *",
    contactLabel: "Phone or contact *",
    serviceLabel: "Service type *",
    descriptionLabel: "Task description *",
    descriptionPlaceholder:
      "What needs to be done, how many items, is there an elevator, etc.",
    addressLabel: "Address *",
    dateLabel: "Preferred date and time",
    photosLabel: "Photos (optional)",
    photosHint: "You can attach several photos (up to 8 MB each).",
    submit: "Send request",
    submitting: "Sending…",
  },
  success: {
    title: "Request accepted!",
    text: "We received your request and will assign a helper soon.",
    numberLabel: "Your request number",
    saveHint: "Save the number — you can track the status with it.",
    trackBtn: "Track request",
    homeBtn: "Back to home",
  },
  track: {
    title: "Track request",
    subtitle: "Enter the request number you received after submitting.",
    placeholder: "For example: 3",
    check: "Check",
    notFound: "Request No. {id} not found. Check the number.",
    requestNo: "Request No. {id}",
    service: "Service",
    address: "Address",
    preferredDate: "Preferred date",
    created: "Created",
  },
  login: {
    title: "Staff login",
    email: "E-mail",
    password: "Password",
    submit: "Sign in",
    submitting: "Signing in…",
    error: "Wrong e-mail or password",
    fillBoth: "Enter e-mail and password",
  },
  status: {
    new: "New",
    assigned: "Assigned",
    in_progress: "In progress",
    done: "Done",
    cancelled: "Cancelled",
  },
  taskStatus: {
    assigned: "Accept",
    in_progress: "In progress",
    done: "Done",
  },
  admin: {
    badge: "Admin",
    navRequests: "Requests",
    navWorkers: "Helpers",
    sumNew: "New",
    sumAssigned: "Assigned",
    sumInProgress: "In progress",
    sumDone: "Done",
    filterAll: "All",
    thNo: "No.",
    thClient: "Client",
    thService: "Service",
    thWorker: "Helper",
    thStatus: "Status",
    thCreated: "Created",
    empty: "No requests",
    backToRequests: "To all requests",
    clientData: "Client data",
    fName: "Name",
    fContact: "Contact",
    fAddress: "Address",
    fPreferredDate: "Preferred date",
    fCreated: "Created",
    description: "Task description",
    clientPhotos: "Photos from client",
    workerWork: "Helper's work",
    worker: "Helper",
    taskStatusLabel: "Task status",
    workerComment: "Helper's comment",
    resultPhotos: "Result photos",
    history: "History",
    assignTitle: "Assign a helper",
    chooseWorker: "Choose a helper",
    assign: "Assign",
    reassign: "Reassign",
    noWorkers: "No active helpers.",
    addLink: "Add",
    statusTitle: "Request status",
    saveStatus: "Save status",
    noteTitle: "Internal note",
    notePlaceholder: "Note visible to staff only",
    addNote: "Add note",
  },
  workers: {
    title: "Helpers",
    thName: "Name",
    thEmail: "E-mail",
    thTasks: "Tasks",
    thStatus: "Status",
    active: "Active",
    disabled: "Disabled",
    disable: "Disable",
    enable: "Enable",
    empty: "No helpers yet",
    addTitle: "Add a helper",
    nameLabel: "Name",
    emailLabel: "E-mail (login)",
    passwordLabel: "Password",
    passwordHint: "at least 6 characters",
    addBtn: "Add",
    errName: "Enter a name",
    errEmail: "Invalid e-mail",
    errPassword: "Password at least 6 characters",
    errExists: "A user with this e-mail already exists",
    added: "Helper {name} added",
  },
  worker: {
    badge: "Helper",
    title: "My tasks",
    activeOf: "Active tasks: {open} of {total}",
    empty: "You have no assigned tasks yet.",
    requestNo: "Request No. {id}",
    fClient: "Client",
    fContact: "Contact",
    fAddress: "Address",
    fPreferredDate: "Preferred date",
    description: "Task description",
    clientPhotos: "Photos from client",
    uploadedResults: "Uploaded result photos",
    statusLabel: "Status",
    resultPhotosLabel: "Result photos",
    commentLabel: "Comment",
    commentPlaceholder: "Comment on the task (optional)",
    currentComment: "Current comment: {comment}",
    save: "Save",
  },
  orderErrors: {
    name: "Enter a name",
    contact: "Enter a phone or contact",
    service: "Choose a service",
    description: "Describe the task in more detail",
    address: "Enter an address",
    generic: "Please check the form fields",
  },
  log: {
    created: "Request created",
    assigned: "Helper assigned",
    statusChanged: "Status changed",
    workerUpdate: "Comment or photos updated",
  },
};

const ru: Messages = {
  nav: {
    track: "Отследить заявку",
    order: "Оставить заявку",
    staffLogin: "Вход для сотрудников",
  },
  common: {
    backHome: "На главную",
    photo: "Фото",
    photosNone: "Фото нет",
    logout: "Выйти",
  },
  home: {
    heroTitle: "Проверенные исполнители для мебели и переезда",
    heroSubtitle:
      "Сборка, перевозка, монтаж и уборка. Оставьте заявку — мы подберём исполнителя и доведём задачу до результата.",
    ctaOrder: "Оставить заявку",
    ctaTrack: "Отследить заявку",
    servicesTitle: "Какая услуга вам нужна?",
    howTitle: "Как это работает",
    steps: [
      {
        t: "Опишите задачу",
        d: "Заполните короткую форму: что нужно, где и когда. Регистрация не требуется.",
      },
      {
        t: "Мы назначим исполнителя",
        d: "Администратор подберёт проверенного исполнителя и передаст ему заявку.",
      },
      {
        t: "Задача выполнена",
        d: "Отслеживайте статус по номеру заявки — от поступления до выполнения.",
      },
    ],
    trust: [
      {
        t: "Проверенные исполнители",
        d: "Каждый исполнитель добавляется вручную администратором.",
      },
      {
        t: "Прозрачный статус",
        d: "Видно, на каком этапе ваша заявка в любой момент.",
      },
      {
        t: "Быстрый отклик",
        d: "Заявка попадает к администратору сразу после отправки.",
      },
    ],
    footerSuffix: "MöbelStock24 — перевозка, сборка и монтаж мебели.",
  },
  services: {
    assembly: {
      title: "Сборка мебели",
      description: "Сборка и разборка шкафов, кроватей, кухонь и мебели IKEA.",
    },
    moving: {
      title: "Помощь с переездом",
      description: "Погрузка, разгрузка и переезд квартиры или офиса.",
    },
    transport: {
      title: "Перевозка и доставка",
      description: "Доставка и перевозка мебели по городу с подъёмом на этаж.",
    },
    mounting: {
      title: "Монтаж на стену",
      description: "Навеска полок, картин, зеркал и телевизоров.",
    },
    cleaning: {
      title: "Уборка и вынос",
      description: "Уборка после переезда и вынос старой мебели.",
    },
    repair: {
      title: "Мелкий ремонт",
      description: "Небольшой домашний ремонт и мелкие бытовые работы.",
    },
  },
  order: {
    title: "Оставить заявку",
    subtitle:
      "Заполните форму — регистрация не нужна. После отправки вы получите номер заявки для отслеживания.",
    nameLabel: "Ваше имя *",
    contactLabel: "Телефон или контакт *",
    serviceLabel: "Тип услуги *",
    descriptionLabel: "Описание задачи *",
    descriptionPlaceholder:
      "Что нужно сделать, сколько предметов, есть ли лифт и т.д.",
    addressLabel: "Адрес *",
    dateLabel: "Желаемые дата и время",
    photosLabel: "Фото (по желанию)",
    photosHint: "Можно прикрепить несколько фото (до 8 МБ каждое).",
    submit: "Отправить заявку",
    submitting: "Отправка…",
  },
  success: {
    title: "Заявка принята!",
    text: "Мы получили вашу заявку и скоро назначим исполнителя.",
    numberLabel: "Номер вашей заявки",
    saveHint: "Сохраните номер — по нему можно отслеживать статус.",
    trackBtn: "Отследить заявку",
    homeBtn: "На главную",
  },
  track: {
    title: "Отследить заявку",
    subtitle: "Введите номер заявки, который вы получили после отправки.",
    placeholder: "Например: 3",
    check: "Проверить",
    notFound: "Заявка № {id} не найдена. Проверьте номер.",
    requestNo: "Заявка № {id}",
    service: "Услуга",
    address: "Адрес",
    preferredDate: "Желаемая дата",
    created: "Создана",
  },
  login: {
    title: "Вход для сотрудников",
    email: "Email",
    password: "Пароль",
    submit: "Войти",
    submitting: "Вход…",
    error: "Неверный email или пароль",
    fillBoth: "Введите email и пароль",
  },
  status: {
    new: "Новая",
    assigned: "Назначена",
    in_progress: "В работе",
    done: "Выполнена",
    cancelled: "Отменена",
  },
  taskStatus: {
    assigned: "Принять в работе",
    in_progress: "В работе",
    done: "Выполнено",
  },
  admin: {
    badge: "Админ",
    navRequests: "Заявки",
    navWorkers: "Исполнители",
    sumNew: "Новые",
    sumAssigned: "Назначены",
    sumInProgress: "В работе",
    sumDone: "Выполнены",
    filterAll: "Все",
    thNo: "№",
    thClient: "Клиент",
    thService: "Услуга",
    thWorker: "Исполнитель",
    thStatus: "Статус",
    thCreated: "Создана",
    empty: "Заявок нет",
    backToRequests: "Ко всем заявкам",
    clientData: "Данные клиента",
    fName: "Имя",
    fContact: "Контакт",
    fAddress: "Адрес",
    fPreferredDate: "Желаемая дата",
    fCreated: "Создана",
    description: "Описание задачи",
    clientPhotos: "Фото от клиента",
    workerWork: "Работа исполнителя",
    worker: "Исполнитель",
    taskStatusLabel: "Статус задачи",
    workerComment: "Комментарий исполнителя",
    resultPhotos: "Фото результата",
    history: "История изменений",
    assignTitle: "Назначить исполнителя",
    chooseWorker: "Выберите исполнителя",
    assign: "Назначить",
    reassign: "Переназначить",
    noWorkers: "Нет активных исполнителей.",
    addLink: "Добавить",
    statusTitle: "Статус заявки",
    saveStatus: "Сохранить статус",
    noteTitle: "Внутренняя заметка",
    notePlaceholder: "Заметка видна только сотрудникам",
    addNote: "Добавить заметку",
  },
  workers: {
    title: "Исполнители",
    thName: "Имя",
    thEmail: "Email",
    thTasks: "Задач",
    thStatus: "Статус",
    active: "Активен",
    disabled: "Отключён",
    disable: "Отключить",
    enable: "Включить",
    empty: "Исполнителей пока нет",
    addTitle: "Добавить исполнителя",
    nameLabel: "Имя",
    emailLabel: "Email (логин)",
    passwordLabel: "Пароль",
    passwordHint: "минимум 6 символов",
    addBtn: "Добавить",
    errName: "Укажите имя",
    errEmail: "Некорректный email",
    errPassword: "Пароль минимум 6 символов",
    errExists: "Пользователь с таким email уже существует",
    added: "Исполнитель {name} добавлен",
  },
  worker: {
    badge: "Исполнитель",
    title: "Мои задачи",
    activeOf: "Активных задач: {open} из {total}",
    empty: "Вам пока не назначено ни одной задачи.",
    requestNo: "Заявка № {id}",
    fClient: "Клиент",
    fContact: "Контакт",
    fAddress: "Адрес",
    fPreferredDate: "Желаемая дата",
    description: "Описание задачи",
    clientPhotos: "Фото от клиента",
    uploadedResults: "Загруженные фото результата",
    statusLabel: "Статус",
    resultPhotosLabel: "Фото результата",
    commentLabel: "Комментарий",
    commentPlaceholder: "Комментарий по задаче (по желанию)",
    currentComment: "Текущий комментарий: {comment}",
    save: "Сохранить",
  },
  orderErrors: {
    name: "Укажите имя",
    contact: "Укажите телефон или контакт",
    service: "Выберите услугу",
    description: "Опишите задачу подробнее",
    address: "Укажите адрес",
    generic: "Проверьте поля формы",
  },
  log: {
    created: "Заявка создана",
    assigned: "Назначен исполнитель",
    statusChanged: "Статус изменён",
    workerUpdate: "Комментарий или фото обновлены",
  },
};

const dictionaries: Record<Locale, Messages> = { de, en, ru };

export function getDict(locale: Locale): Messages {
  return dictionaries[locale];
}

// Подстановка {ключей} в строку перевода.
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

// Рендер записи истории по коду действия (см. actions).
export function renderLog(
  action: string,
  note: string | null,
  t: Messages
): string {
  switch (action) {
    case "created":
      return t.log.created;
    case "assigned":
      return note ? `${t.log.assigned}: ${note}` : t.log.assigned;
    case "status_changed": {
      const label = note && note in t.status ? t.status[note as keyof typeof t.status] : note;
      return label ? `${t.log.statusChanged}: ${label}` : t.log.statusChanged;
    }
    case "worker_update":
      return t.log.workerUpdate;
    case "note":
      return note ?? "";
    default:
      return note ?? action;
  }
}
