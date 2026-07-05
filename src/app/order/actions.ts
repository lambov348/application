"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { saveUploadedFiles } from "@/lib/uploads";
import { SERVICE_TYPES } from "@/lib/constants";

// Схема валидации заявки клиента (проверка на сервере).
const OrderSchema = z.object({
  clientName: z.string().trim().min(2, "Укажите имя"),
  clientContact: z.string().trim().min(5, "Укажите телефон или контакт"),
  serviceType: z.string().trim().min(1, "Выберите услугу"),
  description: z.string().trim().min(5, "Опишите задачу подробнее"),
  address: z.string().trim().min(3, "Укажите адрес"),
  preferredDate: z.string().trim().optional(),
});

export type OrderFormState = { error?: string };

// Создание заявки. Доступно всем (клиент без регистрации).
export async function createOrder(
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  const parsed = OrderSchema.safeParse({
    clientName: formData.get("clientName"),
    clientContact: formData.get("clientContact"),
    serviceType: formData.get("serviceType"),
    description: formData.get("description"),
    address: formData.get("address"),
    preferredDate: formData.get("preferredDate") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }
  const data = parsed.data;

  // Подстраховка: услуга должна быть из известного списка.
  const serviceType = SERVICE_TYPES.includes(data.serviceType)
    ? data.serviceType
    : "Другое";

  // Сохраняем прикреплённые фото (если есть).
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
      logs: {
        create: {
          action: "created",
          note: "Заявка создана клиентом",
        },
      },
    },
  });

  // redirect() бросает исключение — поэтому вне try/catch.
  redirect(`/order/success?id=${request.id}`);
}
