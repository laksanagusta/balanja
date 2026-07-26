# Trial and Paid Entitlement Limits Design

Date: 2026-07-26
Status: Approved for user review

## Summary

Balanja will use a contact-assisted upgrade model with self-service trial
registration. Every new store can use the complete product without a time limit,
but it can complete at most 50 lifetime transactions. When the quota is
exhausted, only new checkout is blocked. The store retains access to its
products, stock, transaction history, dashboard, reports, settings, and existing
data.

The owner can contact Balanja through a configured WhatsApp number or email
address. After payment is verified outside the application, an administrator
manually changes the store entitlement to paid. Paid stores receive unlimited
transactions while retaining reasonable product, staff, storage, and
single-store limits.

The entitlement belongs to the Clerk organization ID used as Balanja's tenant
identifier. The backend and database are the authoritative enforcement layer;
frontend checks exist only to provide timely feedback.

## Product Context

Balanja is a multi-tenant retail POS SaaS for Indonesian microbusinesses. Its
current operational surface includes cashier checkout, products, stock
movements, transaction history, dashboard analytics, sales reports, settings,
and product photos. Clerk provides authentication and organization identity,
while the Go API and PostgreSQL database own tenant data.

The first paid offering targets a single warung or micro-retail store with one
or two staff members and no more than approximately 1,000 active products. The
initial commercial operation will not include self-service payments or
automatic subscription activation.

## Goals

- Let anyone register and experience the complete Balanja product.
- Bound unpaid operational use to 50 successfully completed transactions.
- Prevent frontend or direct API clients from bypassing the transaction limit.
- Keep existing store data accessible after the trial quota is exhausted.
- Direct qualified users to WhatsApp or email for a paid upgrade.
- Let an administrator activate or suspend a store safely and audibly.
- Make transactions the only entitlement difference between trial and paid.
- Protect the service with reasonable per-store resource limits.
- Capture enough funnel data to evaluate whether the trial drives paid contact.

## Non-Goals

- A self-service checkout or payment gateway.
- Automatic payment reconciliation.
- Multiple paid tiers.
- A recurring monthly free transaction allowance.
- Trial expiration by date.
- Transaction credit purchases or promotional top-ups.
- Multi-store subscriptions.
- User-created replacement organizations for resetting a trial.
- Deleting or hiding store data after the quota is exhausted.
- Automatically resetting a suspended paid store to trial.

## Considered Approaches

### Selected: binary organization entitlement

Each organization has one entitlement state. A trial organization can complete
50 transactions; a paid organization has no transaction ceiling. This model is
easy to explain, enforce, audit, and operate manually.

### Rejected: transaction credit ledger

A credit ledger would support top-ups and promotions, but introduces balances,
adjustments, expiration, and reconciliation concepts that are not required by
the initial one-plan business model.

### Rejected: soft limit with grace transactions

A grace band after transaction 50 would reduce operational interruption but make
the commercial boundary ambiguous and easier to exploit. Clear warnings before
the hard limit provide a better trade-off.

## Package Contract

| Capability | Trial | Paid |
| --- | ---: | ---: |
| Expiration | None | While entitlement is active |
| Successfully completed transactions | 50 lifetime | Unlimited |
| Product features | Complete | Complete |
| Active products | 1,000 | 1,000 |
| Active staff | 2 | 2 |
| Product-photo storage | 1 GB | 1 GB |
| Stores per subscription | 1 | 1 |

The product must describe the paid benefit as **unlimited transactions**, not
claim that every resource is unlimited.

Only successfully committed transactions consume the trial quota. A failed or
aborted checkout does not consume it. A completed transaction continues to
count if a future void or refund capability changes its business status because
the original operational capacity was already consumed. Archived products and
historical transactions do not count toward the active-product limit.

Product, staff, and storage limits are common safeguards rather than differences
between trial and paid. Staff enforcement depends on Clerk organization
membership controls and must not be advertised as enforced until the
invitation/membership path applies the two-member maximum.

## Trial User Experience

The application displays quota usage without dominating normal cashier work:

- Usage 0–39: a compact `x dari 50 transaksi digunakan` indicator.
- Transaction 40 onward: a light upgrade reminder.
- Transaction 45 onward: a prominent cashier-page warning and upgrade action.
- Transaction 50: checkout succeeds, then subsequent checkout is blocked.

When the quota is exhausted:

- Products, stock, history, dashboard, reports, and settings remain usable.
- Users can build and edit a cart so current work is not discarded.
- The checkout action becomes `Upgrade untuk melanjutkan`.
- The upgrade surface offers only contact channels configured for the
  deployment.
- Quota does not reset automatically or on sign-out.

The contact message is prefilled with the store display name and a safe support
reference:

`Halo, saya ingin mengaktifkan paket berbayar Balanja untuk Toko [nama toko]. ID toko: [referensi dukungan].`

The support reference must not expose secrets, raw tokens, transaction contents,
customer data, or other sensitive internal identifiers. WhatsApp and email
addresses are deployment configuration, not duplicated literals across UI
components. If only one channel is valid, the UI shows only that channel.

## Paid Activation Experience

Payment and customer verification occur outside Balanja. After verification, an
administrator changes the organization to `paid_active`.

The application refreshes entitlement state and immediately enables checkout
without requiring a new account, organization, or data migration. The upgrade
surface includes `Periksa status pembayaran` so the user can request a fresh
entitlement read after an administrator activates the store.

If the paid service is later suspended, checkout is blocked and existing data
remains accessible. The store is not returned to trial and does not receive a
new block of 50 transactions.

## Entitlement Model

The backend owns one entitlement record per `org_id`. Its minimum logical
fields are:

- `org_id`
- `status`: `trial`, `paid_active`, or `paid_suspended`
- `transaction_limit`: 50 for trial and null for paid
- `transactions_used`
- `activated_at`
- `activated_by`
- `suspended_at`
- an optional administrative note
- creation and update timestamps

`transactions_used` is a lifetime usage counter. It is retained when a trial
becomes paid or a paid store is suspended. Administrative transitions and
repeated commands must not reset it.

New organizations receive a trial entitlement during organization bootstrap.
Existing organizations require an explicit migration classification. The
rollout must not silently classify every existing production organization as a
fresh trial.

## Checkout Enforcement and Data Flow

Frontend state helps users understand the limit, but only the backend may decide
whether checkout is permitted.

For each checkout:

1. Verify the Clerk JWT and resolve its active `org_id`.
2. Enter the existing database checkout transaction.
3. Resolve the checkout idempotency key before consuming new quota.
4. Lock the organization's entitlement record.
5. Reject a trial checkout when `transactions_used >= 50`.
6. Commit the business transaction, stock changes, and one usage increment
   atomically.
7. Return the updated entitlement summary to the client.

The transaction at usage 49 succeeds and advances usage to 50. The next new
checkout is rejected. If two devices attempt the last available transaction
concurrently, row locking allows only one new transaction to consume it.

A retry with the same idempotency key returns the original result and never
increments usage twice. A rejected checkout must not change stock, consume a
tenant transaction number, create transaction rows, or partially persist
idempotency state as a successful checkout.

The API exposes a stable machine-readable error code such as
`PLAN_TRANSACTION_LIMIT_REACHED`. The frontend does not infer a plan-limit error
from human-readable copy.

## Resource-Limit Enforcement

The backend enforces the 1,000 active-product maximum on create and restore
operations. Archiving a product frees one active-product slot.

Product-photo upload authorization checks the organization's tracked storage
usage before issuing or accepting a new upload. Replacement and deletion must
adjust usage based on the final stored object, tolerate retry, and avoid counting
the same object twice.

Clerk is the source of truth for organization membership. The two-staff limit is
enforced at every invitation or membership-creation boundary. If Balanja does
not yet expose staff management, the limit remains a package contract reserved
for that future boundary rather than a falsely advertised current control.

One paid entitlement covers exactly one Clerk organization. End users do not
receive a self-service organization-creation path that could produce additional
trial allocations.

## Manual Administration

Initial paid operations use a private command or administrator tool rather than
a public application endpoint. It:

- accepts an explicitly verified `org_id`;
- reports the current store name and entitlement before mutation;
- supports `paid_active` and `paid_suspended` transitions;
- records the actor, timestamp, previous status, new status, and note;
- is idempotent when the requested status is already active;
- never deletes or resets usage;
- produces an audit record in the same transaction as the status change.

The tool must require privileged backend access unavailable to ordinary tenant
users. Direct ad hoc database edits are not the supported activation workflow.

## Failure Handling

- If entitlement state cannot be read, the backend does not assume paid access.
- The frontend distinguishes an unavailable status from an exhausted quota.
- A network or server failure displays `Status paket belum dapat diperiksa` and
  offers `Coba lagi`.
- Cart contents survive limit rejection and transient failures.
- A `paid_suspended` store receives the contact-upgrade/recovery action without
  being reclassified as trial.
- Missing WhatsApp or email configuration removes that action; it does not
  render a broken link.
- If no valid contact channel is configured, deployment verification fails
  before the hard limit is enabled.

## Components and Responsibilities

- **Entitlement repository:** reads and row-locks organization entitlement,
  records usage, and performs audited state transitions.
- **Checkout policy:** decides whether a new checkout may consume quota inside
  the existing checkout transaction.
- **Entitlement API:** returns status, usage, limit, remaining amount, and
  relevant capabilities for the active organization.
- **Admin activation command:** performs privileged, audited status changes.
- **Quota indicator:** displays normal usage and warning thresholds.
- **Checkout limit state:** preserves the cart, blocks payment submission, and
  presents the upgrade action.
- **Contact action:** creates safe, deployment-configured WhatsApp and email
  links.

Each consumer uses capability fields returned by the backend rather than
duplicating status-to-permission rules throughout the frontend.

## Security and Tenant Invariants

- Every entitlement query and mutation is scoped to verified `org_id`.
- Tenant users cannot change entitlement status, limits, counters, or audit
  metadata.
- The client never supplies `transactions_used` or a paid capability as trusted
  input.
- Contact messages contain no authentication, payment, or transaction secrets.
- Database row-level tenant isolation remains enabled for tenant-readable
  entitlement summaries.
- Privileged audit details are not returned through the normal tenant API.

## Testing

Backend and database tests cover:

- Trial entitlement creation for a new organization.
- Transactions 1 through 50 succeeding exactly once.
- Transaction 51 returning the stable limit error.
- The 50th transaction succeeding under zero-based and one-based boundary
  conditions.
- Two concurrent checkouts contending for the last quota slot.
- Idempotent retries returning the original checkout without a second increment.
- Rejection leaving stock, counters, transactions, and idempotency state
  consistent.
- Paid activation enabling checkout without resetting data or usage.
- Repeated activation being idempotent.
- Suspension blocking new checkout while retaining data.
- Product create and restore respecting the active-product maximum.
- Cross-tenant entitlement reads and mutations being denied.
- Audit records matching every administrative status transition.

Frontend tests cover:

- Usage display before and after warning thresholds.
- The transaction-40 and transaction-45 warning treatments.
- Checkout replacement after the quota is exhausted.
- Cart preservation after limit and network errors.
- Correct distinction between limit exhaustion and status-read failure.
- Paid refresh enabling checkout without sign-in or organization replacement.
- WhatsApp and email link generation without sensitive data.
- Graceful behavior with one missing contact channel.

Production verification covers a new trial store, the 50th and 51st checkout,
manual activation, immediate entitlement refresh, suspended access, and both
configured contact channels.

## Rollout

1. Add entitlement and audit storage.
2. Add explicit entitlement classification for existing organizations.
3. Provision trial entitlements for newly bootstrapped organizations.
4. Add atomic checkout enforcement and stable API errors.
5. Add the private activation/suspension workflow.
6. Add quota indicators, warnings, and contact actions.
7. Verify trial, paid, and suspended organizations in staging.
8. Verify contact configuration in production.
9. Enable production warnings before the hard block.
10. Enable the hard checkout block after operational activation is proven.

## Metrics and Review

Track, per organization and without recording sensitive transaction contents:

- Signup to first completed transaction.
- Reach of transaction milestones 10, 25, 40, 45, and 50.
- WhatsApp and email upgrade-action clicks.
- Trial-to-paid conversion.
- Time from signup to transaction 50.
- Checkout attempts rejected by the limit.
- Manual activation failures and activation delay.

Review the strategy after 30–50 active trial organizations. Low reach of
transaction 10 points to onboarding or product-value problems rather than an
overly strict limit. High reach of transaction 50 with low contact intent points
to upgrade messaging, pricing, or perceived paid value. The quota should not be
raised without evidence from this funnel.

## Success Criteria

- A new store can register and use every current Balanja feature.
- Trial checkout stops only after 50 completed lifetime transactions.
- Direct API calls and concurrent devices cannot bypass the limit.
- Exhausted and suspended stores retain access to all existing data.
- A paid activation enables unlimited transactions without account or data
  migration.
- The user can contact Balanja through at least one working configured channel.
- Administrative changes are attributable and auditable.
- Product copy says `transaksi tanpa batas` and does not imply unlimited
  products, staff, stores, or storage.
