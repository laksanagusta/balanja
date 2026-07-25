import test from "node:test";
import assert from "node:assert/strict";
import {
  organizationBootstrapDecision,
  organizationName,
} from "./organization-bootstrap.js";

const base = {
  authLoaded: true,
  signedIn: true,
  organizationId: null,
  organizationListLoaded: true,
  membershipsLoading: false,
  memberships: [],
  emptyListVerified: false,
  failure: null,
};

test("organization name uses the trimmed first name", () => {
  assert.equal(organizationName("  Dika "), "Toko Dika");
});

test("organization name has a safe fallback", () => {
  assert.equal(organizationName(), "Toko Saya");
  assert.equal(organizationName("   "), "Toko Saya");
});

test("bootstrap waits for authentication to load", () => {
  assert.deepEqual(
    organizationBootstrapDecision({ ...base, authLoaded: false }),
    { type: "loading" },
  );
});

test("bootstrap bypasses signed-out users", () => {
  assert.deepEqual(
    organizationBootstrapDecision({ ...base, signedIn: false }),
    { type: "bypass" },
  );
});

test("bootstrap is ready when an organization is active", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      organizationId: "org_active",
    }),
    { type: "ready" },
  );
});

test("bootstrap waits for the membership list", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      organizationListLoaded: false,
    }),
    { type: "loading" },
  );
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      membershipsLoading: true,
    }),
    { type: "loading" },
  );
});

test("bootstrap activates the first existing membership", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      memberships: [{ organization: { id: "org_existing" } }],
    }),
    { type: "activate", organizationId: "org_existing" },
  );
});

test("bootstrap revalidates an initially empty membership list", () => {
  assert.deepEqual(
    organizationBootstrapDecision(base),
    { type: "revalidate" },
  );
});

test("bootstrap creates only after the empty list is verified", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      emptyListVerified: true,
    }),
    { type: "create" },
  );
});

test("bootstrap exposes an unrecovered failure", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      emptyListVerified: true,
      failure: "create",
    }),
    { type: "error" },
  );
});

test("bootstrap prefers a recovered membership over a prior failure", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      failure: "create",
      memberships: [{ organization: { id: "org_recovered" } }],
    }),
    { type: "activate", organizationId: "org_recovered" },
  );
});

test("bootstrap stops retrying after activation fails", () => {
  assert.deepEqual(
    organizationBootstrapDecision({
      ...base,
      failure: "activate",
      memberships: [{ organization: { id: "org_unavailable" } }],
    }),
    { type: "error" },
  );
});
