import type { Role } from "@prisma/client";

/**
 * Расширение типов Auth.js.
 *
 * Важно: расширяется именно "@auth/core/types", а не "next-auth". Пакет
 * next-auth не объявляет эти интерфейсы, а ре-экспортирует их псевдонимами
 * типов — расширение "next-auth" создало бы отдельный интерфейс, который ни с
 * чем не сливается, и поля приезжали бы как пустой объект.
 */
declare module "@auth/core/types" {
  interface User {
    role: Role;
    /** Отметка отзыва сессий в миллисекундах эпохи. */
    sessionsValidFrom: number;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      sessionsValidFrom: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    sessionsValidFrom?: number;
  }
}

export {};
