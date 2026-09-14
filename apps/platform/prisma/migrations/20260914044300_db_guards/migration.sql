-- Инварианты, которые должна держать сама база, а не только код приложения.
-- Расширение Prisma Client можно обойти сырым SQL, скриптом миграции данных
-- или psql; ограничение и триггер обойти нельзя.

-- ─── Журнал действий: только вставка (глава 4 ТЗ) ────────────────────────────
CREATE OR REPLACE FUNCTION "activityLogAppendOnly"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'ActivityLog ist unveraenderlich (append-only): Operation % ist nicht erlaubt', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "ActivityLog_append_only"
  BEFORE UPDATE OR DELETE ON "ActivityLog"
  FOR EACH ROW EXECUTE FUNCTION "activityLogAppendOnly"();

-- ─── Настройки: ровно одна строка ───────────────────────────────────────────
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_singleton" CHECK ("id" = 1);

-- ─── Правило 9.7: проигранная сделка обязана иметь причину ──────────────────
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_lost_requires_reason"
  CHECK ("status" <> 'VERLOREN' OR "lostReason" IS NOT NULL);

-- ─── Осмысленность денежных и временных величин ─────────────────────────────
-- Ставка НДС — базисные пункты, 0..100 %.
ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_vat_rate_range" CHECK ("vatRateBp" BETWEEN 0 AND 10000);
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_vat_rate_range" CHECK ("vatRateBp" BETWEEN 0 AND 10000);
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_vat_rate_range" CHECK ("defaultVatRateBp" BETWEEN 0 AND 10000);

-- Версия Angebot нумеруется с единицы.
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_version_positive" CHECK ("version" >= 1);

-- Выезд не может кончаться раньше, чем начался.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_end_after_start" CHECK ("endAt" > "startAt");

-- Учёт времени: закрытый интервал не может идти вспять.
ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_end_after_start"
  CHECK ("endAt" IS NULL OR "endAt" >= "startAt");

-- Минимумы фото и зазор между выездами — неотрицательные величины.
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_non_negative"
  CHECK ("minPhotosBefore" >= 0 AND "minPhotosAfter" >= 0 AND "travelBufferMinutes" >= 0);
