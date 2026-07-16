import React from "react";
import { Show, useAuth } from "@clerk/react";
import { Toaster } from "sonner";
import AppShell from "./components/AppShell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DesignSystemPage from "./pages/DesignSystemPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import RetailPosPage from "./pages/RetailPosPage.jsx";
import SalesReportPage from "./pages/SalesReportPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import StockPage from "./pages/StockPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import { routes } from "./shared.jsx";
import { normalizePath } from "./routing.js";

function usePathname(isSignedIn, isAuthLoaded) {
  const [pathname, setPathname] = React.useState(() =>
    normalizePath(window.location.pathname, isSignedIn, isAuthLoaded),
  );

  React.useEffect(() => {
    const handlePopState = () =>
      setPathname(normalizePath(window.location.pathname, isSignedIn, isAuthLoaded));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthLoaded, isSignedIn]);

  React.useEffect(() => {
    const nextPath = normalizePath(window.location.pathname, isSignedIn, isAuthLoaded);
    if (nextPath !== window.location.pathname) window.history.replaceState({}, "", nextPath);
    setPathname(nextPath);
  }, [isAuthLoaded, isSignedIn]);

  const navigate = React.useCallback((path) => {
    const target = new URL(path, window.location.origin);
    const nextPath = normalizePath(target.pathname, isSignedIn, isAuthLoaded);
    const nextURL = nextPath === target.pathname ? `${nextPath}${target.search}` : nextPath;
    window.history.pushState({}, "", nextURL);
    setPathname(nextPath);
    window.scrollTo(0, 0);
  }, [isAuthLoaded, isSignedIn]);

  return [pathname, navigate];
}

function AppPage({ pathname, onNavigate }) {
  if (pathname === routes.dashboard) return <DashboardPage onNavigate={onNavigate} />;
  if (pathname === routes.products) return <ProductsPage />;
  if (pathname === routes.stock) return <StockPage />;
  if (pathname === routes.transactions) return <TransactionsPage />;
  if (pathname === routes.reportsSales) return <SalesReportPage onNavigate={onNavigate} />;
  if (pathname === routes.settings) return <SettingsPage />;
  return <RetailPosPage />;
}

export default function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pathname, navigate] = usePathname(Boolean(isSignedIn), isLoaded);

  if (pathname === routes.landing) {
    return <LandingPage isSignedIn={Boolean(isSignedIn)} onNavigate={navigate} />;
  }

  if (pathname === routes.login) {
    return <LoginPage isSignedIn={Boolean(isSignedIn)} onNavigate={navigate} />;
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-app-bg" aria-busy="true" />;
  }

  return (
    <div className="min-h-screen bg-app-bg text-text antialiased">
      <Toaster
        position="bottom-right"
        closeButton
        richColors
        visibleToasts={3}
        duration={2800}
        offset={24}
      />
      <Show when="signed-in">
        {pathname === routes.designSystem ? (
          <DesignSystemPage onNavigate={navigate} />
        ) : (
          <AppShell pathname={pathname} onNavigate={navigate}>
            <AppPage pathname={pathname} onNavigate={navigate} />
          </AppShell>
        )}
      </Show>
    </div>
  );
}
