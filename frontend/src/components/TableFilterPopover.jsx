import React from "react";
import { Icon } from "./primitives.jsx";

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function TableFilterPopover({
  open,
  onOpenChange,
  activeCount = 0,
  iconOnly = false,
  label = "Filter",
  dialogLabel = "Filter tabel",
  className = "",
  triggerClassName = "",
  children,
}) {
  const contentId = React.useId();
  const contentRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const wasOpenRef = React.useRef(open);

  React.useEffect(() => {
    if (wasOpenRef.current && !open) triggerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;
    contentRef.current?.querySelector(focusableSelector)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(contentRef.current?.querySelectorAll(focusableSelector) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => onOpenChange(!open)}
        className={`mobile-compact-control relative z-40 inline-flex items-center rounded-control text-sm font-semibold text-text-muted transition-[background-color,border-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${iconOnly ? "size-11 justify-center border-0 bg-transparent px-0" : "h-9 gap-2 border border-border bg-surface px-3"} ${triggerClassName}`}
      >
        <Icon name="filter" className="size-4" />
        {!iconOnly && label}
        {activeCount > 0 && (
          <span className={`${iconOnly ? "absolute -right-1 -top-1 ring-2 ring-surface" : ""} inline-flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold tabular-nums text-white`}>
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={`Tutup ${label.toLowerCase()}`}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            ref={contentRef}
            id={contentId}
            role="dialog"
            aria-label={dialogLabel}
            className="absolute right-0 top-[calc(100%+8px)] z-40 grid w-[min(22rem,calc(100vw-2rem))] gap-4 rounded-card border border-border bg-surface p-4 shadow-panel"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}
