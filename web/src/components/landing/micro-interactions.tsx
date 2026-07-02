"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HoverLift({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("gpu-layer", className)}
    >
      {children}
    </motion.div>
  );
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-honey-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-honey-500" />
    </span>
  );
}
