import test from "node:test";
import assert from "node:assert/strict";
import { normalizePath, routeAccess } from "./routing.js";

test("public landing and login routes stay public", () => {
  assert.equal(routeAccess("/"), "public");
  assert.equal(routeAccess("/login"), "public");
  assert.equal(normalizePath("/", false), "/");
  assert.equal(normalizePath("/login", false), "/login");
});

test("signed-in users opening the landing route go directly to dashboard", () => {
  assert.equal(normalizePath("/", true, false), "/");
  assert.equal(normalizePath("/", true, true), "/dashboard");
});

test("signed-out users are sent from private routes to login", () => {
  assert.equal(routeAccess("/pos"), "private");
  assert.equal(normalizePath("/pos", false, false), "/pos");
  assert.equal(normalizePath("/pos", false), "/login");
  assert.equal(normalizePath("/dashboard", false), "/login");
});

test("signed-in users retain private routes", () => {
  assert.equal(normalizePath("/pos", true), "/pos");
  assert.equal(normalizePath("/design-system", true), "/design-system");
});

test("unknown paths fall back by authentication state", () => {
  assert.equal(normalizePath("/missing", false), "/");
  assert.equal(normalizePath("/missing", true), "/dashboard");
});
