export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export const SPRING_SNAPPY = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const;

export const SPRING_MARK = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
} as const;

export const PAGE_TRANSITION = {
  duration: 0.22,
  ease: EASE_OUT_EXPO,
} as const;

export const DIRECTIONAL_SHIFT_PX = 18;
