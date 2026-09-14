import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/server/auth/guards";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Авторитетная проверка: активен ли пользователь и не отозваны ли сессии.
  const user = await requireUser();
  const pathname = (await headers()).get("x-pathname") ?? "/heute";
  const t = await getTranslations("nav");

  // Заголовок страницы подбираем по первому сегменту пути.
  const segment = pathname.split("/")[1] ?? "heute";
  const titles: Record<string, string> = {
    heute: t("heute"),
    kunden: t("kunden"),
    einstellungen: t("benutzer"),
  };

  return (
    <AppShell
      user={user}
      pathname={pathname}
      title={titles[segment] ?? t("heute")}
    >
      {children}
    </AppShell>
  );
}
