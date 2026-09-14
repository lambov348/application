/**
 * Правила перевода заявки между колонками канбана.
 *
 * Глава 5.2 ТЗ описывает доску с перетаскиванием, то есть свободным
 * перемещением карточек: диспетчер должен иметь возможность вернуть заявку
 * назад, если поторопился. Поэтому запрещающих переходов здесь почти нет —
 * зато есть жёсткие условия из главы 9, которые нельзя обойти.
 *
 * Что именно запрещает глава 9 на уровне заявки:
 *
 *   правило 9.3 — нельзя поставить Termin без адреса и фамилии клиента;
 *   правило 9.4 — нельзя закрыть заказ как «Ausgeführt» без фото «после»
 *                 и без протокола приёмки;
 *   правило 9.7 — заявку нельзя удалить, только перевести в «Verloren»
 *                 с указанием причины.
 *
 * Правило 9.1 (нельзя отправить Angebot без цены, подтверждённой владельцем)
 * живёт не здесь: оно про отправку предложения, а не про колонку доски.
 */
import type { DealStatus, LostReason, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { BOARD_STATUSES, LOST_STATUS, ALL_STATUSES, LOST_REASONS } from "@/lib/deals";

// Справочники живут в @/lib/deals — модуле без зависимостей: их импортируют
// и клиентские формы, а этот файл тянет за собой Prisma.
export { BOARD_STATUSES, LOST_STATUS, ALL_STATUSES, LOST_REASONS };

/** Отказ в переводе с понятной причиной и кодом для словаря интерфейса. */
export class TransitionDenied extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TransitionDenied";
  }
}

export type DealForTransition = {
  id: string;
  status: DealStatus;
  addressId: string | null;
  customer: { lastName: string | null; company: string | null };
};

/**
 * Проверка условий перевода. Чистая часть — без обращений к базе, чтобы её
 * можно было покрыть тестами без поднятого PostgreSQL.
 */
export function checkTransitionSync(
  deal: DealForTransition,
  to: DealStatus,
  input: { lostReason?: LostReason | null },
): TransitionDenied | null {
  if (deal.status === to) return null;

  // Правило 9.7: проигранная заявка обязана иметь причину.
  if (to === LOST_STATUS && !input.lostReason) {
    return new TransitionDenied(
      "lost_reason_required",
      "Für «Verloren» muss ein Grund angegeben werden",
    );
  }

  // Правило 9.3: Termin невозможен без адреса и без того, как зовут клиента.
  if (to === "TERMIN_GEPLANT") {
    if (!deal.addressId) {
      return new TransitionDenied(
        "address_required",
        "Ohne Adresse kann kein Termin geplant werden",
      );
    }
    if (!deal.customer.lastName && !deal.customer.company) {
      return new TransitionDenied(
        "customer_name_required",
        "Ohne Nachname oder Firma des Kunden kann kein Termin geplant werden",
      );
    }
  }

  return null;
}

/**
 * Полная проверка, включая обращения к базе.
 *
 * Правило 9.4 требует фотографии «после» и подписанный протокол приёмки.
 * И то и другое появляется в кабинете монтажника, поэтому до его постройки
 * колонка «Ausgeführt» недостижима — и это правильно: система не должна
 * позволять объявить работу сданной, когда приёмки не было.
 */
export async function checkTransition(
  deal: DealForTransition,
  to: DealStatus,
  input: { lostReason?: LostReason | null },
  client: PrismaClient | typeof db = db,
): Promise<TransitionDenied | null> {
  const sync = checkTransitionSync(deal, to, input);
  if (sync) return sync;

  if (to === "AUSGEFUEHRT" && deal.status !== "AUSGEFUEHRT") {
    const settings = await client.settings.findUnique({ where: { id: 1 } });
    const minPhotos = settings?.minPhotosAfter ?? 2;

    const appointments = await client.appointment.findMany({
      where: { dealId: deal.id },
      select: {
        id: true,
        handover: { select: { signedAt: true } },
        _count: { select: { photos: true } },
        photos: { where: { kind: "NACHHER" }, select: { id: true } },
      },
    });

    if (appointments.length === 0) {
      return new TransitionDenied(
        "no_appointment",
        "Ohne geplanten Termin kann der Auftrag nicht als ausgeführt gelten",
      );
    }

    const withHandover = appointments.filter((a) => a.handover?.signedAt);
    if (withHandover.length === 0) {
      return new TransitionDenied(
        "handover_required",
        "Ohne unterschriebenes Abnahmeprotokoll kann der Auftrag nicht abgeschlossen werden",
      );
    }

    const photosAfter = appointments.reduce(
      (sum, a) => sum + a.photos.length,
      0,
    );
    if (photosAfter < minPhotos) {
      return new TransitionDenied(
        "photos_after_required",
        `Es werden mindestens ${minPhotos} Fotos „nachher“ benötigt, vorhanden: ${photosAfter}`,
      );
    }
  }

  return null;
}

/**
 * Что записать в заявку вместе со сменой статуса.
 * Возврат из «Verloren» стирает причину: иначе в карточке останется
 * «слишком дорого» у заявки, которая снова в работе.
 */
export function statusSideEffects(
  to: DealStatus,
  input: { lostReason?: LostReason | null; lostNote?: string | null },
): { status: DealStatus; lostReason: LostReason | null; lostNote: string | null } {
  if (to === LOST_STATUS) {
    return {
      status: to,
      lostReason: input.lostReason ?? null,
      lostNote: input.lostNote?.trim() || null,
    };
  }
  return { status: to, lostReason: null, lostNote: null };
}
