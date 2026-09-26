/**
 * Предлагаемые тексты правовых блоков Angebot.
 *
 * ВАЖНО: это предложение, а не данные. В базу ничего из этого файла не
 * попадает само — тексты подставляются в форму настроек как значения по
 * умолчанию, и владелец обязан их прочитать и нажать «Сохранить».
 *
 * Почему так: блоки говорят от лица фирмы и обещают клиенту гарантию.
 * Записать такое в базу без прочтения человеком нельзя. Пока блоки пусты,
 * правило 9.2 ТЗ не даёт сохранить ни одного Angebot — это намеренно.
 *
 * Формулировки не заменяют юриста. Перед первой отправкой клиенту их стоит
 * показать своему Steuerberater или адвокату.
 */

export type LegalBlockKey = "warrantyText" | "parkingText" | "scopeText";

/**
 * Глава 5.4 ТЗ: «автоматически всегда добавляются блоки — гарантия 1 год
 * на монтажные работы, просьба о парковке, оговорка о согласованном объёме».
 */
export const PROPOSED_LEGAL_TEXTS: Record<LegalBlockKey, string> = {
  warrantyText:
    "Auf unsere Montagearbeiten gewähren wir eine Gewährleistung von " +
    "12 Monaten ab Abnahme. Ausgenommen sind Mängel an gelieferten Bauteilen " +
    "sowie Schäden durch unsachgemäßen Gebrauch.",

  parkingText:
    "Bitte halten Sie am Tag der Montage eine Parkmöglichkeit in " +
    "unmittelbarer Nähe frei. Ist dies nicht möglich, teilen Sie uns das " +
    "bitte vorab mit — Parkgebühren oder längere Tragewege können " +
    "zusätzliche Kosten verursachen.",

  scopeText:
    "Der Preis gilt für den oben beschriebenen Umfang. Zusätzliche " +
    "Leistungen, die vor Ort beauftragt werden, werden nach Aufwand " +
    "berechnet und vorher mit Ihnen abgestimmt. Das Angebot ist 14 Tage gültig.",
};

/**
 * Оговорка режима Kleinunternehmer по §19 UStG.
 * Добавляется в документ автоматически, когда НДС не начисляется.
 */
export const KLEINUNTERNEHMER_NOTE =
  "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";
