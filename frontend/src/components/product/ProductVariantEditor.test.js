import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("variant editor uses structured tokens, attribute menus, and safe removal confirmation", async () => {
  const source = await readFile(new URL("./ProductVariantEditor.jsx", import.meta.url), "utf8");

  assert.match(source, /function AttributeTokenField/);
  assert.match(source, /event\.key === ","/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /Icon name="enter"/);
  assert.match(source, /aria-label="Tambahkan pilihan"/);
  assert.match(source, /ui-input-hitbox/);
  assert.match(source, /inline-flex h-7 max-w-full/);
  assert.match(source, /relative grid h-7 w-7/);
  assert.match(source, /event\.key === "Backspace"/);
  assert.match(source, /event\.key === "ArrowLeft"/);
  assert.match(source, /Ubah nama/);
  assert.match(source, /Duplikat atribut/);
  assert.match(source, /Ubah urutan/);
  assert.match(source, /Hapus atribut/);
  assert.match(source, /querySelectorAll\('\[role="menuitem"\]:not\(\[disabled\]\)'\)/);
  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /Hapus atribut ‘\{pendingDelete\?\.name \|\| attribute\.name\}’\?/);
  assert.match(source, /Data harga, stok, dan barcode dari variasi yang terkait juga akan dihapus/);
  assert.match(source, /<Button ref=\{\(node\) => \{ pendingDeleteCancelRefs\.current\[index\] = node; \}\} type="button" size="sm"/);
  assert.match(source, /<Button type="button" size="sm" variant="danger"/);
  assert.match(source, /<Icon name="plus" className="size-4" strokeWidth=\{2\.8\} strokeLinecap="round" strokeLinejoin="round" \/>/);
  assert.match(source, /attribute-field-state flex flex-wrap items-center justify-between gap-3 rounded-panel bg-danger-soft\/50/);
  assert.doesNotMatch(source, /attribute-field-state flex flex-wrap items-center justify-between gap-3 rounded-panel border border-danger\/20/);
  assert.match(source, /pendingDeleteCancelRefs/);
  assert.match(source, /attribute-field-crossfade/);
  assert.match(source, /attribute-field-state/);
  assert.doesNotMatch(source, /role="alert" aria-hidden=\{!isDeletePending\} aria-labelledby=\{`remove-attribute-\$\{attributeId\}`\}/);
  assert.match(source, /aria-hidden=\{!isDeletePending\} aria-labelledby=\{`remove-attribute-\$\{attributeId\}`\}/);
  assert.doesNotMatch(source, /<div className="grid gap-1 border-y border-dashed border-border px-4 py-6">/);
  assert.match(source, /addAttributeRef/);
});

test("variant editor renders a semantic desktop table and a mobile disclosure flow", async () => {
  const source = await readFile(new URL("./ProductVariantEditor.jsx", import.meta.url), "utf8");

  assert.match(source, /<table/);
  assert.match(source, /<thead/);
  assert.doesNotMatch(source, /<div className="hidden border-b border-border md:block">/);
  assert.match(source, /Variasi/);
  assert.match(source, /Barcode \(opsional\)/);
  assert.match(source, /Dijual/);
  assert.match(source, /hidden[^\"]*md:block/);
  assert.match(source, /md:hidden/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /aria-controls=\{panelId\}/);
  assert.match(source, /role="region"/);
  assert.match(source, /variant-panel \$\{expanded \? "is-open" : ""\}/);
  assert.doesNotMatch(source, /Kembali ke variasi/);
  assert.doesNotMatch(source, /<h4/);
  assert.match(source, /window\.matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(source, /aria-label=\{`Tersedia untuk dijual, variasi \$\{label\}`\}/);
  assert.match(source, /aria-label=\{`Pindai barcode untuk variasi \$\{label\}`\}/);
  assert.match(source, /size-11/);
  assert.doesNotMatch(source, /hideLabel \? "mt-0" : "mt-7"/);
  assert.match(source, /label="Harga"[\s\S]{0,180}accessibleLabel=\{`Harga, variasi \$\{label\}`\}/);
  assert.match(source, /label="Stok"[\s\S]{0,180}accessibleLabel=\{`Stok, variasi \$\{label\}`\}/);
  assert.match(source, /<label htmlFor=\{id\}[^>]*>Barcode \(opsional\)<\/label>/);
  assert.match(source, /stacked \? "flex items-center justify-between gap-3" : "flex justify-center"/);
  assert.match(source, /setMobileVariantKey\(\(current\) => \(current === key \? "" : key\)\)/);
  assert.doesNotMatch(source, /key=\{index\}/);
});

test("variant editor separates price, stock, and status bulk actions with undo feedback", async () => {
  const source = await readFile(new URL("./ProductVariantEditor.jsx", import.meta.url), "utf8");

  assert.match(source, /Edit massal/);
  assert.match(source, /Atur harga/);
  assert.match(source, /Atur stok/);
  assert.match(source, /Ubah status/);
  assert.match(source, /radius="rounded-full"/);
  assert.match(source, /aria-label="Tambah atribut"[\s\S]{0,180}radius="rounded-full"/);
  assert.match(source, /Aktifkan semua/);
  assert.match(source, /Nonaktifkan semua/);
  assert.match(source, /Urungkan/);
  assert.match(source, /role="status"/);
  assert.doesNotMatch(source, /bg-warning-soft/);
  assert.doesNotMatch(source, /Harga untuk semua/);
  assert.doesNotMatch(source, /Terapkan ke semua/);
});

test("variant editor keeps currency prefixes and reduced-motion-safe structural feedback", async () => {
  const source = await readFile(new URL("./ProductVariantEditor.jsx", import.meta.url), "utf8");

  assert.match(source, /leftSlot=\{<span[^>]*>Rp<\/span>\}/);
  assert.match(source, /tabular-nums/);
  assert.match(source, /motion-reduce:transition-none/);
  assert.match(source, /aria-live="polite"/);
  assert.doesNotMatch(source, /font-mono/);
  assert.match(source, /variant-popover-exit/);
  assert.doesNotMatch(source, /variant-token-out/);
});

test("correcting a variant field does not retrigger mobile validation focus", async () => {
  const source = await readFile(new URL("./ProductVariantEditor.jsx", import.meta.url), "utf8");
  const productsPage = await readFile(new URL("../../pages/ProductsPage.jsx", import.meta.url), "utf8");

  assert.match(source, /firstVariantErrorKey\(errors\.variantRows\)/);
  assert.match(source, /\[errors\.variantFocusRequest, mobileVariantKey\]/);
  assert.doesNotMatch(source, /\[errors\.variantRows, mobileVariantKey\]/);
  assert.match(productsPage, /variantRows: clearVariantFieldError\(current\.variantRows, key, field\)/);
});
