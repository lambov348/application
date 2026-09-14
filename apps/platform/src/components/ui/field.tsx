import * as React from "react";
import { cn } from "@/lib/utils";

/** Подпись + поле + текст ошибки. Ошибка связана с полем через aria. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-text-2 mt-1 text-xs">{hint}</p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-rot mt-1 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
