import React from "react";
import { Button, Toast } from "../primitives.jsx";

export default function ToastShowcase() {
  const [toasts, setToasts] = React.useState([]);

  const addToast = (variant, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, variant, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Toast notifications</h3>
      <div className="rounded-panel border border-border bg-surface p-4">
        <p className="mb-3 text-sm text-text-muted">Transient feedback for actions.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => addToast("success", "Order placed successfully!")}>
            Success toast
          </Button>
          <Button variant="danger" onClick={() => addToast("error", "Payment failed. Try again.")}>
            Error toast
          </Button>
          <Button variant="ghost" onClick={() => addToast("warning", "Low stock: Nasi Goreng")}>
            Warning toast
          </Button>
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 grid gap-2">
          {toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
