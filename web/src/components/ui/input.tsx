import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }
>(({ className, mono, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("app-input", mono && "font-mono", className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }
>(({ className, mono, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn("app-input resize-y", mono && "font-mono text-xs", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn("app-input app-select", className)}
      {...props}
    />
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400"
      strokeWidth={2}
      aria-hidden
    />
  </div>
));
Select.displayName = "Select";

export function FieldLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-graphite-900 dark:text-ivory-50", className)}
    >
      {children}
    </label>
  );
}

export function FieldHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("mt-0.5 text-xs text-graphite-500 dark:text-graphite-300", className)}>
      {children}
    </p>
  );
}

export function FieldGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>;
}
