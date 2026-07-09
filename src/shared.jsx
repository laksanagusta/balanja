import React from "react";

export const routes = {
  login: "/",
  pos: "/pos",
  products: "/products",
  transactions: "/transactions",
  settings: "/settings",
  designSystem: "/design-system",
};

export const navGroups = [
  {
    label: "Retail",
    items: [
      ["POS", "receipt", routes.pos],
      ["Products", "box", routes.products],
      ["Transactions", "file", routes.transactions],
      ["Settings", "settings", routes.settings],
    ],
  },
];

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-accent shadow-accent">
        <svg viewBox="0 0 28 28" className="size-7 text-white" fill="currentColor" aria-hidden="true">
          <path d="M7.5 9.4c0-2.3 1.9-4.2 4.2-4.2h8.6c.4 0 .6.5.3.8l-4.4 4.4a3.2 3.2 0 0 1-4.6 0L9.7 8.5a1 1 0 0 0-1.7.7v.2c0 .4-.5.6-.5 0Z" />
          <path d="M20.5 18.6c0 2.3-1.9 4.2-4.2 4.2H7.7c-.4 0-.6-.5-.3-.8l4.4-4.4a3.2 3.2 0 0 1 4.6 0l1.9 1.9a1 1 0 0 0 1.7-.7v-.2c0-.4.5-.6.5 0Z" />
          <circle cx="13.9" cy="14" r="3.3" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-normal text-text">Balanja</span>
    </div>
  );
}

export function parsePrice(price) {
  return parseFloat(price.replace(/[^0-9.]/g, ""));
}

export function formatPrice(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(Number(num) || 0)
    .replace(/\s+/g, "");
}
