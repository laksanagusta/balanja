import test from "node:test";
import assert from "node:assert/strict";
import { upgradeContacts } from "./contact-links.js";

test("builds encoded WhatsApp and email upgrade links", () => {
  const contact = upgradeContacts({
    whatsapp: "+62 812-3456-789",
    email: "upgrade@example.com",
    storeName: "Toko A & B",
    supportReference: "ABC123",
  });
  assert.match(contact.whatsapp, /^https:\/\/wa\.me\/628123456789\?text=/);
  assert.match(decodeURIComponent(contact.whatsapp), /Toko A & B/);
  assert.match(contact.email, /^mailto:upgrade@example\.com\?/);
  assert.doesNotMatch(contact.whatsapp, /token|transaction/i);
});

test("omits invalid contact channels", () => {
  assert.deepEqual(upgradeContacts({ whatsapp: "abc", email: "bad" }), {});
});
