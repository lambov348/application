import { signOut } from "@/auth";

/** Выход. Только POST: по ссылке из письма выкинуть сотрудника нельзя. */
export async function POST() {
  await signOut({ redirectTo: "/login" });
}
