import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "../primitives.jsx";

const layoutTransition = {
  duration: 0.28,
  ease: [0.2, 0, 0, 1],
};

const detailTransition = {
  duration: 0.14,
  ease: [0.2, 0, 0, 1],
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

  return (
    <motion.section
      layout={!shouldReduceMotion}
      transition={layoutTransition}
      aria-label="Pembayaran cart"
      className="mobile-checkout-panel relative z-10 border-t border-border bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        {expanded ? (
          <h3
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="text-base font-semibold text-text outline-none"
          >
            Ringkasan pembayaran
          </h3>
        ) : (
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">Grand total</p>
            <p className="truncate font-mono text-lg font-semibold tabular-nums text-text">{grandTotal}</p>
          </div>
        )}

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
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="mobile-checkout-details"
            id={detailId}
            role="region"
            aria-labelledby={headingId}
            initial={hiddenDetailState}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={hiddenDetailState}
            transition={detailTransition}
            className="mt-3 overflow-hidden border-t border-border pt-3"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
