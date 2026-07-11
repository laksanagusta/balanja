import React from "react";
import { toast } from "sonner";
import { Button } from "../primitives.jsx";

export default function ToastShowcase() {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Toast notifications</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Transient feedback uses Sonner at the app root.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success("Sale completed successfully!")}>
            Success toast
          </Button>
          <Button variant="danger" onClick={() => toast.error("Payment failed. Try again.")}>
            Error toast
          </Button>
          <Button
            variant="ghost"
            onClick={() => toast.warning("Low stock", { description: "Deterjen Bubuk 800g" })}
          >
            Warning toast
          </Button>
        </div>
      </div>
    </div>
  );
}
