-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INHABER', 'DISPONENT', 'MONTEUR', 'BUCHHALTUNG');

-- CreateEnum
CREATE TYPE "TaxMode" AS ENUM ('REGELBESTEUERUNG', 'KLEINUNTERNEHMER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PRIVAT', 'FIRMA');

-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('DE', 'EN', 'RU', 'RO');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MOEBELMONTAGE', 'KUECHENMONTAGE', 'DEMONTAGE', 'TRANSPORT', 'UMZUG', 'ENTSORGUNG', 'REPARATUR', 'GERAETEANSCHLUSS', 'ARBEITSPLATTE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'GOOGLE_ADS', 'WHATSAPP', 'INSTAGRAM', 'KLEINANZEIGEN', 'TIKTOK', 'TELEFON', 'EMAIL', 'EMPFEHLUNG', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('NEU', 'DATEN_FEHLEN', 'ANGEBOT_RAUS', 'NACHFASSEN', 'BESTAETIGT', 'TERMIN_GEPLANT', 'AUSGEFUEHRT', 'RECHNUNG', 'BEZAHLT', 'VERLOREN');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('ZU_TEUER', 'GUENSTIGER_ANBIETER', 'ANDERS_ENTSCHIEDEN', 'KEINE_ANTWORT', 'NICHT_UNSER_PROFIL');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ENTWURF', 'GESENDET', 'ANGENOMMEN', 'ABGELEHNT', 'ERSETZT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('GEPLANT', 'UNTERWEGS', 'ANGEKOMMEN', 'IN_ARBEIT', 'FERTIG', 'ABGESAGT');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('VORHER', 'NACHHER', 'SCHADEN');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('STUNDE', 'STUECK', 'PAUSCHALE', 'QM', 'LFM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locale" "Lang" NOT NULL DEFAULT 'DE',
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMPTZ(3),
    "sessionsValidFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'PRIVAT',
    "salutation" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "language" "Lang" NOT NULL DEFAULT 'DE',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedAt" TIMESTAMPTZ(3),
    "anonymizedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "floor" TEXT,
    "elevator" BOOLEAN NOT NULL DEFAULT false,
    "parkingNote" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressId" TEXT,
    "title" TEXT NOT NULL,
    "services" "ServiceType"[] DEFAULT ARRAY[]::"ServiceType"[],
    "source" "LeadSource" NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "firstResponseAt" TIMESTAMPTZ(3),
    "status" "DealStatus" NOT NULL DEFAULT 'NEU',
    "lostReason" "LostReason",
    "lostNote" TEXT,
    "priceNetCents" INTEGER,
    "vatRateBp" INTEGER NOT NULL DEFAULT 1900,
    "priceApproved" BOOLEAN NOT NULL DEFAULT false,
    "priceApprovedAt" TIMESTAMPTZ(3),
    "priceApprovedById" TEXT,
    "estHours" DECIMAL(5,2),
    "estMonteure" INTEGER,
    "notes" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "language" "Lang" NOT NULL DEFAULT 'DE',
    "status" "OfferStatus" NOT NULL DEFAULT 'ENTWURF',
    "totalNetCents" INTEGER NOT NULL,
    "vatRateBp" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "totalGrossCents" INTEGER NOT NULL,
    "warrantyText" TEXT NOT NULL,
    "parkingText" TEXT NOT NULL,
    "scopeText" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "pdfKey" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "acceptToken" TEXT,
    "acceptedAt" TIMESTAMPTZ(3),
    "acceptedIp" TEXT,
    "declinedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(10,3) NOT NULL,
    "unit" "PriceUnit" NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineNetCents" INTEGER NOT NULL,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "PriceUnit" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "service" "ServiceType",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "teamId" TEXT,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'GEPLANT',
    "dispatcherNote" TEXT,
    "reminderSentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAssignee" (
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AppointmentAssignee_pkey" PRIMARY KEY ("appointmentId","userId")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3),
    "minutes" INTEGER,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "PhotoKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "remarks" TEXT,
    "signatureKey" TEXT NOT NULL,
    "photoConsent" BOOLEAN NOT NULL,
    "pdfKey" TEXT,
    "signedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT '',
    "companyStreet" TEXT NOT NULL DEFAULT '',
    "companyZip" TEXT NOT NULL DEFAULT '',
    "companyCity" TEXT NOT NULL DEFAULT '',
    "companyEmail" TEXT NOT NULL DEFAULT '',
    "companyPhone" TEXT NOT NULL DEFAULT '',
    "taxNumber" TEXT,
    "vatId" TEXT,
    "taxMode" "TaxMode" NOT NULL DEFAULT 'REGELBESTEUERUNG',
    "defaultVatRateBp" INTEGER NOT NULL DEFAULT 1900,
    "hourlyRateCents" INTEGER,
    "warrantyText" TEXT NOT NULL DEFAULT '',
    "parkingText" TEXT NOT NULL DEFAULT '',
    "scopeText" TEXT NOT NULL DEFAULT '',
    "travelBufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "minPhotosBefore" INTEGER NOT NULL DEFAULT 2,
    "minPhotosAfter" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_idx" ON "RecoveryCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "Customer_lastName_idx" ON "Customer"("lastName");

-- CreateIndex
CREATE INDEX "Customer_company_idx" ON "Customer"("company");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_number_key" ON "Deal"("number");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "Deal_source_idx" ON "Deal"("source");

-- CreateIndex
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");

-- CreateIndex
CREATE INDEX "Deal_createdAt_idx" ON "Deal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_acceptToken_key" ON "Offer"("acceptToken");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_dealId_version_key" ON "Offer"("dealId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OfferItem_offerId_position_key" ON "OfferItem"("offerId", "position");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_active_sort_idx" ON "ServiceCatalogItem"("active", "sort");

-- CreateIndex
CREATE INDEX "Appointment_startAt_idx" ON "Appointment"("startAt");

-- CreateIndex
CREATE INDEX "Appointment_teamId_startAt_idx" ON "Appointment"("teamId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_dealId_idx" ON "Appointment"("dealId");

-- CreateIndex
CREATE INDEX "AppointmentAssignee_userId_idx" ON "AppointmentAssignee"("userId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startAt_idx" ON "TimeEntry"("userId", "startAt");

-- CreateIndex
CREATE INDEX "TimeEntry_appointmentId_idx" ON "TimeEntry"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPhoto_clientKey_key" ON "JobPhoto"("clientKey");

-- CreateIndex
CREATE INDEX "JobPhoto_appointmentId_kind_idx" ON "JobPhoto"("appointmentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Handover_appointmentId_key" ON "Handover"("appointmentId");

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_idx" ON "ActivityLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_priceApprovedById_fkey" FOREIGN KEY ("priceApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignee" ADD CONSTRAINT "AppointmentAssignee_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAssignee" ADD CONSTRAINT "AppointmentAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
