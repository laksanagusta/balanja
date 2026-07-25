import React from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Button } from "../primitives.jsx";

const layoutTransition = {
  type: "spring",
  duration: 0.32,
  bounce: 0,
};

const enterTransition = {
  duration: 0.16,
  ease: [0.23, 1, 0.32, 1],
};

const exitTransition = {
  duration: 0.12,
  ease: [0.23, 1, 0.32, 1],
};

export function MobileCheckoutPanel({
  expanded,
  onExpand,
  onCollapse,
  grandTotal,
  disabled = false,
  triggerRef,
  children,
}) {
  const shouldReduceMotion = useReducedMotion();
  const headingRef = React.useRef(null);
  const generatedId = React.useId().replaceAll(":", "");
  const detailId = `${generatedId}-mobile-checkout-details`;
  const headingId = `${generatedId}-mobile-checkout-heading`;

  React.useEffect(() => {
    if (!expanded) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [expanded]);

  const hiddenDetailState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 6 };
  const hiddenHeadingState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: expanded ? 3 : -3 };

  return (
    <LayoutGroup id={`${generatedId}-mobile-checkout-layout`}>
      <motion.section
        layout={shouldReduceMotion ? false : "size"}
        transition={layoutTransition}
        aria-label="Pembayaran cart"
        className="mobile-checkout-panel relative z-10 border-t border-border bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]"
      >
        <motion.div
          layout={shouldReduceMotion ? false : "position"}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
        >
          <div className="relative flex min-h-11 min-w-0 items-center">
            <AnimatePresence initial={false} mode="popLayout">
              {expanded ? (
                <motion.h3
                  key="payment-heading"
                  ref={headingRef}
                  id={headingId}
                  tabIndex={-1}
                  initial={hiddenHeadingState}
                  animate={{ opacity: 1, y: 0, transition: enterTransition }}
                  exit={shouldReduceMotion
                    ? { opacity: 0, transition: exitTransition }
                    : { opacity: 0, y: -3, transition: exitTransition }}
                  className="text-base font-semibold text-text outline-none"
                >
                  Ringkasan pembayaran
                </motion.h3>
              ) : (
                <motion.div
                  key="grand-total"
                  initial={hiddenHeadingState}
                  animate={{ opacity: 1, y: 0, transition: enterTransition }}
                  exit={shouldReduceMotion
                    ? { opacity: 0, transition: exitTransition }
                    : { opacity: 0, y: 3, transition: exitTransition }}
                  className="min-w-0"
                >
                  <p className="text-xs font-medium text-text-muted">Grand total</p>
                  <p className="truncate font-mono text-lg font-semibold tabular-nums text-text">{grandTotal}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div layout={shouldReduceMotion ? false : "position"}>
            <Button
              ref={triggerRef}
              type="button"
              variant={expanded ? "secondary" : "primary"}
              size={expanded ? "sm" : "md"}
              className="pos-touch-target min-w-24"
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={expanded ? onCollapse : onExpand}
              disabled={!expanded && disabled}
            >
              {expanded ? "Kembali" : "Bayar"}
            </Button>
          </motion.div>
        </motion.div>

        <AnimatePresence initial={false} mode="popLayout">
          {expanded ? (
            <motion.div
              layout={shouldReduceMotion ? false : "position"}
              key="mobile-checkout-details"
              id={detailId}
              role="region"
              aria-labelledby={headingId}
              initial={hiddenDetailState}
              animate={shouldReduceMotion
                ? { opacity: 1, transition: enterTransition }
                : { opacity: 1, y: 0, transition: enterTransition }}
              exit={{ ...hiddenDetailState, transition: exitTransition }}
              className="mt-3 overflow-hidden border-t border-border pt-3"
            >
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>
    </LayoutGroup>
  );
}
