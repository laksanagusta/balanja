import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button, Icon } from "../primitives.jsx";

const disclosureSpring = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.82,
};

const blendInTransition = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1],
};

const blendOutTransition = {
  duration: 0.14,
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

  const hiddenBlendState = shouldReduceMotion
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(2px)" };
  const detailTransition = shouldReduceMotion
    ? {
        height: { duration: 0 },
        opacity: blendOutTransition,
      }
    : {
        height: disclosureSpring,
        opacity: expanded
          ? { ...blendInTransition, delay: 0.04 }
          : blendOutTransition,
      };

  return (
    <motion.section
      aria-label="Pembayaran cart"
      className="mobile-checkout-panel relative z-10 bg-surface px-4 py-3 shadow-[0_-10px_22px_-20px_rgb(29_29_31_/_0.32)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="relative min-h-11 min-w-0">
          <AnimatePresence initial={false} mode="sync">
            {expanded ? (
              <motion.h3
                key="payment-heading"
                ref={headingRef}
                id={headingId}
                tabIndex={-1}
                initial={shouldReduceMotion ? hiddenBlendState : { ...hiddenBlendState, y: 3 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: blendInTransition }}
                exit={shouldReduceMotion
                  ? { ...hiddenBlendState, transition: blendOutTransition }
                  : { ...hiddenBlendState, y: 3, transition: blendOutTransition }}
                className="absolute inset-0 flex items-center text-base font-semibold text-text outline-none"
              >
                Ringkasan pembayaran
              </motion.h3>
            ) : (
              <motion.div
                key="grand-total"
                initial={shouldReduceMotion ? hiddenBlendState : { ...hiddenBlendState, y: -3 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0, transition: blendInTransition }}
                exit={shouldReduceMotion
                  ? { ...hiddenBlendState, transition: blendOutTransition }
                  : { ...hiddenBlendState, y: -3, transition: blendOutTransition }}
                className="absolute inset-0 flex min-w-0 flex-col justify-center"
              >
                <p className="text-xs font-medium text-text-muted">Grand total</p>
                <p className="truncate font-mono text-lg font-semibold tabular-nums text-text">{grandTotal}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {expanded && (
          <button
            ref={triggerRef}
            type="button"
            aria-label="Tutup ringkasan pembayaran"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={onCollapse}
            className="pos-touch-target grid size-11 place-items-center rounded-button text-text-muted transition-colors duration-fast ease-standard hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Icon name="x" className="size-5" />
          </button>
        )}
      </div>

      {!expanded && (
        <Button
          ref={triggerRef}
          type="button"
          variant="primary"
          size="md"
          className="mobile-checkout-trigger pos-touch-target mt-3 w-full"
          style={{ transitionProperty: "transform, background-color, border-color, color, box-shadow" }}
          aria-expanded={expanded}
          aria-controls={detailId}
          onClick={onExpand}
          disabled={disabled}
        >
          Bayar
        </Button>
      )}

      <motion.div
        id={detailId}
        role="region"
        aria-labelledby={headingId}
        aria-hidden={!expanded}
        inert={!expanded}
        initial={false}
        animate={{
          height: expanded ? "auto" : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={detailTransition}
        className="overflow-hidden"
      >
        <motion.div
          animate={shouldReduceMotion
            ? { y: 0 }
            : { y: expanded ? 0 : -4 }}
          transition={expanded ? blendInTransition : blendOutTransition}
          className="min-h-0"
        >
          <div className="mt-3 pt-3">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
