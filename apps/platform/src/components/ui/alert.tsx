import { cn } from "@/lib/utils";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "warning" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-rot/40 bg-rot/5 text-rot",
    warning: "border-gelb/50 bg-gelb/10 text-stahl",
    success: "border-gruen/40 bg-gruen/5 text-gruen",
    info: "border-linie bg-linie-2/50 text-stahl",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-[3px] border px-3 py-2 text-sm",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
