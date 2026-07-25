# Automatic Organization Onboarding Design

## Summary

Balanja uses a Clerk Organization ID as the tenant identifier for every product,
stock movement, transaction, report, and store setting. New users currently have
to understand and select an organization before they can use the application.
That exposes an infrastructure concept during onboarding and leaves authenticated
users without an active `org_id` unable to call the API.

New users should instead receive one organization automatically, named
`Toko {first name}`, and enter the application with that organization active.
Organization selection is not part of the initial onboarding flow.

## Goals

- Automatically create the first Clerk Organization for a new user.
- Name it `Toko {first name}` when a first name is available.
- Fall back to `Toko Saya` when no usable first name is available.
- Automatically activate the user's sole organization when no organization is
  active.
- Prevent the POS application from issuing tenant API requests until an
  organization is active.
- Recover accounts that were created before automatic organization creation was
  enabled.
- Provide an actionable retry state when organization provisioning fails.

## Non-Goals

- Building a multi-store switcher.
- Allowing organization creation from the application UI.
- Synchronizing the Clerk Organization name with `store_settings.store_name`.
- Adding Clerk webhooks or Clerk Backend SDK credentials.
- Changing database tenant isolation or the `org_id` JWT contract.

## Recommended Approach

Use Clerk's native automatic first-organization setting as the primary path and
add a client-side bootstrap boundary as a recovery path.

The Clerk Dashboard configuration owns the normal sign-up experience:

1. Enable Organizations.
2. Keep organization membership required.
3. Enable **Create first organization automatically**.
4. Configure default naming rules to personalize the name as
   `Toko {{user.first_name}}`.
5. Configure `Toko Saya` as the fallback name.

The application cannot manage these instance settings from this repository. They
must be applied manually in the production and development Clerk instances.

## Application Architecture

Add an `OrganizationBootstrap` component inside `ClerkProvider` and above
`Application`. It owns organization readiness and renders its children only
after Clerk is loaded and an organization is active.

The component uses:

- `useAuth()` for sign-in and active `orgId` state;
- `useUser()` for the organization display-name source;
- `useOrganizationList({ userMemberships: true })` for memberships,
  `createOrganization`, and `setActive`.

Organization bootstrap logic should live in a small plain JavaScript module so
name derivation and state decisions can be tested without rendering Clerk.

## State and Data Flow

The bootstrap boundary follows this order:

1. While Clerk authentication or organization memberships are loading, show the
   onboarding loading surface.
2. If the user is signed out, render the public application immediately.
3. If `orgId` is already present, render the signed-in application.
4. If memberships contain an organization but none is active, activate the
   first membership and wait for `orgId` to update.
5. If memberships are loaded and empty, re-check the latest membership data
   before creating an organization.
6. Create one organization using the derived name, activate the returned
   organization ID, then wait for Clerk session state to expose that active
   `orgId`.
7. Only then mount `POSStoreProvider` and tenant-owned pages.

The default organization name is derived as follows:

1. Trim the user's first name.
2. If non-empty, use `Toko {first name}`.
3. Otherwise use `Toko Saya`.

Email addresses, usernames, and full names are not used as fallback organization
names.

## Duplicate-Creation Protection

Clerk Dashboard automatic creation is the authoritative path. The fallback must
not create a second organization when Clerk has already provisioned one.

The application adds these guards:

- Wait for `userMemberships.isLoading` to become false before deciding that the
  list is empty.
- Keep one in-flight bootstrap promise per mounted boundary.
- Revalidate or fetch the latest membership page immediately before fallback
  creation.
- If a membership appears after revalidation, activate it instead of creating.
- Treat a creation conflict as a signal to reload memberships and activate the
  resulting membership.
- Do not retry creation automatically in a loop.

These guards cover React Strict Mode effect replay and normal configuration
timing. Cross-tab creation is expected to be rare because Clerk's native
automatic creation runs before the application fallback.

## User Experience

The bootstrap loading surface uses the existing application background and a
compact centered status:

- Title: `Menyiapkan toko Anda`
- Supporting copy: `Kami sedang menyiapkan ruang kerja pertama Anda.`
- An accessible busy state using `aria-busy` and a polite status announcement.

If provisioning fails, retain the same surface and replace the loading status
with:

- Title: `Toko belum dapat disiapkan`
- Supporting copy: a concise Indonesian error without exposing Clerk internals.
- Primary action: `Coba lagi`
- Secondary action: sign out, so the user is never trapped in an unusable
  authenticated session.

No organization picker, organization terminology, or organization creation form
appears in initial onboarding.

## Error Handling

- Clerk loading errors remain within Clerk's authentication UI.
- Membership fetch, organization creation, and activation failures are caught by
  the bootstrap boundary.
- Retry clears the local failure state and performs a fresh membership check
  before attempting any creation.
- Errors are not persisted across sign-out.
- Raw Clerk error objects, identifiers, and stack traces are not shown to users.
- The POS store and API client remain unmounted while provisioning is failed or
  incomplete.

## Tenant and Security Invariants

- The backend continues to require a verified JWT with `sub` and `org_id`.
- The client never supplies a tenant ID in API bodies, paths, or custom headers.
- `getToken()` continues to request a token for the active Clerk organization.
- No tenant-owned request may occur before `orgId` is active.
- Existing explicit `org_id` repository predicates and PostgreSQL tenant context
  remain unchanged.

## Design-System Updates

Before production component changes:

- Add the automatic first-store onboarding contract to `frontend/DESIGN.md`.
- Add a compact onboarding state example to `DesignSystemPage` or its dedicated
  design showcase.
- Reuse existing surface, typography, button, focus, and loading primitives.
- Do not introduce a new visual language solely for onboarding.

## Testing

Add focused tests for:

- `Toko {first name}` name derivation.
- `Toko Saya` fallback name derivation.
- Signed-out users bypass organization provisioning.
- An existing active organization mounts the application immediately.
- A sole inactive membership is activated without creating another.
- An empty, fully loaded membership list creates and activates one organization.
- React Strict Mode effect replay does not start overlapping creation.
- A membership that appears during revalidation is activated instead of
  creating another organization.
- Provisioning failure shows retry and sign-out actions.
- Retry checks memberships again before creation.
- `POSStoreProvider` is not mounted before an active `orgId` exists.

Run the full frontend test suite and production build. The Clerk Dashboard
configuration must additionally be verified manually in both development and
production instances with a fresh email address.

## Rollout

1. Apply the Clerk Dashboard organization and naming settings in development.
2. Implement and verify the application bootstrap boundary.
3. Test a fresh sign-up, an existing account without an organization, and an
   existing account with one organization.
4. Apply the same Clerk settings in production.
5. Deploy the application changes.
6. Run a production fresh-account smoke test and confirm the session JWT carries
   the active `org_id`.

## Success Criteria

- A new user completes sign-up without seeing an organization picker.
- The first organization is named `Toko {first name}` or `Toko Saya`.
- The organization is active before the first tenant API request.
- Existing organization members are not assigned an extra organization.
- Recoverable failures offer retry and sign-out instead of a broken dashboard.
