import React from "react";
import { Badge, Button, Icon, Panel } from "../primitives.jsx";
import { menuItems } from "../../data.js";

export default function MenuCardShowcase() {
  return (
    <Panel className="grid gap-4 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Menu card</h3>
        <p className="mt-1 text-sm text-text-muted">
          Product card with image, badge, pricing, quantity stepper, and add-to-cart button.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {menuItems.slice(0, 4).map((item) => (
          <div key={item.name} className="menu-card-enter flex min-h-[344px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-low">
            <div className="p-2 pb-0">
              <img src={item.image} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
            </div>
            <div className="grid min-h-[118px] gap-3 p-4 pt-3">
              <Badge>{item.category}</Badge>
              <div className="grid content-start gap-1">
                <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-tight text-text">{item.name}</h3>
                <p className="text-sm font-medium text-text-muted"><span className="font-mono tabular-nums">{item.price}</span> / serving</p>
              </div>
            </div>
            <div className="mt-auto grid gap-2 border-t border-border p-2 min-[1500px]:grid-cols-[minmax(64px,80px)_minmax(90px,1fr)]">
              <div className="grid h-10 min-w-0 grid-cols-3 items-center rounded-md border border-border bg-surface text-center text-base font-semibold text-text">
                <span className="grid h-full place-items-center text-text-muted"><Icon name="minus" className="size-4" /></span>
                <span>0</span>
                <span className="grid h-full place-items-center text-text-muted"><Icon name="plus" className="size-4" /></span>
              </div>
              <Button className="h-10 min-w-0 whitespace-nowrap px-3 text-base leading-none tracking-normal">
                Add to cart
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
