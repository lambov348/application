import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Размеры и цвета взяты из mockup_mobelstock24.html: скругление 3px,
// основное действие — синий var(--blau), плотные отступы.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[3px] font-semibold " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blau",
  {
    variants: {
      variant: {
        default: "bg-blau text-white hover:bg-blau/90",
        ghost: "border border-linie bg-transparent text-blau hover:bg-linie-2",
        danger: "bg-rot text-white hover:bg-rot/90",
        quiet: "text-text-2 hover:text-stahl hover:bg-linie-2",
      },
      size: {
        default: "px-3.5 py-2 text-sm",
        sm: "px-2.5 py-1.5 text-[13px]",
        lg: "px-4 py-2.5 text-[15px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
