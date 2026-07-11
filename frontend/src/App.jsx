import React from "react";
import { Show, SignIn } from "@clerk/react";
import { Toaster } from "sonner";
import AppShell from "./components/AppShell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DesignSystemPage from "./pages/DesignSystemPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import RetailPosPage from "./pages/RetailPosPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import { routes } from "./shared.jsx";

function normalizePath(pathname) {
  return Object.values(routes).includes(pathname) ? pathname : routes.pos;
}

function usePathname() {
  const [pathname, setPathname] = React.useState(() => normalizePath(window.location.pathname));

  React.useEffect(() => {
    const handlePopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = React.useCallback((path) => {
    const nextPath = normalizePath(path);
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
    window.scrollTo(0, 0);
  }, []);

  return [pathname, navigate];
}

function AppPage({ pathname, onNavigate }) {
  if (pathname === routes.dashboard) return <DashboardPage onNavigate={onNavigate} />;
  if (pathname === routes.products) return <ProductsPage />;
  if (pathname === routes.transactions) return <TransactionsPage />;
  if (pathname === routes.settings) return <SettingsPage />;
  return <RetailPosPage />;
}

export default function App() {
  const [pathname, navigate] = usePathname();

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
      <Show when="signed-out">
        <main className="grid min-h-screen place-items-center bg-app-bg px-4">
          <div className="w-full max-w-md rounded-panel border border-border bg-surface p-4 shadow-panel">
            <SignIn routing="hash" afterSignInUrl="/pos" />
          </div>
        </main>
      </Show>
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
