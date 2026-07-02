import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SyftinLogoProps = {
  className?: string;
  variant?: "light" | "dark";
  showWordmark?: boolean;
  size?: "sm" | "md";
};

export function SyftinLogo({
  className,
  variant = "dark",
  showWordmark = true,
  size = "md",
}: SyftinLogoProps) {
  const iconSize = size === "sm" ? 28 : 32;

  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/syftin-192.png"
        alt="Syftin"
        width={iconSize}
        height={iconSize}
        className="shrink-0 rounded-md"
        priority
      />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight",
            size === "sm" ? "text-base" : "text-lg",
            variant === "dark" ? "text-graphite-900 dark:text-ivory-50" : "text-ivory-50",
          )}
        >
          Syftin
        </span>
      )}
    </Link>
  );
}
