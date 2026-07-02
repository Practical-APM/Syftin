"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      autoRaf: true,
      anchors: { offset: -80 },
    });

    document.documentElement.classList.add("lenis", "lenis-smooth");

    return () => {
      lenis.destroy();
      document.documentElement.classList.remove("lenis", "lenis-smooth");
    };
  }, []);

  return <>{children}</>;
}
