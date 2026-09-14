import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/guards";
import { landingPageFor } from "@/auth.config";

/** Корень ведёт на рабочую страницу по роли, а не показывает своё содержимое. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? landingPageFor(user.role) : "/login");
}
