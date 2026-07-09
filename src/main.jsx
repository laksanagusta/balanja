import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import App from "./App.jsx";
import "./index.css";
import { POSStoreProvider } from "./pos/store.jsx";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkConfig() {
  return (
    <main className="grid min-h-screen place-items-center bg-app-bg px-4 text-text">
      <section className="w-full max-w-lg rounded-panel border border-border bg-surface p-6 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Configuration required</p>
        <h1 className="mt-3 text-2xl font-semibold">Clerk publishable key is missing</h1>
        <p className="mt-3 text-sm leading-6 text-text-muted">
          Create <span className="font-mono text-text">.env.local</span> and set{" "}
          <span className="font-mono text-text">VITE_CLERK_PUBLISHABLE_KEY</span>. Use{" "}
          <span className="font-mono text-text">.env.example</span> as the template.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        <POSStoreProvider>
          <App />
        </POSStoreProvider>
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </React.StrictMode>,
);
