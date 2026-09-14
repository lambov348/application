import { getTranslations, getFormatter } from "next-intl/server";
import { requireRole } from "@/server/auth/guards";
import { listUsers } from "@/server/queries/users";
import { CreateUserForm, EditUserForm } from "./UserForms";

export default async function BenutzerPage() {
  // Управление сотрудниками — только владелец (глава 4 ТЗ).
  const actor = await requireRole("INHABER");
  const users = await listUsers();
  const t = await getTranslations("users");
  const format = await getFormatter();

  return (
    <div className="max-w-4xl">
      <div className="border-linie bg-blatt mb-6 overflow-hidden rounded-[3px] border">
        <table className="w-full text-sm">
          <thead className="border-linie bg-beton border-b text-left">
            <tr>
              <th className="px-4 py-2 font-semibold">{t("name")}</th>
              <th className="px-4 py-2 font-semibold">{t("role")}</th>
              <th className="px-4 py-2 font-semibold">{t("twoFactor")}</th>
              <th className="px-4 py-2 font-semibold">{t("lastLogin")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-linie-2 border-b align-top">
                <td colSpan={4} className="p-0">
                  <details>
                    <summary className="hover:bg-beton/60 grid cursor-pointer grid-cols-4 px-4 py-2">
                      <span>
                        <b className={user.active ? "" : "text-text-2 line-through"}>
                          {user.name}
                        </b>
                        <span className="text-text-2 block text-xs">
                          {user.email}
                        </span>
                      </span>
                      <span>{t(`roles.${user.role}`)}</span>
                      <span className={user.twoFactorEnabled ? "text-gruen" : "text-text-2"}>
                        {user.twoFactorEnabled ? t("on") : t("off")}
                      </span>
                      <span className="text-text-2">
                        {user.lastLoginAt
                          ? // Хранится UTC, показывается Europe/Berlin.
                            format.dateTime(user.lastLoginAt, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : t("never")}
                      </span>
                    </summary>
                    <EditUserForm user={user} isSelf={user.id === actor.id} />
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserForm />
    </div>
  );
}
