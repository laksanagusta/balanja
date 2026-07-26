import React from "react";
import { useClerk, useUser } from "@clerk/react";
import { GradientAvatar } from "@outpacelabs/avatars";
import { toast } from "sonner";
import { navGroups, routes } from "../shared.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { Icon } from "./primitives.jsx";

const appShellScrollLockClass = "app-shell-scroll-lock";

function NavItem({ item, pathname, onNavigate, collapsed = false }) {
  const [label, icon, path] = item;
  const active = pathname === path;

  return (
    <button
      type="button"
      aria-current={pathname === path ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      onClick={() => onNavigate(path)}
      className={`pos-touch-target flex h-9 w-full items-center rounded-control text-left text-sm font-semibold transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:active:scale-100 ${collapsed ? "justify-center px-0" : "gap-2.5 px-3"} ${
        active
          ? "bg-surface-muted text-text"
          : "text-text-muted hover:bg-surface-muted hover:text-text"
      }`}
    >
      <Icon name={icon} className="size-4 shrink-0" />
      {!collapsed && label}
    </button>
  );
}

function NavigationGroups({ pathname, onNavigate, collapsed = false }) {
  return navGroups.map((group) => (
    <div key={group.label} role="group" aria-label={group.label} className="grid gap-1">
      {!collapsed && (
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
          {group.label}
        </p>
      )}
      {group.items.map((item) => (
        <NavItem key={item[2]} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const avatarSeed = user?.primaryEmailAddress?.emailAddress || user?.fullName || user?.id || "cashier";

  React.useEffect(() => {
    document.documentElement.classList.add(appShellScrollLockClass);
    document.body.classList.add(appShellScrollLockClass);
    return () => {
      document.documentElement.classList.remove(appShellScrollLockClass);
      document.body.classList.remove(appShellScrollLockClass);
    };
  }, []);

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
        <aside className={`hidden h-full shrink-0 flex-col rounded-card border border-border bg-surface transition-[width] duration-base ease-standard motion-reduce:transition-none md:flex ${sidebarCollapsed ? "w-[72px]" : "w-[236px]"}`}>
          <div className={`flex h-14 items-center ${sidebarCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4"}`}>
            {!sidebarCollapsed && (
              <button type="button" onClick={() => go(routes.dashboard)} className="min-h-11 text-left text-sm font-bold lowercase text-text">
                balanja
              </button>
            )}
            <button
              type="button"
              aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              aria-expanded={!sidebarCollapsed}
              onClick={() => {
                setSidebarCollapsed((collapsed) => !collapsed);
                setAccountOpen(false);
              }}
              className="pos-icon-touch-target grid size-9 shrink-0 place-items-center rounded-control text-text-muted transition-colors duration-fast hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Icon name="sidebar" className={`size-4 transition-transform duration-base motion-reduce:transition-none ${sidebarCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          <nav aria-label="Navigasi utama" className="grid gap-4 px-2 py-3">
            <NavigationGroups pathname={pathname} onNavigate={go} collapsed={sidebarCollapsed} />
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
                className={`absolute bottom-[64px] left-3 z-30 ${sidebarCollapsed ? "w-[280px]" : "right-3"}`}
              />
            )}
            <button
              type="button"
              aria-label="Buka menu akun"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((open) => !open)}
              className={`flex w-full items-center rounded-control border border-border bg-surface py-1.5 text-left shadow-low transition-[background-color,transform] duration-fast ease-standard active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${sidebarCollapsed ? "justify-center px-1" : "gap-3 px-2"} ${accountOpen ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
            >
              <span className="size-9 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                <GradientAvatar seed={avatarSeed} size={36} />
              </span>
              {!sidebarCollapsed && <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">{user?.fullName || "Kasir"}</span>
                <span className="block truncate text-xs text-text-muted">
                  {user?.primaryEmailAddress?.emailAddress || "Sudah masuk"}
                </span>
              </span>}
              {!sidebarCollapsed && <Icon name="chevron" className={`size-4 text-text-muted transition ${accountOpen ? "" : "rotate-180"}`} />}
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
                  <button type="button" onClick={() => go(routes.dashboard)} className="min-h-11 text-sm font-bold lowercase text-text">
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
