import React from "react";
import { Badge } from "../primitives.jsx";
import { CartRow } from "../pos/CartRow.jsx";

const sampleCart = [
  {
    name: "Mie Instan Goreng",
    category: "Makanan Instan",
    price: 3500,
    qty: 2,
    barcode: "8997001230035",
    image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Gula Pasir 1kg",
    category: "Sembako",
    price: 16500,
    qty: 1,
    barcode: "8997001230028",
    image: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Air Mineral 600ml",
    category: "Minuman",
    price: 4000,
    qty: 1,
    barcode: "8997001230042",
    image: "https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Deterjen Bubuk 800g",
    category: "Rumah Tangga",
    price: 18000,
    qty: 1,
    barcode: "8997001230066",
    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80",
  },
];

function formatIDR(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value).replace(/\s+/g, "");
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
          <p className="text-sm font-semibold text-text">Cart items</p>
          <Badge tone="accent">{items.length} items</Badge>
        </div>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <CartRow
              key={item.name}
              item={item}
              subtotal={formatIDR(item.qty * item.price)}
              onUpdateQty={(q) => updateQty(item.name, q)}
              onRemove={() => removeItem(item.name)}
            />
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-mono font-semibold tabular-nums text-text">
              {formatIDR(items.reduce((s, i) => s + i.price * i.qty, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
