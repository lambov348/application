import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_STYLES,
  RequestStatus,
} from "@/lib/constants";

// Единый бейдж статуса заявки — одинаково выглядит у всех ролей.
export default function StatusBadge({ status }: { status: string }) {
  const key = (status as RequestStatus) in REQUEST_STATUS_LABELS
    ? (status as RequestStatus)
    : "new";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS_STYLES[key]}`}
    >
      {REQUEST_STATUS_LABELS[key]}
    </span>
  );
}
