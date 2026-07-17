import React from "react";
import { useClerk, useUser } from "@clerk/react";
import { GradientAvatar } from "@outpacelabs/avatars";
import { toast } from "sonner";
import { navGroups, routes } from "../shared.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { Icon } from "./primitives.jsx";

function navIcon(icon) {
  if (icon === "box") return "package";
  return icon;
}

function NavItem({ item, pathname, onNavigate }) {
  const [label, icon, path] = item;
  const active = pathname === path;

  return (
    <button
      type="button"
      aria-current={pathname === path ? "page" : undefined}
      onClick={() => onNavigate(path)}
      className={`flex h-9 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm font-semibold transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.98] motion-reduce:active:scale-100 ${
        active
          ? "bg-surface-muted text-text"
          : "text-text-muted hover:bg-surface-muted hover:text-text"
      }`}
    >
      <Icon name={navIcon(icon)} className="size-4" />
      {label}
    </button>
  );
}

function NavigationGroups({ pathname, onNavigate }) {
  return navGroups.map((group) => (
    <div key={group.label} className="grid gap-1">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
        {group.label}
      </p>
      {group.items.map((item) => (
        <NavItem key={item[2]} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </div>
  ));
}

function AccountMenu({ user, onSettings, onSignOut, className = "" }) {
  return (
    <div className={`rounded-card border border-border bg-surface p-2 shadow-panel ${className}`}>
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-text">{user?.fullName || "Kasir"}</p>
        <p className="truncate text-xs text-text-muted">
          {user?.primaryEmailAddress?.emailAddress || "Sudah masuk"}
        </p>
      </div>
      <div className="border-t border-border pt-1">
        <button
          type="button"
          onClick={onSettings}
          className="flex h-10 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-text-muted transition hover:bg-surface-muted hover:text-text"
        >
          <Icon name="settings" className="size-4" />
          Pengaturan
        </button>
        <div className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            onClick={onSignOut}
            className="flex h-10 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-danger transition hover:bg-danger-soft"
          >
            <Icon name="x" className="size-4" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children, pathname, onNavigate }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { notice, clearNotice } = usePOSStore();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const avatarSeed = user?.primaryEmailAddress?.emailAddress || user?.fullName || user?.id || "cashier";

  const go = React.useCallback((path) => {
    onNavigate(path);
    setMobileNavOpen(false);
  }, [onNavigate]);

  React.useEffect(() => {
    if (!notice) return;
    if (notice === "Transaction completed" || notice === "Settings saved") {
      toast.success(notice);
    } else {
      toast.error(notice);
    }
    clearNotice();
  }, [notice, clearNotice]);

  React.useEffect(() => {
    if (!mobileNavOpen && !accountOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen, mobileNavOpen]);

  return (
    <div className="h-svh overflow-hidden bg-app-bg p-2">
      <div className="flex h-full gap-2 overflow-hidden">
        <aside className="hidden h-full w-[236px] shrink-0 flex-col rounded-card border border-border bg-surface md:flex">
          <div className="flex h-14 items-center px-4">
            <button type="button" onClick={() => go(routes.dashboard)} className="text-left text-sm font-semibold lowercase text-text">
              balanja
            </button>
          </div>

          <nav aria-label="Navigasi utama" className="grid gap-4 px-2 py-3">
            <NavigationGroups pathname={pathname} onNavigate={go} />
          </nav>

          <div className="relative mt-auto p-3">
            {accountOpen && (
              <AccountMenu
                user={user}
                onSettings={() => {
                  setAccountOpen(false);
                  go(routes.settings);
                }}
                onSignOut={() => signOut({ redirectUrl: "/" })}
                className="absolute bottom-[64px] left-3 right-3 z-30"
              />
            )}
            <button
              type="button"
              aria-label="Buka menu akun"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className={`flex w-full items-center gap-3 rounded-control border border-border bg-surface px-2 py-1.5 text-left shadow-low transition-[background-color,transform] duration-fast ease-standard active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${accountOpen ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            >
              <span className="size-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                <GradientAvatar seed={avatarSeed} size={36} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{user?.fullName || "Kasir"}</span>
                <span className="block truncate text-xs text-text-muted">
                  {user?.primaryEmailAddress?.emailAddress || "Sudah masuk"}
                </span>
              </span>
              <Icon name="chevron" className={`size-4 text-text-muted transition ${accountOpen ? "" : "rotate-180"}`} />
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
            <button
              type="button"
              aria-label="Buka menu navigasi"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileNavOpen(true)}
              className="grid size-11 place-items-center rounded-control border border-border bg-surface transition-transform duration-fast ease-standard active:scale-[0.96] motion-reduce:active:scale-100"
            >
              <Icon name="menu" className="size-5" />
            </button>
            <button type="button" onClick={() => go(routes.dashboard)} className="min-h-11 px-2 text-base font-bold">
              Balanja
            </button>
            <button
              type="button"
              aria-label="Buka menu akun"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className={`grid size-11 place-items-center rounded-full transition ${accountOpen ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            >
              <span className="size-8 overflow-hidden rounded-full bg-surface-muted">
                <GradientAvatar seed={avatarSeed} size={32} />
              </span>
            </button>
          </header>

          {accountOpen && (
            <AccountMenu
              user={user}
              onSettings={() => {
                setAccountOpen(false);
                go(routes.settings);
              }}
              onSignOut={() => signOut({ redirectUrl: "/" })}
              className="fixed right-3 top-[66px] z-[60] w-[min(300px,calc(100vw-24px))] md:hidden"
            />
          )}

          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                aria-label="Tutup menu navigasi"
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                onClick={() => setMobileNavOpen(false)}
              />
              <div
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Navigasi aplikasi"
                className="absolute bottom-2 left-2 top-2 grid w-[min(320px,calc(100vw-32px))] grid-rows-[auto_1fr] overflow-hidden rounded-card border border-border bg-surface shadow-panel transition-[transform,opacity] duration-base ease-standard motion-reduce:transform-none"
              >
                <div className="flex h-14 items-center justify-between border-b border-border px-4">
                  <button type="button" onClick={() => go(routes.dashboard)} className="min-h-11 text-sm font-semibold lowercase text-text">
                    balanja
                  </button>
                  <button
                    type="button"
                    aria-label="Tutup menu navigasi"
                    onClick={() => setMobileNavOpen(false)}
                    className="grid size-11 place-items-center rounded-control text-text-muted hover:bg-surface-muted hover:text-text"
                  >
                    <Icon name="x" className="size-5" />
                  </button>
                </div>
                <nav aria-label="Navigasi utama" className="grid content-start gap-4 overflow-y-auto p-3">
                  <NavigationGroups pathname={pathname} onNavigate={go} />
                </nav>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </section>
      </div>
      {accountOpen && (
        <button
          type="button"
          aria-label="Tutup menu akun"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setAccountOpen(false)}
        />
      )}
    </div>
  );
}
