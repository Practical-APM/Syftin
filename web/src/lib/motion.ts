export const easeOut = [0.22, 1, 0.36, 1] as const;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};
