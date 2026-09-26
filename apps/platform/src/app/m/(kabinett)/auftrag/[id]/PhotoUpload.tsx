"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PhotoKind } from "@prisma/client";
import { uploadPhotoAction, type JobState } from "../../actions";
import {
  countWaiting,
  enqueue,
  flushQueue,
  queueSupported,
} from "@/lib/photo-queue";
import { MAX_UPLOAD_BYTES } from "@/lib/storage/limits";
import { Alert } from "@/components/ui/alert";

/**
 * Фотографии «до» и «после» с очередью отправки (глава 5.6.4 ТЗ).
 *
 * Работает на двух уровнях:
 *   без JavaScript — обычная форма, снимок уходит серверным действием;
 *   с JavaScript — снимок сразу ложится в IndexedDB и уходит в фоне.
 *     Связь пропала в подвале — очередь дожмёт позже, в том числе после
 *     закрытия страницы.
 */
export function PhotoUpload({
  appointmentId,
  kind,
  have,
  need,
  locked,
}: {
  appointmentId: string;
  kind: PhotoKind;
  have: number;
  need: number;
  locked: boolean;
}) {
  const t = useTranslations("monteur");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Путь без JavaScript: то же действие, те же проверки на сервере.
  const [state, formAction] = useActionState<JobState, FormData>(
    uploadPhotoAction,
    {},
  );

  const [queued, setQueued] = useState(0);
  const [sending, startSending] = useTransition();
  const [failed, setFailed] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);

  /** Отправка очереди и обновление счётчиков. */
  const pump = () => {
    startSending(async () => {
      const result = await flushQueue();
      setQueued(await countWaiting(appointmentId));
      setFailed(result.rejected.map((r) => r.reason));
      setOffline(result.waiting > 0);
      // Снимки на сервере — страница должна показать их количество.
      if (result.sent > 0) router.refresh();
    });
  };

  // При открытии экрана дожимаем то, что осталось с прошлого раза, и ждём
  // возвращения связи. На объекте сеть появляется и исчезает сама.
  useEffect(() => {
    if (!queueSupported()) return;
    void countWaiting(appointmentId).then(setQueued);
    pump();

    const onOnline = () => pump();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // Очередь недоступна — пусть работает обычная отправка формы.
    if (!queueSupported()) return;

    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) return;

    event.preventDefault();

    void (async () => {
      const tooLarge: string[] = [];
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          tooLarge.push(
            t("photoTooLarge", { mb: Math.round(MAX_UPLOAD_BYTES / 1024 / 1024) }),
          );
          continue;
        }
        await enqueue({
          clientKey: crypto.randomUUID(),
          appointmentId,
          kind,
          blob: file,
        });
      }
      if (inputRef.current) inputRef.current.value = "";
      setFailed(tooLarge);
      setQueued(await countWaiting(appointmentId));
      pump();
    })();
  };

  const enough = have >= need;

  return (
    <div className="border-linie rounded-[3px] border p-3">
      <div className="mb-2 flex items-baseline gap-2">
        <b className="text-sm">
          {kind === "VORHER"
            ? t("photosBefore")
            : kind === "NACHHER"
              ? t("photosAfter")
              : t("photosDamage")}
        </b>
        <span
          className={
            enough ? "text-gruen text-[12px]" : "text-text-2 text-[12px]"
          }
        >
          {enough && need > 0
            ? t("photosDone")
            : t("photosHave", { have, need })}
        </span>
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {failed.length > 0 && <Alert tone="error">{failed.join(" · ")}</Alert>}

      {queued > 0 && (
        <Alert tone={offline ? "warning" : "info"}>
          {offline
            ? t("queueOffline")
            : sending
              ? t("queueSending")
              : t("queueWaiting", { count: queued })}
        </Alert>
      )}

      {!locked && (
        <form action={formAction} onSubmit={onSubmit}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="kind" value={kind} />
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept="image/*"
            capture="environment"
            multiple
            className="mb-2 block w-full text-[13px]"
          />
          <button
            type="submit"
            className="border-linie w-full rounded-[3px] border px-3 py-2 text-sm font-semibold"
          >
            {t("upload")}
          </button>
        </form>
      )}
    </div>
  );
}
