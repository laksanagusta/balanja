import React from "react";
import { SignIn } from "@clerk/react";
import { Button } from "../components/primitives.jsx";
import { Logo, routes } from "../shared.jsx";

export default function LoginPage({ isSignedIn, onNavigate }) {
  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 text-text sm:px-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate(routes.landing)}
          aria-label="Kembali ke beranda"
          className="rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <Logo />
        </button>
        <Button type="button" variant="ghost" onClick={() => onNavigate(routes.landing)}>
          Kembali
        </Button>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl place-items-center py-10">
        {isSignedIn ? (
          <div className="grid max-w-md justify-items-center gap-4 text-center">
            <h1 className="text-3xl font-semibold text-text">Anda sudah masuk.</h1>
            <p className="text-sm leading-6 text-text-muted">
              Buka dashboard untuk melanjutkan operasional toko.
            </p>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => onNavigate(routes.dashboard)}
            >
              Buka dashboard
            </Button>
          </div>
        ) : (
          <div className="rounded-panel border border-border bg-surface p-4 shadow-panel">
            <SignIn routing="hash" afterSignInUrl={routes.dashboard} />
          </div>
        )}
      </section>
    </main>
  );
}
