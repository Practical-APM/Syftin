import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honey-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" &&
            "bg-honey-500 text-graphite-950 hover:bg-honey-400 active:bg-honey-600 shadow-sm shadow-honey-500/20",
          variant === "secondary" &&
            "bg-graphite-900 text-ivory-50 hover:bg-graphite-800",
          variant === "ghost" &&
            "text-graphite-500 hover:text-graphite-900 hover:bg-ivory-100",
          variant === "outline" &&
            "border border-ivory-200 bg-transparent text-graphite-900 hover:border-honey-500/40 hover:bg-ivory-100",
          size === "sm" && "px-4 py-2 text-sm",
          size === "md" && "px-5 py-2.5 text-sm",
          size === "lg" && "px-7 py-3 text-base",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
