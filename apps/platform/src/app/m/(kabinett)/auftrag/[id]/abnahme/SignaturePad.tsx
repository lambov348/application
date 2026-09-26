"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Подпись клиента пальцем на экране (глава 5.6.5 ТЗ).
 *
 * Рисование на canvas указательными событиями: один обработчик на палец,
 * стилус и мышь. Результат уходит в скрытое поле как PNG с прозрачным фоном —
 * поэтому сервер может отличить настоящую подпись от пустого холста.
 *
 * Без JavaScript подпись невозможна в принципе, поэтому страница честно
 * говорит об этом в <noscript> вместо того, чтобы делать вид, что работает.
 */
export function SignaturePad({ name }: { name: string }) {
  const t = useTranslations("handover");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Размер холста в пикселях устройства: иначе на телефоне линия мылится.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1A1F22";
  }, []);

  const pointOf = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointOf(event);
    context.beginPath();
    context.moveTo(x, y);
    // Точка сразу: короткое касание тоже должно оставлять след.
    context.lineTo(x + 0.1, y);
    context.stroke();
    setHasInk(true);
    sync();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    // Страница не должна прокручиваться под пальцем во время подписи.
    event.preventDefault();
    const { x, y } = pointOf(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    sync();
  };

  /** Перенос картинки в скрытое поле — его и отправляет форма. */
  const sync = () => {
    const canvas = canvasRef.current;
    const hidden = hiddenRef.current;
    if (!canvas || !hidden) return;
    hidden.value = canvas.toDataURL("image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    if (hiddenRef.current) hiddenRef.current.value = "";
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        // touch-none обязателен: иначе браузер считает движение прокруткой.
        className="border-linie h-40 w-full touch-none rounded-[3px] border bg-white"
      />
      <input ref={hiddenRef} type="hidden" name={name} />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-text-2 text-xs">
          {hasInk ? t("signatureOk") : t("signatureHint")}
        </span>
        <button
          type="button"
          onClick={clear}
          className="border-linie rounded-[3px] border px-3 py-1.5 text-[13px]"
        >
          {t("signatureClear")}
        </button>
      </div>
    </div>
  );
}
