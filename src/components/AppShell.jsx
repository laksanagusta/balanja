import React from "react";
import { UserButton, useUser } from "@clerk/react";
import { navGroups, routes } from "../shared.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { Button, Icon } from "./primitives.jsx";

function navIcon(icon) {
  if (icon === "box") return "package";
  return icon;
}

export default function AppShell({ children, pathname, onNavigate }) {
  const { user } = useUser();
  const { notice, clearNotice } = usePOSStore();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const go = (path) => {
    onNavigate(path);
    setMobileNavOpen(false);
  };

  return (
    <div className="h-svh overflow-hidden bg-app-bg p-2">
      <div className="flex h-full gap-2 overflow-hidden">
        <aside className="hidden h-full w-[236px] shrink-0 flex-col rounded-panel border border-border bg-surface shadow-panel md:flex">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <button type="button" onClick={() => go(routes.pos)} className="text-left text-lg font-bold text-text">
              Balanja
            </button>
          </div>

          <nav className="grid gap-2 p-2">
            {navGroups.flatMap((group) =>
              group.items.map(([label, icon, path]) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => go(path)}
                  className={`flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition ${
                    pathname === path
                      ? "bg-accent text-white"
                      : "text-text-muted hover:bg-surface-muted hover:text-text"
                  }`}
                >
                  <Icon name={navIcon(icon)} className="size-5" />
                  {label}
                </button>
              )),
            )}
          </nav>

          <div className="mt-auto border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-control border border-border bg-surface-muted p-2">
              <UserButton afterSignOutUrl="/" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{user?.fullName || "Cashier"}</p>
                <p className="truncate text-xs text-text-muted">
                  {user?.primaryEmailAddress?.emailAddress || "Signed in"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border bg-surface shadow-panel">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-control border border-border"
            >
              <Icon name="menu" className="size-5" />
            </button>
            <button type="button" onClick={() => go(routes.pos)} className="text-base font-bold">
              Balanja
            </button>
            <UserButton afterSignOutUrl="/" />
          </header>

          {mobileNavOpen && (
            <div className="grid gap-2 border-b border-border p-2 md:hidden">
              {navGroups.flatMap((group) =>
                group.items.map(([label, icon, path]) => (
                  <Button
                    key={path}
                    variant={pathname === path ? "primary" : "secondary"}
                    className="justify-start"
                    onClick={() => go(path)}
                  >
                    <Icon name={navIcon(icon)} className="size-4" />
                    {label}
                  </Button>
                )),
              )}
            </div>
          )}

          {notice && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-warning-soft px-4 py-2 text-sm font-medium text-warning">
              <span>{notice}</span>
              <button type="button" onClick={clearNotice} className="font-semibold">
                Dismiss
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
    </div>
  );
}
