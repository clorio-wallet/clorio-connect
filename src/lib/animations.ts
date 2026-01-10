import { Variants } from "framer-motion";

/**
 * Standard animation durations
 */
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

/**
 * Standard easings
 */
export const easing = {
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { type: "spring", stiffness: 400, damping: 30 },
  springGentle: { type: "spring", stiffness: 300, damping: 25 },
  springBouncy: { type: "spring", stiffness: 500, damping: 20 },
} as const;

/**
 * Fade variants
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: duration.normal }
  },
  exit: { 
    opacity: 0,
    transition: { duration: duration.fast }
  },
};

/**
 * Slide up variants (for bottom sheets, toasts)
 */
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: duration.normal,
      ease: easing.easeOut,
    }
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: { duration: duration.fast }
  },
};

/**
 * Slide down variants (for dropdowns)
 */
export const slideDownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: duration.normal,
      ease: easing.easeOut,
    }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    scale: 0.98,
    transition: { duration: duration.fast }
  },
};

/**
 * Scale variants (for modals, cards)
 */
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: easing.spring,
  },
  exit: { 
    opacity: 0, 
    scale: 0.98,
    transition: { duration: duration.fast }
  },
};

/**
 * Stagger children variants
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: duration.normal }
  },
};

/**
 * List item variants (for virtual lists)
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: duration.fast }
  },
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { duration: duration.instant }
  },
};

/**
 * Pulse animation for loading states
 */
export const pulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Skeleton shimmer animation
 */
export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Success checkmark animation
 */
export const checkmarkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: "easeOut" },
      opacity: { duration: 0.1 },
    },
  },
};

/**
 * Number counter animation config
 */
export const counterTransition = {
  duration: 0.8,
  ease: [0.32, 0.72, 0, 1],
};
