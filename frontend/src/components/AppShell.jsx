import React from "react";
import { useClerk, useUser } from "@clerk/react";
import { GradientAvatar } from "@outpacelabs/avatars";
import { toast } from "sonner";
import { routes } from "../shared.jsx";
import { usePOSStore } from "../pos/store.jsx";
import { Icon } from "./primitives.jsx";
import {
  nextBottomNavigationProgress,
  releaseBottomNavigationPointerFocus,
  seedBottomNavigationScrollPositions,
} from "./bottom-navigation.js";

const appShellScrollLockClass = "app-shell-scroll-lock";
const mobilePrimaryNavigation = [
  ["Beranda", "home", routes.dashboard],
  ["Kasir", "receipt", routes.pos],
  ["Produk", "box", routes.products],
  ["Stok", "package", routes.stock],
];
const mobileMoreNavigation = [
  ["Transaksi", "file", routes.transactions],
  ["Laporan Penjualan", "file", routes.reportsSales],
];
const appPageTitles = {
  [routes.dashboard]: "Balanja",
  [routes.pos]: "Kasir",
  [routes.products]: "Produk",
  [routes.stock]: "Stok",
  [routes.transactions]: "Transaksi",
  [routes.reportsSales]: "Laporan Penjualan",
  [routes.settings]: "Pengaturan",
};

function useCollapsibleBottomNavigation({ contentRef, navigationRef, pathname, expanded }) {
  React.useEffect(() => {
    const content = contentRef.current;
    const navigation = navigationRef.current;
    if (!content || !navigation) return undefined;

    const scrollPositions = new WeakMap();
    let progress = 0;
    let lastDirection = "up";
    let isScrolledAway = seedBottomNavigationScrollPositions(
      content.querySelectorAll("*"),
      scrollPositions,
    );
    let travelDistance = 96;
    let frame = 0;
    let settleTimer = 0;

    const measureTravelDistance = () => {
      const bounds = navigation.getBoundingClientRect();
      travelDistance = navigation.offsetHeight + Math.max(12, window.innerHeight - bounds.bottom) + 8;
    };

    const renderProgress = (nextProgress, settling = false) => {
      progress = Math.min(1, Math.max(0, nextProgress));
      navigation.dataset.settling = settling ? "true" : "false";
      navigation.dataset.scrollDirection = lastDirection;
      navigation.dataset.scrolled = isScrolledAway ? "true" : "false";
      navigation.dataset.hidden = progress >= 0.98 ? "true" : "false";
      navigation.style.setProperty("--bottom-navigation-translate", `${progress * travelDistance}px`);
      navigation.style.setProperty("--bottom-navigation-scale", String(1 - progress * 0.04));
      navigation.style.setProperty("--bottom-navigation-opacity", String(1 - progress));
      navigation.style.setProperty("--bottom-navigation-frost-opacity", String(isScrolledAway ? 1 - progress : 0));
      for (const floatingAction of content.querySelectorAll(".app-shell-floating-action, .retail-pos-cart-open")) {
        floatingAction.dataset.settling = settling ? "true" : "false";
        floatingAction.dataset.scrollDirection = lastDirection;
        floatingAction.style.setProperty("--app-bottom-navigation-progress", String(progress));
      }
    };

    const scheduleProgress = (nextProgress) => {
      progress = nextProgress;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        renderProgress(progress);
      });
    };

    const showNavigation = () => {
      window.clearTimeout(settleTimer);
      lastDirection = "up";
      renderProgress(0, true);
    };

    const settleNavigation = () => {
      const target = lastDirection === "down"
        ? (progress >= 0.35 ? 1 : 0)
        : (progress <= 0.85 ? 0 : 1);
      renderProgress(target, true);
    };

    const handleScroll = (event) => {
      const scrollRegion = event.target;
      if (
        expanded
        || !(scrollRegion instanceof HTMLElement)
        || !content.contains(scrollRegion)
        || scrollRegion.closest('[role="dialog"], [role="listbox"], [aria-modal="true"]')
        || scrollRegion.scrollHeight <= scrollRegion.clientHeight + 1
      ) return;

      const scrollTop = Math.max(0, scrollRegion.scrollTop);
      const previousScrollTop = scrollPositions.get(scrollRegion) ?? 0;
      scrollPositions.set(scrollRegion, scrollTop);
      isScrolledAway = scrollTop > 4;
      if (navigation.contains(document.activeElement)) {
        renderProgress(scrollTop <= 4 ? 0 : progress);
        return;
      }

      const delta = scrollTop - previousScrollTop;
      if (Math.abs(delta) >= 0.5) lastDirection = delta > 0 ? "down" : "up";
      const nextProgress = nextBottomNavigationProgress({ progress, delta, scrollTop });
      if (nextProgress === progress) return;

      window.clearTimeout(settleTimer);
      scheduleProgress(nextProgress);
      settleTimer = window.setTimeout(settleNavigation, 110);
    };

    const handleResize = () => {
      measureTravelDistance();
      renderProgress(progress);
    };

    measureTravelDistance();
    renderProgress(0);
    content.addEventListener("scroll", handleScroll, true);
    navigation.addEventListener("focusin", showNavigation);
    window.addEventListener("resize", handleResize);

    return () => {
      content.removeEventListener("scroll", handleScroll, true);
      navigation.removeEventListener("focusin", showNavigation);
      window.removeEventListener("resize", handleResize);
      window.clearTimeout(settleTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [contentRef, expanded, navigationRef, pathname]);
}

function MobileBottomNavigation({ navigationRef, pathname, onNavigate, moreOpen, onToggleMore }) {
  const moreActive = mobileMoreNavigation.some(([, , path]) => pathname === path);
  const localNavRef = React.useRef(null);
  const itemRefs = React.useRef(new Map());
  const pillRef = React.useRef(null);
  const setNavigationRef = React.useCallback((node) => {
    localNavRef.current = node;
    navigationRef.current = node;
  }, [navigationRef]);

  const updatePill = React.useCallback(() => {
    const nav = localNavRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const activeKey = mobilePrimaryNavigation.find(([, , path]) => pathname === path)?.[2]
      ?? (moreActive || moreOpen ? "more" : null);
    const target = activeKey ? itemRefs.current.get(activeKey) : null;
    if (!target) return;
    pill.style.transform = `translateX(${target.offsetLeft}px)`;
    pill.style.width = `${target.offsetWidth}px`;
  }, [moreActive, moreOpen, pathname]);

  React.useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);

  React.useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  const registerItem = React.useCallback((key) => (node) => {
    if (node) itemRefs.current.set(key, node);
    else itemRefs.current.delete(key);
  }, []);

  return (
    <nav
      ref={setNavigationRef}
      aria-label="Navigasi utama mobile"
      className="mobile-bottom-navigation absolute z-30 grid grid-cols-5 bg-surface/88 p-1 backdrop-blur-xl"
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="mobile-bottom-nav-pill pointer-events-none absolute inset-y-1 left-0 -z-10 rounded-full bg-surface-muted transition-[transform,width] duration-base ease-standard motion-reduce:transition-none"
      />
      {mobilePrimaryNavigation.map(([label, icon, path]) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            ref={registerItem(path)}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              releaseBottomNavigationPointerFocus(event);
              onNavigate(path);
            }}
            className={`mobile-bottom-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-semibold transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus ${
              active ? "text-accent" : "text-text-muted"
            }`}
          >
            <span className={`grid size-8 place-items-center rounded-full transition-colors duration-fast ${active ? "bg-accent-soft" : ""}`}>
              <Icon name={icon} className="size-6" />
            </span>
            <span className="max-w-full truncate">{label}</span>
          </button>
        );
      })}
      <button
        ref={registerItem("more")}
        type="button"
        aria-expanded={moreOpen}
        aria-controls="mobile-more-navigation"
        onClick={onToggleMore}
        className={`mobile-bottom-nav-item flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-semibold transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus ${
          moreActive || moreOpen ? "text-accent" : "text-text-muted"
        }`}
      >
        <span className={`grid size-8 place-items-center rounded-full transition-colors duration-fast ${moreActive || moreOpen ? "bg-accent-soft" : ""}`}>
          <Icon name="more" className="size-6" />
        </span>
        <span>Lainnya</span>
      </button>
    </nav>
  );
}

function AccountMenu({ user, onSettings, onSignOut, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-panel ${className}`}>
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-text">{user?.fullName || "Kasir"}</p>
        <p className="truncate text-xs text-text-muted">
          {user?.primaryEmailAddress?.emailAddress || "Sudah masuk"}
        </p>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="flex h-9 w-full items-center gap-2 rounded-control px-2 text-left text-sm font-semibold text-text-muted transition hover:bg-surface-muted hover:text-text"
      >
        <Icon name="settings" className="size-4" />
        Pengaturan
      </button>
      <button
        type="button"
        onClick={onSignOut}
        className="flex h-9 w-full items-center gap-2 rounded-control px-2 text-left text-sm font-semibold text-danger transition hover:bg-danger-soft"
      >
        <Icon name="x" className="size-4" />
        Keluar
      </button>
    </div>
  );
}

export default function AppShell({ children, pathname, onNavigate }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { notice, clearNotice } = usePOSStore();
  const [mobileMoreOpen, setMobileMoreOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const contentRef = React.useRef(null);
  const bottomNavigationRef = React.useRef(null);
  const avatarSeed = user?.primaryEmailAddress?.emailAddress || user?.fullName || user?.id || "cashier";
  const pageTitle = appPageTitles[pathname] || "Balanja";

  useCollapsibleBottomNavigation({
    contentRef,
    navigationRef: bottomNavigationRef,
    pathname,
    expanded: mobileMoreOpen,
  });

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
    setMobileMoreOpen(false);
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
    if (!mobileMoreOpen && !accountOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobileMoreOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [accountOpen, mobileMoreOpen]);

  return (
    <div className="h-svh overflow-hidden bg-app-bg">
      <div className="mx-auto flex h-full w-full max-w-[1200px] overflow-hidden bg-surface">
        <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
          <header className="mobile-app-bar shrink-0 bg-surface px-4 pb-3">
            <div className="flex min-h-14 items-center justify-between">
              <h1 className="min-w-0 truncate text-lg font-extrabold tracking-normal text-text">
                {pageTitle}
              </h1>
              <p className="sr-only">Navigasi aplikasi Balanja</p>
              <div className="flex shrink-0 items-center gap-1">
                <div id="app-top-bar-actions" className="flex items-center gap-1" />
                <button
                  type="button"
                  aria-label="Buka menu akun"
                  aria-expanded={accountOpen}
                  onClick={() => {
                    setMobileMoreOpen(false);
                    setAccountOpen((open) => !open);
                  }}
                  className="grid size-11 place-items-center rounded-full bg-transparent transition-transform duration-fast ease-standard active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="account-avatar size-8 overflow-hidden rounded-full bg-surface">
                    <GradientAvatar seed={avatarSeed} size={32} />
                  </span>
                </button>
              </div>
            </div>
          </header>

          {accountOpen && (
            <AccountMenu
              user={user}
              onSettings={() => {
                setAccountOpen(false);
                go(routes.settings);
              }}
              onSignOut={() => signOut({ redirectUrl: "/" })}
              className="mobile-account-menu absolute right-3 z-[60] w-[min(300px,calc(100vw-24px))]"
            />
          )}

          {mobileMoreOpen && (
            <div className="absolute inset-0 z-40">
              <button
                type="button"
                aria-label="Tutup navigasi lainnya"
                className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                onClick={() => setMobileMoreOpen(false)}
              />
              <div
                id="mobile-more-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Navigasi lainnya"
                className="mobile-more-navigation absolute left-3 right-3 z-10 grid gap-1 rounded-overlay border border-border bg-surface p-2 shadow-panel"
              >
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle">
                  Lainnya
                </p>
                {mobileMoreNavigation.map(([label, icon, path]) => (
                  <button
                    key={path}
                    type="button"
                    aria-current={pathname === path ? "page" : undefined}
                    onClick={() => go(path)}
                    className={`mobile-standard-control flex w-full items-center gap-3 rounded-control px-3 text-left text-sm font-semibold transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                      pathname === path ? "bg-accent-soft text-text" : "text-text-muted hover:bg-surface-muted hover:text-text"
                    }`}
                  >
                    <Icon name={icon} className="size-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={contentRef} className="app-shell-content min-h-0 flex-1 overflow-hidden">{children}</div>

          <MobileBottomNavigation
            navigationRef={bottomNavigationRef}
            pathname={pathname}
            onNavigate={go}
            moreOpen={mobileMoreOpen}
            onToggleMore={() => {
              setAccountOpen(false);
              setMobileMoreOpen((open) => !open);
            }}
          />
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
