import React from "react";
import { Badge, Button, Icon, Input, Panel, Switch } from "../components/primitives.jsx";
import { routes, Logo } from "../shared.jsx";
import { menuItems } from "../data.js";

export default function LoginPage({ onNavigate }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onNavigate(routes.pos);
  };

  return (
    <main className="grid min-h-screen bg-app-bg lg:grid-cols-[minmax(0,1fr)_460px] min-[1500px]:grid-cols-[minmax(0,1fr)_500px]">
      <section className="flex min-h-[520px] flex-col border-b border-border bg-surface px-6 py-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <button
            type="button"
            onClick={() => onNavigate(routes.designSystem)}
            className="h-[42px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-muted shadow-low transition hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Design system
          </button>
        </div>

        <div className="grid flex-1 content-center gap-8 py-10">
          <div className="max-w-2xl">
            <Badge tone="accent">Balanja staff access</Badge>
            <h1 className="mt-4 max-w-xl text-[30px] font-semibold leading-tight text-text sm:text-[34px]">
              Masuk ke kasir restoran tanpa mengganggu alur pesanan.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-muted">
              Login ini memakai token, spacing, radius, dan field yang sama dengan POS supaya staff berpindah dari akses awal ke layar order tanpa perubahan pola visual.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Open tables", "18"],
              ["Kitchen queue", "07"],
              ["Today sales", "$2.4k"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-card border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
                <p className="mt-2 text-2xl font-semibold font-mono tabular-nums text-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
            {menuItems.slice(0, 3).map((item) => (
              <div key={item.name} className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
                <img src={item.image} alt="" className="h-32 w-full object-cover" />
                <div className="grid gap-1 p-3">
                  <p className="truncate text-sm font-semibold text-text">{item.name}</p>
                  <p className="text-xs font-medium text-text-muted">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex items-center px-6 py-8 lg:px-8">
        <Panel className="w-full p-6">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <h2 className="text-2xl font-semibold text-text">Staff login</h2>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                Gunakan akses shift untuk membuka layar point of sale.
              </p>
            </div>

            <Input
              label="Store ID"
              placeholder="BALANJA-01"
              inputProps={{ name: "storeId", autoComplete: "organization", required: true }}
            />
            <Input
              label="Staff PIN"
              placeholder="Enter PIN"
              inputProps={{
                name: "staffPin",
                type: "password",
                inputMode: "numeric",
                autoComplete: "current-password",
                required: true,
              }}
              rightSlot={<Icon name="eye" className="size-4" />}
            />

            <div className="flex items-center justify-between rounded-card border border-border bg-surface-muted p-4">
              <div>
                <p className="text-sm font-semibold text-text">Keep session active</p>
                <p className="mt-1 text-xs font-medium text-text-muted">Recommended for the current cashier shift.</p>
              </div>
              <Switch checked />
            </div>

            <Button type="submit" variant="primary" className="h-[42px] text-base">
              Continue to POS
            </Button>

            <button
              type="button"
              onClick={() => onNavigate(routes.designSystem)}
              className="text-center text-sm font-semibold text-text-muted transition hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              View design system
            </button>
          </form>
        </Panel>
      </aside>
    </main>
  );
}
