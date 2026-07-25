import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("organization bootstrap uses Clerk memberships and guarded creation", async () => {
  const source = await readFile(
    new URL("./OrganizationBootstrap.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useOrganizationList/);
  assert.match(source, /userMemberships:\s*true/);
  assert.match(source, /userMemberships\.revalidate\(\)/);
  assert.match(source, /createOrganization\(\{/);
  assert.match(source, /setActive\(\{\s*organization:/);
  assert.match(source, /inFlightRef\.current/);
});

test("organization bootstrap loading surface is accessible", async () => {
  const source = await readFile(
    new URL("./OrganizationBootstrap.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /Menyiapkan toko Anda/);
  assert.match(source, /Kami sedang menghubungkan akun Anda ke toko\./);
});

test("organization bootstrap error surface offers retry and sign out", async () => {
  const source = await readFile(
    new URL("./OrganizationBootstrap.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /role="alert"/);
  assert.match(source, /Toko belum berhasil disiapkan/);
  assert.match(source, /Coba lagi/);
  assert.match(source, /Keluar/);
});
