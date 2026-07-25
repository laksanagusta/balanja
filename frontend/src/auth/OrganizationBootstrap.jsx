import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAuth,
  useClerk,
  useOrganizationList,
  useUser,
} from "@clerk/react";
import { Button, Icon } from "../components/primitives.jsx";
import {
  organizationBootstrapDecision,
  organizationName,
} from "./organization-bootstrap.js";

const ACTIONABLE_DECISIONS = new Set(["revalidate", "activate", "create"]);
const EMPTY_MEMBERSHIPS = [];

export function OrganizationBootstrapSurface({
  error = false,
  onRetry,
  onSignOut,
}) {
  if (!error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app-bg p-6">
        <section
          aria-busy="true"
          className="w-full max-w-md rounded-panel border border-border bg-surface p-6 text-center shadow-low"
          role="status"
        >
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-card bg-accent-soft text-accent">
            <Icon name="loader" className="size-5" />
          </div>
          <h1 className="text-lg font-semibold text-text">
            Menyiapkan toko Anda
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Kami sedang menghubungkan akun Anda ke toko.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg p-6">
      <section
        className="w-full max-w-md rounded-panel border border-border bg-surface p-6 text-center shadow-low"
        role="alert"
      >
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-card bg-accent-soft text-accent">
          <Icon name="bag" className="size-5" />
        </div>
        <h1 className="text-lg font-semibold text-text">
          Toko belum berhasil disiapkan
        </h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Periksa koneksi Anda, lalu coba lagi. Anda juga dapat keluar dan
          masuk kembali.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRetry} type="button">
            Coba lagi
          </Button>
          <Button onClick={onSignOut} type="button" variant="ghost">
            Keluar
          </Button>
        </div>
      </section>
    </main>
  );
}

export default function OrganizationBootstrap({ children }) {
  const { isLoaded: authLoaded, isSignedIn, orgId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const {
    isLoaded: organizationListLoaded,
    createOrganization,
    setActive,
    userMemberships,
  } = useOrganizationList({ userMemberships: true });
  const [emptyListVerified, setEmptyListVerified] = useState(false);
  const [failure, setFailure] = useState(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);

  const memberships = userMemberships?.data ?? EMPTY_MEMBERSHIPS;
  const decision = useMemo(
    () =>
      organizationBootstrapDecision({
        authLoaded,
        signedIn: Boolean(isSignedIn),
        organizationId: orgId,
        organizationListLoaded:
          Boolean(organizationListLoaded) && Boolean(userMemberships),
        membershipsLoading: Boolean(userMemberships?.isLoading),
        memberships,
        emptyListVerified,
        failure,
      }),
    [
      authLoaded,
      emptyListVerified,
      failure,
      isSignedIn,
      memberships,
      orgId,
      organizationListLoaded,
      userMemberships,
      userMemberships?.isLoading,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      !ACTIONABLE_DECISIONS.has(decision.type) ||
      inFlightRef.current
    ) {
      return;
    }

    inFlightRef.current = true;

    async function bootstrap() {
      try {
        if (decision.type === "revalidate") {
          await userMemberships.revalidate();
          if (mountedRef.current) setEmptyListVerified(true);
          return;
        }

        if (decision.type === "activate") {
          await setActive({ organization: decision.organizationId });
          return;
        }

        const organization = await createOrganization({
          name: organizationName(user?.firstName),
        });
        await setActive({ organization: organization.id });
      } catch {
        if (decision.type === "create") {
          try {
            await userMemberships.revalidate();
          } catch {
            // Surface the original bootstrap failure through the recovery UI.
          }
        }

        if (mountedRef.current) {
          setEmptyListVerified(false);
          setFailure(decision.type);
        }
      } finally {
        inFlightRef.current = false;
      }
    }

    bootstrap();
  }, [
    createOrganization,
    decision,
    setActive,
    user?.firstName,
    userMemberships,
  ]);

  function retry() {
    setFailure(null);
    setEmptyListVerified(false);
  }

  if (decision.type === "bypass" || decision.type === "ready") {
    return children;
  }

  return (
    <OrganizationBootstrapSurface
      error={decision.type === "error"}
      onRetry={retry}
      onSignOut={() => signOut({ redirectUrl: "/" })}
    />
  );
}
