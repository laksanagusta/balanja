import React from "react";
import { Badge, Button, Icon } from "../primitives.jsx";

const sampleCart = [
  {
    name: "Chicken Teriyaki Bowl",
    category: "Main Course",
    price: 7.99,
    qty: 2,
    image: "/images/chicken-teriyaki-bowl.png",
    addons: ["Extra Chili (+$0.50)", "Add Egg (+$1.00)"],
  },
  {
    name: "Hot Americano",
    category: "Drinks",
    price: 2.80,
    qty: 2,
    image: "/images/hot-americano.png",
    addons: [],
  },
  {
    name: "BBQ Chicken Wings",
    category: "Appetizers",
    price: 7.99,
    qty: 1,
    image: "/images/bbq-chicken-wings.png",
    addons: ["Extra Dip (+$0.50)"],
  },
  {
    name: "Pad Thai Chicken",
    category: "Noodles & Rice",
    price: 4.20,
    qty: 1,
    image: "/images/pad-thai-chicken.png",
    addons: ["Extra Chili (+$0.50)", "Peanuts (+$0.75)"],
  },
];

export function CartRow({ item, subtotal, onUpdateQty, onRemove }) {
  return (
    <div className="flex items-start gap-4 px-4 py-4">
      {item.image ? (
        <img
          src={item.image}
          alt=""
          className="mt-0.5 size-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="mt-0.5 grid size-14 shrink-0 place-items-center rounded-lg border border-border bg-surface-muted text-text-muted">
          <Icon name="barcode" className="size-6" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{item.name}</p>
            {item.category && <p className="text-xs text-text-muted">{item.category}</p>}
          </div>
          {subtotal && (
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text">
              {subtotal}
            </span>
          )}
        </div>
        {item.addons?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.addons.map((a) => (
              <span
                key={a}
                className="inline-flex items-center rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted"
              >
                {a}
              </span>
            ))}
          </div>
        )}
        {(onUpdateQty || onRemove) && (
          <div className="mt-3 flex items-center gap-3">
            {onUpdateQty && (
              <div className="flex h-8 items-center rounded-md border border-border bg-surface">
                <button
                  onClick={() => onUpdateQty(Math.max(1, item.qty - 1))}
                  className="grid size-8 place-items-center text-text-muted transition hover:bg-surface-muted active:scale-90"
                >
                  <Icon name="minus" className="size-3.5" />
                </button>
                <span className="min-w-[2ch] text-center text-sm font-semibold text-text">{item.qty}</span>
                <button
                  onClick={() => onUpdateQty(item.qty + 1)}
                  className="grid size-8 place-items-center text-text-muted transition hover:bg-surface-muted active:scale-90"
                >
                  <Icon name="plus" className="size-3.5" />
                </button>
              </div>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-text-muted transition hover:bg-surface hover:text-danger"
              >
                <Icon name="trash" className="size-3.5" />
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartItemShowcase() {
  const [items, setItems] = React.useState(sampleCart);

  const updateQty = (name, qty) => {
    setItems((prev) => prev.map((i) => (i.name === name ? { ...i, qty } : i)));
  };

  const removeItem = (name) => {
    setItems((prev) => prev.filter((i) => i.name !== name));
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Cart list item</h3>
      <div className="rounded-panel border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Order items</p>
          <Badge tone="accent">{items.length} items</Badge>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <CartRow
              key={item.name}
              item={item}
              subtotal={`$ ${(item.qty * item.price).toFixed(2)}`}
              onUpdateQty={(q) => updateQty(item.name, q)}
              onRemove={() => removeItem(item.name)}
            />
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-mono font-semibold tabular-nums text-text">
              $ {items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
