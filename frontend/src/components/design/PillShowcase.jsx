import React from "react";
import { Icon, Panel, Pill } from "../primitives.jsx";

const categories = ["Semua", "Sembako", "Minuman", "Snack", "Perawatan", "Rumah Tangga"];

export default function PillShowcase() {
  const [active, setActive] = React.useState("Semua");

  return (
    <Panel className="grid gap-5 p-6">
      <div>
        <h3 className="text-xl font-semibold text-text">Pills</h3>
        <p className="mt-1 text-sm text-text-muted">
          Compact rounded filters for retail categories, statuses, and quick scopes.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <Pill key={item} selected={active === item} onClick={() => setActive(item)}>
              {item}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill tone="accent" selected>
            <Icon name="check" className="size-4" />
            Active
          </Pill>
          <Pill tone="success">Paid</Pill>
          <Pill tone="warning">Low stock</Pill>
          <Pill tone="danger">Void</Pill>
          <Pill disabled>Disabled</Pill>
        </div>
      </div>
    </Panel>
  );
}
