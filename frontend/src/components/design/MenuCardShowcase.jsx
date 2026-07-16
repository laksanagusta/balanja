import React from "react";
import { Panel } from "../primitives.jsx";
import { ProductCard } from "../pos/ProductCard.jsx";
import { menuItems } from "../../data.js";

export default function MenuCardShowcase() {
  return (
    <Panel className="grid gap-4 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Product card</h3>
        <p className="mt-1 text-sm text-text-muted">
          Retail card with product image, stock badge, category, IDR price, quantity stepper, and add-to-cart button.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {menuItems.slice(0, 4).map((item) => (
          <ProductCard key={item.name} product={item} />
        ))}
      </div>
    </Panel>
  );
}
