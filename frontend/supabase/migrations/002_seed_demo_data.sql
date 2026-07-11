-- Seed demo data for a test org.
-- Replace 'org_test_demo' with a real Clerk org_id before running in production.

insert into store_settings (org_id, store_name, store_address, tax_enabled, tax_rate, qris_label)
values ('org_test_demo', 'Toko Balanja', 'Jl. UMKM No. 1', false, 11, 'QRIS Toko Balanja')
on conflict (org_id) do nothing;

insert into products (org_id, name, barcode, category, price, stock, unit, image, active, created_at, updated_at)
values
  ('org_test_demo', 'Beras Ramos 5kg', '8991001000011', 'Sembako', 72000, 18, 'pack', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Gula Pasir 1kg', '8991001000028', 'Sembako', 17500, 24, 'pack', 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Mie Instan Goreng', '8991001000035', 'Snack', 3500, 80, 'pcs', 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Air Mineral 600ml', '8991001000042', 'Minuman', 4000, 64, 'botol', 'https://images.unsplash.com/photo-1616118132534-381148898bb4?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Sabun Mandi Batang', '8991001000059', 'Perawatan', 5500, 36, 'pcs', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=600&q=80', true, now(), now()),
  ('org_test_demo', 'Deterjen Bubuk 800g', '8991001000066', 'Rumah Tangga', 18500, 20, 'pack', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80', true, now(), now())
on conflict (org_id, barcode) do nothing;
