import React from "react";
import { SignIn } from "@clerk/react";
import { Button } from "../components/primitives.jsx";
import { routes } from "../shared.jsx";

const signInAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full max-w-full",
    card: "w-full max-w-full",
  },
};

export default function LoginPage({ isSignedIn, onNavigate }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-app-bg px-3 py-3 text-text sm:px-6 sm:py-6">
      <section className="mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl place-items-center py-4 sm:min-h-[calc(100dvh-3rem)] sm:py-8">
        {isSignedIn ? (
          <div className="grid w-full max-w-md justify-items-center gap-4 px-2 text-center">
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
          <div className="grid w-full max-w-[25rem] min-w-0 justify-items-center">
            <SignIn
              routing="hash"
              fallbackRedirectUrl={routes.dashboard}
              signUpFallbackRedirectUrl={routes.dashboard}
              appearance={signInAppearance}
            />
          </div>
        )}
      </section>
    </main>
  );
}
