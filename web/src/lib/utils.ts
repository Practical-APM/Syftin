import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function hasComplianceScore(
  score: number | null | undefined,
): score is number {
  return score !== null && score !== undefined;
}

export function formatComplianceScore(score: number | null | undefined) {
  return hasComplianceScore(score) ? formatPercent(score) : "Not ready yet";
}
