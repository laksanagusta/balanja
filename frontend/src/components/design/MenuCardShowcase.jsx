import React from "react";
import { Panel } from "../primitives.jsx";
import { PosProductCard } from "../pos/ProductCard.jsx";
import { menuItems } from "../../data.js";

export default function MenuCardShowcase() {
  return (
    <Panel className="grid gap-4 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Product card</h3>
        <p className="mt-1 text-sm text-text-muted">
          Image-first retail card with a clean photo, two-line product name, bold IDR price, and a white circular plus control.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {menuItems.slice(0, 4).map((item) => (
          <PosProductCard
            key={item.name}
            product={{ ...item, price: item.price.replace(/^Rp/, "") }}
            onAdd={() => ({ ok: true })}
          />
        ))}
      </div>
    </Panel>
  );
}
