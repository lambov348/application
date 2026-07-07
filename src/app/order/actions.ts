"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { saveUploadedFiles } from "@/lib/uploads";
import { isServiceSlug, SERVICE_SLUGS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n.server";

export type OrderFormState = { error?: string };

// Создание заявки. Доступно всем (клиент без регистрации).
export async function createOrder(
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const { t } = await getI18n();

  // Валидация с сообщениями на текущем языке.
  const schema = z.object({
    clientName: z.string().trim().min(2, t.orderErrors.name),
    clientContact: z.string().trim().min(5, t.orderErrors.contact),
    serviceType: z.string().trim().min(1, t.orderErrors.service),
    description: z.string().trim().min(5, t.orderErrors.description),
    address: z.string().trim().min(3, t.orderErrors.address),
    preferredDate: z.string().trim().optional(),
  });

  const parsed = schema.safeParse({
    clientName: formData.get("clientName"),
    clientContact: formData.get("clientContact"),
    serviceType: formData.get("serviceType"),
    description: formData.get("description"),
    address: formData.get("address"),
    preferredDate: formData.get("preferredDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.orderErrors.generic };
  }
  const data = parsed.data;

  // Услуга хранится как стабильный слаг; подпись подставляется по языку.
  const serviceType = isServiceSlug(data.serviceType)
    ? data.serviceType
    : SERVICE_SLUGS[0];

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File);
  const photoPaths = await saveUploadedFiles(files);

  const preferredDate =
    data.preferredDate && data.preferredDate.length > 0
      ? new Date(data.preferredDate)
      : null;

  const request = await prisma.request.create({
    data: {
      clientName: data.clientName,
      clientContact: data.clientContact,
      serviceType,
      description: data.description,
      address: data.address,
      preferredDate,
      photos: JSON.stringify(photoPaths),
      status: "new",
      logs: { create: { action: "created" } },
    },
  });

  redirect(`/order/success?id=${request.id}`);
}
