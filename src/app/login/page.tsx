import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

// Вход для сотрудников (админ и исполнители). Клиентам вход не нужен.
export default async function LoginPage() {
  // Уже авторизованных отправляем в их кабинет.
  const user = await getSession();
  if (user) redirect(user.role === "admin" ? "/admin" : "/worker");

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="text-2xl">🛋️</span>
          <span className="text-lg font-bold text-brand">MöbelStock24</span>
        </Link>
        <h1 className="mb-4 text-center text-xl font-bold text-gray-900">
          Вход для сотрудников
        </h1>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            ← На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
