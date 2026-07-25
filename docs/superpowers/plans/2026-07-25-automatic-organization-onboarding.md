# Automatic Organization Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan.

**Goal:** Remove the organization-selection interruption for newly registered users by automatically activating an existing organization or creating a default store organization named `Toko {first name}` with fallback `Toko Saya`.

**Architecture:** Clerk Dashboard remains the primary onboarding mechanism by enabling automatic first-organization creation. A client-side `OrganizationBootstrap` boundary provides a defensive fallback: it waits for Clerk data, activates an existing membership, revalidates an apparently empty membership list, then creates and activates an organization only after emptiness is confirmed. The POS provider and its tenant-scoped API requests do not mount until an active organization exists.

**Tech Stack:** React 18, Clerk React, Vite, Vitest, Testing Library, ESLint

---

## Preconditions and Constraints

- Work on the existing `codex/fi-scanner` branch.
- Preserve the unrelated scanner and Agentation changes already present in the worktree.
- Stage only the files named by each task.
- Do not weaken the backend `org_id` requirement; organization remains the tenant boundary.
- Configure both Clerk development and production instances before rollout.
- Update `frontend/DESIGN.md` and the in-app Design System before adding the runtime onboarding UI.

## Task 1: Define the Organization Bootstrap UI in the Design System

**Files:**

- Modify: `frontend/DESIGN.md`
- Create: `frontend/src/components/design/OrganizationOnboardingShowcase.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.jsx`
- Modify: `frontend/src/pages/DesignSystemPage.test.js`

### Step 1: Add a failing Design System source test

In `frontend/src/pages/DesignSystemPage.test.js`, add a test that verifies the new pattern is imported and rendered:

```js
it("documents the organization onboarding states", () => {
  expect(source).toContain(
    'import OrganizationOnboardingShowcase from "../components/design/OrganizationOnboardingShowcase"',
  );
  expect(source).toContain("<OrganizationOnboardingShowcase />");
});
```

Run:

```bash
cd frontend
npm run test -- src/pages/DesignSystemPage.test.js
```

Expected: FAIL because the showcase does not exist in the page.

### Step 2: Document the visual and content contract

Add an “Organization bootstrap” section to `frontend/DESIGN.md`:

```md
### Organization bootstrap

- Show a centered, calm system surface while the first store organization is prepared.
- Loading copy: title `Menyiapkan toko Anda` and supporting text
  `Kami sedang menghubungkan akun Anda ke toko.`
- Error copy: title `Toko belum berhasil disiapkan`, a short recovery
  explanation, primary action `Coba lagi`, and secondary action `Keluar`.
- Keep tenant-scoped application content unmounted until Clerk exposes an
  active organization ID.
- Use the standard page background, surface, border, radius, typography,
  button, focus, and spacing tokens. Do not create a second visual language
  for authentication states.
- Loading status uses `role="status"` and `aria-busy="true"`; error status
  uses `role="alert"`.
```

### Step 3: Create the Design System showcase

Create `frontend/src/components/design/OrganizationOnboardingShowcase.jsx` with static examples of both states:

```jsx
import { LoaderCircle, LogOut, RefreshCw, Store } from "lucide-react";

function StateCard({ children, label }) {
  return (
    <article className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="flex min-h-72 items-center justify-center rounded-3xl border border-border bg-background p-6">
        {children}
      </div>
    </article>
  );
}

function Surface({ icon, title, children, actions, role = "status" }) {
  return (
    <div
      className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      role={role}
    >
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{children}</p>
      {actions}
    </div>
  );
}

export default function OrganizationOnboardingShowcase() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Organization onboarding
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Blocking states shown before tenant-scoped POS data is mounted.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StateCard label="Loading">
          <Surface
            icon={<LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
            title="Menyiapkan toko Anda"
          >
            Kami sedang menghubungkan akun Anda ke toko.
          </Surface>
        </StateCard>

        <StateCard label="Recoverable error">
          <Surface
            icon={<Store className="size-5" aria-hidden="true" />}
            title="Toko belum berhasil disiapkan"
            role="alert"
            actions={
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button className="btn-primary inline-flex items-center justify-center gap-2">
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Coba lagi
                </button>
                <button className="btn-secondary inline-flex items-center justify-center gap-2">
                  <LogOut className="size-4" aria-hidden="true" />
                  Keluar
                </button>
              </div>
            }
          >
            Periksa koneksi Anda, lalu coba lagi. Anda juga dapat keluar dan
            masuk kembali.
          </Surface>
        </StateCard>
      </div>
    </section>
  );
}
```

If the project does not expose `btn-primary` or `btn-secondary`, use the existing button component/classes documented by the current Design System instead of inventing these classes.

Import and render the showcase in `frontend/src/pages/DesignSystemPage.jsx` near the existing authentication or application-state patterns:

```jsx
import OrganizationOnboardingShowcase from "../components/design/OrganizationOnboardingShowcase";
```

```jsx
<OrganizationOnboardingShowcase />
```

### Step 4: Verify and commit the Design System contract

Run:

```bash
cd frontend
npm run test -- src/pages/DesignSystemPage.test.js
npm run lint
```

Expected: both commands pass.

Commit only these files:

```bash
git add -p frontend/DESIGN.md
git add frontend/src/components/design/OrganizationOnboardingShowcase.jsx frontend/src/pages/DesignSystemPage.jsx frontend/src/pages/DesignSystemPage.test.js
git diff --cached --check
git diff --cached
git commit -m "docs: define organization onboarding states"
```

The partial add is required because `frontend/DESIGN.md` already contains
uncommitted scanner documentation. Stage only the organization-onboarding
hunk.

## Task 2: Build and Test the Bootstrap Decision Model

**Files:**

- Create: `frontend/src/auth/organization-bootstrap.js`
- Create: `frontend/src/auth/organization-bootstrap.test.js`

### Step 1: Write failing tests for names and state decisions

Create `frontend/src/auth/organization-bootstrap.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  organizationBootstrapDecision,
  organizationName,
} from "./organization-bootstrap";

const base = {
  authLoaded: true,
  signedIn: true,
  organizationId: null,
  organizationListLoaded: true,
  membershipsLoading: false,
  memberships: [],
  emptyListVerified: false,
  failed: false,
};

describe("organizationName", () => {
  it("uses the trimmed first name", () => {
    expect(organizationName("  Dika ")).toBe("Toko Dika");
  });

  it("uses a safe fallback when the first name is missing", () => {
    expect(organizationName()).toBe("Toko Saya");
    expect(organizationName("   ")).toBe("Toko Saya");
  });
});

describe("organizationBootstrapDecision", () => {
  it("waits for auth", () => {
    expect(
      organizationBootstrapDecision({ ...base, authLoaded: false }),
    ).toEqual({ type: "loading" });
  });

  it("bypasses signed-out users", () => {
    expect(
      organizationBootstrapDecision({ ...base, signedIn: false }),
    ).toEqual({ type: "bypass" });
  });

  it("is ready when an organization is active", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        organizationId: "org_active",
      }),
    ).toEqual({ type: "ready" });
  });

  it("waits for the membership list", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        organizationListLoaded: false,
      }),
    ).toEqual({ type: "loading" });
  });

  it("activates the first existing membership", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        memberships: [{ organization: { id: "org_existing" } }],
      }),
    ).toEqual({ type: "activate", organizationId: "org_existing" });
  });

  it("revalidates an initially empty list", () => {
    expect(organizationBootstrapDecision(base)).toEqual({
      type: "revalidate",
    });
  });

  it("creates only after empty membership is verified", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        emptyListVerified: true,
      }),
    ).toEqual({ type: "create" });
  });

  it("shows an error after an unrecovered failure", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        emptyListVerified: true,
        failed: true,
      }),
    ).toEqual({ type: "error" });
  });

  it("prefers a recovered membership over a prior create failure", () => {
    expect(
      organizationBootstrapDecision({
        ...base,
        failed: true,
        memberships: [{ organization: { id: "org_recovered" } }],
      }),
    ).toEqual({ type: "activate", organizationId: "org_recovered" });
  });
});
```

Run:

```bash
cd frontend
npm run test -- src/auth/organization-bootstrap.test.js
```

Expected: FAIL because the module does not exist.

### Step 2: Implement the pure model

Create `frontend/src/auth/organization-bootstrap.js`:

```js
export function organizationName(firstName) {
  const normalizedFirstName = String(firstName ?? "").trim();
  return normalizedFirstName
    ? `Toko ${normalizedFirstName}`
    : "Toko Saya";
}

export function organizationBootstrapDecision({
  authLoaded,
  signedIn,
  organizationId,
  organizationListLoaded,
  membershipsLoading,
  memberships,
  emptyListVerified,
  failed,
}) {
  if (!authLoaded) return { type: "loading" };
  if (!signedIn) return { type: "bypass" };
  if (organizationId) return { type: "ready" };

  if (!organizationListLoaded || membershipsLoading) {
    return { type: "loading" };
  }

  const existingOrganizationId = memberships?.[0]?.organization?.id;
  if (existingOrganizationId) {
    return {
      type: "activate",
      organizationId: existingOrganizationId,
    };
  }

  if (failed) return { type: "error" };
  if (!emptyListVerified) return { type: "revalidate" };
  return { type: "create" };
}
```

### Step 3: Verify and commit the model

Run:

```bash
cd frontend
npm run test -- src/auth/organization-bootstrap.test.js
```

Expected: all tests pass.

Commit:

```bash
git add frontend/src/auth/organization-bootstrap.js frontend/src/auth/organization-bootstrap.test.js
git commit -m "test: define organization bootstrap decisions"
```

## Task 3: Implement the Clerk Bootstrap Boundary

**Files:**

- Create: `frontend/src/auth/OrganizationBootstrap.jsx`
- Create: `frontend/src/auth/OrganizationBootstrap.test.js`

### Step 1: Write a failing source-contract test

Create `frontend/src/auth/OrganizationBootstrap.test.js`:

```js
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve("src/auth/OrganizationBootstrap.jsx"),
  "utf8",
);

describe("OrganizationBootstrap", () => {
  it("loads Clerk memberships and protects creation with revalidation", () => {
    expect(source).toContain("useOrganizationList");
    expect(source).toContain("userMemberships: true");
    expect(source).toContain("userMemberships.revalidate()");
    expect(source).toContain("createOrganization({");
    expect(source).toContain("setActive({ organization:");
  });

  it("offers retry and sign-out recovery actions", () => {
    expect(source).toContain("Coba lagi");
    expect(source).toContain("Keluar");
    expect(source).toContain("signOut");
  });
});
```

Run:

```bash
cd frontend
npm run test -- src/auth/OrganizationBootstrap.test.js
```

Expected: FAIL because the component does not exist.

### Step 2: Implement the boundary

Create `frontend/src/auth/OrganizationBootstrap.jsx`:

```jsx
import {
  useAuth,
  useClerk,
  useOrganizationList,
  useUser,
} from "@clerk/clerk-react";
import { LoaderCircle, LogOut, RefreshCw, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  organizationBootstrapDecision,
  organizationName,
} from "./organization-bootstrap";

function BootstrapSurface({
  error = false,
  onRetry,
  onSignOut,
}) {
  if (!error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section
          aria-busy="true"
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
          role="status"
        >
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            Menyiapkan toko Anda
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Kami sedang menghubungkan akun Anda ke toko.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
        role="alert"
      >
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Store className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          Toko belum berhasil disiapkan
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Periksa koneksi Anda, lalu coba lagi. Anda juga dapat keluar dan
          masuk kembali.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button className="btn-primary" onClick={onRetry} type="button">
            <RefreshCw className="size-4" aria-hidden="true" />
            Coba lagi
          </button>
          <button className="btn-secondary" onClick={onSignOut} type="button">
            <LogOut className="size-4" aria-hidden="true" />
            Keluar
          </button>
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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const inFlightRef = useRef(false);

  const memberships = userMemberships?.data ?? [];
  const decision = useMemo(
    () =>
      organizationBootstrapDecision({
        authLoaded,
        signedIn: Boolean(isSignedIn),
        organizationId: orgId,
        organizationListLoaded,
        membershipsLoading: Boolean(userMemberships?.isLoading),
        memberships,
        emptyListVerified,
        failed,
      }),
    [
      authLoaded,
      emptyListVerified,
      failed,
      isSignedIn,
      memberships,
      orgId,
      organizationListLoaded,
      userMemberships?.isLoading,
    ],
  );

  useEffect(() => {
    if (
      !["revalidate", "activate", "create"].includes(decision.type) ||
      inFlightRef.current
    ) {
      return;
    }

    let active = true;
    inFlightRef.current = true;

    async function run() {
      try {
        if (decision.type === "revalidate") {
          await userMemberships.revalidate();
          if (active) setEmptyListVerified(true);
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
            // The original failure is surfaced below.
          }
        }
        if (active) {
          setEmptyListVerified(false);
          setFailed(true);
        }
      } finally {
        inFlightRef.current = false;
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [
    attempt,
    createOrganization,
    decision,
    setActive,
    user?.firstName,
    userMemberships,
  ]);

  function retry() {
    setFailed(false);
    setEmptyListVerified(false);
    setAttempt((value) => value + 1);
  }

  if (decision.type === "bypass" || decision.type === "ready") {
    return children;
  }

  return (
    <BootstrapSurface
      error={decision.type === "error"}
      onRetry={retry}
      onSignOut={() => signOut({ redirectUrl: "/" })}
    />
  );
}
```

Before accepting the component:

- Replace `btn-primary` and `btn-secondary` with the project’s actual button component/classes if those aliases do not exist.
- Ensure button icons and text have the same inline layout as the Design System example.
- Confirm the Clerk package exports `useOrganizationList` from the project’s current import path.
- Keep the `inFlightRef` guard; React Strict Mode must not issue duplicate create calls.

### Step 3: Verify the boundary

Run:

```bash
cd frontend
npm run test -- src/auth/organization-bootstrap.test.js src/auth/OrganizationBootstrap.test.js
npm run lint
```

Expected: all tests and lint pass.

Commit:

```bash
git add frontend/src/auth/OrganizationBootstrap.jsx frontend/src/auth/OrganizationBootstrap.test.js
git commit -m "feat: bootstrap store organization"
```

## Task 4: Block Tenant-Scoped POS Mounting Until Organization Is Active

**Files:**

- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/App.test.js`

### Step 1: Add a failing wiring test

In `frontend/src/App.test.js`, add:

```js
it("gates signed-in POS mounting behind organization bootstrap", () => {
  expect(mainSource).toContain(
    'import OrganizationBootstrap from "./auth/OrganizationBootstrap"',
  );
  expect(mainSource).toContain("<OrganizationBootstrap>");
  expect(mainSource).toContain("</OrganizationBootstrap>");
});
```

If the file uses a different source variable name, use its existing convention.

Run:

```bash
cd frontend
npm run test -- src/App.test.js
```

Expected: FAIL because `main.jsx` is not wired yet.

### Step 2: Wire the boundary above the POS provider

Add to `frontend/src/main.jsx`:

```jsx
import OrganizationBootstrap from "./auth/OrganizationBootstrap";
```

Change the signed-in return path so the provider and application only mount after Clerk exposes an organization:

```jsx
return isSignedIn ? (
  <OrganizationBootstrap>
    <POSStoreProvider api={api} currentUser={currentUser}>
      <App />
    </POSStoreProvider>
  </OrganizationBootstrap>
) : (
  <App />
);
```

Keep the existing Clerk token request with:

```js
organizationId: orgId || undefined
```

This remains defense in depth, while the boundary ensures normal signed-in POS requests are not made without `orgId`.

### Step 3: Verify and commit the wiring

Run:

```bash
cd frontend
npm run test -- src/App.test.js src/auth/organization-bootstrap.test.js src/auth/OrganizationBootstrap.test.js
npm run lint
```

Expected: all commands pass.

Commit:

```bash
git add -p frontend/src/main.jsx frontend/src/App.test.js
git diff --cached --check
git diff --cached
git commit -m "feat: gate POS startup on active organization"
```

Both files already contain uncommitted Agentation-related changes. Stage only
the organization-bootstrap import, wrapper, and regression test hunks.

## Task 5: Configure Clerk Development and Production Instances

**External changes:** Clerk Dashboard

Perform these steps in both the development and production Clerk instances:

1. Open **Organizations** settings.
2. Enable Organizations.
3. Require organization membership for application access.
4. Enable **Create first organization automatically**.
5. Set the personalized organization name to:

   ```text
   Toko {{user.first_name}}
   ```

6. Set the fallback organization name to:

   ```text
   Toko Saya
   ```

7. Save and publish the settings.

Do not claim production is configured until the production Clerk instance has been inspected and saved. Dashboard configuration is the primary path; the client boundary is a fallback, not a replacement for it.

## Task 6: End-to-End Verification

### Step 1: Run the full frontend test suite

```bash
cd frontend
npm run test
```

Expected: all tests pass.

### Step 2: Build the production bundle

```bash
cd frontend
npm run build
```

Expected: Vite production build succeeds.

### Step 3: Check formatting and unintended changes

```bash
git diff --check
git status --short --branch
```

Expected:

- `git diff --check` has no output.
- Status contains only the intended commits plus the previously preserved scanner/Agentation work if it has not yet been committed.

### Step 4: Manual development-instance scenarios

Verify each scenario with network throttling off and then once with Slow 3G:

1. **New registration:** user lands on the bootstrap state briefly, receives `Toko {first name}` or `Toko Saya`, and enters the POS without an organization picker.
2. **Existing user with no active organization:** the first existing membership is activated; no new organization is created.
3. **Returning user with active organization:** POS opens normally without visible bootstrap delay.
4. **Transient network failure:** error state appears with working `Coba lagi` and `Keluar`.
5. **React Strict Mode:** a new user receives exactly one organization.
6. **API tenant token:** authenticated POS requests include Clerk’s active organization and no longer receive `403 ORGANIZATION_REQUIRED`.
7. **Signed-out route:** sign-in and sign-up pages remain accessible because signed-out users bypass the organization gate.

### Step 5: Production smoke test

After deployment and Clerk production configuration:

1. Register a fresh production smoke-test account.
2. Confirm the created organization name.
3. Confirm direct entry into the POS.
4. Confirm one organization only.
5. Confirm one successful tenant-scoped API request.
6. Remove the smoke-test account and organization through the approved administrative process.

## Final Acceptance Criteria

- New users do not manually choose an organization.
- Existing memberships are reused before any organization is created.
- A confirmed-empty membership list produces `Toko {first name}` or `Toko Saya`.
- The POS provider never mounts for a signed-in user without an active organization.
- Failure recovery is accessible and does not expose raw Clerk errors.
- Clerk development and production settings match.
- Design System page and `frontend/DESIGN.md` document the shipped states.
- Frontend tests, lint, production build, and manual onboarding scenarios pass.
