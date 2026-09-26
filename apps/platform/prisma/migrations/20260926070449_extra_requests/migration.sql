-- CreateEnum
CREATE TYPE "ExtraKind" AS ENUM ('MATERIAL', 'ZEIT');

-- CreateEnum
CREATE TYPE "ExtraStatus" AS ENUM ('OFFEN', 'ANGENOMMEN', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "ExtraRequest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "ExtraKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER,
    "extraMinutes" INTEGER,
    "status" "ExtraStatus" NOT NULL DEFAULT 'OFFEN',
    "reportedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtraRequest_status_createdAt_idx" ON "ExtraRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExtraRequest_appointmentId_idx" ON "ExtraRequest"("appointmentId");

-- AddForeignKey
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Проверки уровня базы: интерфейс можно обойти, таблицу — нет.

-- У материала должна быть сумма, у дополнительного времени — минуты.
-- Иначе владельцу приходит сообщение, по которому нечего решать.
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_kind_requires_value"
  CHECK (
    ("kind" = 'MATERIAL' AND "amountCents" IS NOT NULL) OR
    ("kind" = 'ZEIT'     AND "extraMinutes" IS NOT NULL)
  );

-- Отрицательных сумм и отрицательного времени не бывает.
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_values_non_negative"
  CHECK (
    ("amountCents"  IS NULL OR "amountCents"  >= 0) AND
    ("extraMinutes" IS NULL OR "extraMinutes" >= 0)
  );

-- Решение владельца всегда с автором и временем: журнал должен отвечать
-- на вопрос «кто и когда согласовал доплату».
ALTER TABLE "ExtraRequest" ADD CONSTRAINT "ExtraRequest_decision_complete"
  CHECK (
    ("status" = 'OFFEN' AND "decidedById" IS NULL AND "decidedAt" IS NULL) OR
    ("status" <> 'OFFEN' AND "decidedById" IS NOT NULL AND "decidedAt" IS NOT NULL)
  );
