import { REQUEST_STATUS_STYLES, RequestStatus } from "@/lib/constants";
import { getI18n } from "@/lib/i18n.server";

// Единый бейдж статуса заявки — подпись из словаря текущего языка.
export default async function StatusBadge({ status }: { status: string }) {
  const { t } = await getI18n();
  const key: RequestStatus =
    status in REQUEST_STATUS_STYLES ? (status as RequestStatus) : "new";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLES[key]}`}
    >
      {t.status[key]}
    </span>
  );
}
