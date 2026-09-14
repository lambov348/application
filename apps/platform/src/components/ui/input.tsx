import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-linie bg-blatt w-full rounded-[3px] border px-3 py-2 text-sm",
        "placeholder:text-text-2/70",
        "focus:border-blau focus:outline-blau focus:outline-1",
        "disabled:bg-linie-2 disabled:text-text-2",
        "aria-[invalid=true]:border-rot",
        className,
      )}
      {...props}
    />
  );
}
