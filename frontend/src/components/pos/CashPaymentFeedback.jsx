import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const enterTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1],
};

const exitTransition = {
  duration: 0.12,
  ease: [0.4, 0, 1, 1],
};

const feedbackContent = {
  change: {
    label: "Kembalian",
    className: "border-success/20 bg-success-soft text-success",
  },
  shortfall: {
    label: "Uang kurang",
    className: "border-danger/20 bg-danger-soft text-danger",
  },
};

export function CashPaymentFeedback({ status, value }) {
  const shouldReduceMotion = useReducedMotion();
  const content = feedbackContent[status];
  const hiddenState = shouldReduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        filter: "blur(2px)",
        transform: "translateY(25%)",
      };
  const exitState = shouldReduceMotion
    ? { opacity: 0, transition: exitTransition }
    : {
        opacity: 0,
        filter: "blur(1.5px)",
        transform: "translateY(-12.5%)",
        transition: exitTransition,
      };

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {content ? (
        <motion.p
          key={status}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={hiddenState}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: "translateY(0)",
            transition: enterTransition,
          }}
          exit={exitState}
          className={`cash-payment-feedback flex items-center justify-between gap-3 rounded-control border px-3 py-2 text-sm font-semibold ${content.className}`}
        >
          <span>{content.label}</span>
          <span className="whitespace-nowrap font-mono tabular-nums">{value}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
