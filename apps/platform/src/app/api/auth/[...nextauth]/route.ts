/**
 * Обработчик маршрутов Auth.js. Без него нет ни выдачи сессионной куки,
 * ни эндпоинта /api/auth/session, и вход «проходит» на сервере, не создавая
 * сессии в браузере.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
