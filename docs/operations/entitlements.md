# Entitlement Operations

Runbook ini digunakan untuk mengaktifkan atau menangguhkan akses checkout
berbayar. Semua perubahan status dilakukan dari CLI privat, memakai koneksi
owner database, dan menghasilkan audit row.

## Safety rules

- Simpan `ADMIN_DATABASE_URL` hanya di secret manager atau shell operator.
- Jangan menaruh URL tersebut di argumen CLI, repository, server aplikasi,
  screenshot, tiket, atau riwayat chat.
- Jangan gunakan koneksi runtime `balanja_api`; role tersebut sengaja tidak
  dapat menulis audit.
- Jangan mengubah `transactions_used`, `transaction_limit`, atau status lewat
  SQL manual. Gunakan CLI agar transisi terkunci, idempotent, dan teraudit.
- Cocokkan Clerk organization ID, bukti pembayaran, dan support reference
  sebelum aktivasi.

## Activate a paid store

Jalankan dari mesin operator yang memiliki Go dan akses database. Masukkan URL
melalui prompt tersembunyi agar credential tidak tersimpan sebagai argumen atau
teks perintah:

```bash
cd backend
read -rsp 'Admin database URL: ' ADMIN_DATABASE_URL
echo
export ADMIN_DATABASE_URL
go run ./cmd/entitlement \
  --org-id org_123 \
  --status paid_active \
  --actor operator@example.com \
  --note "invoice INV-12 paid"
unset ADMIN_DATABASE_URL
```

Perintah aman dijalankan ulang. Jika tenant sudah `paid_active`, CLI tidak
menulis audit duplikat.

## Suspend checkout

Suspensi hanya menghentikan checkout baru. Data dan halaman baca tenant tetap
tersedia.

```bash
cd backend
read -rsp 'Admin database URL: ' ADMIN_DATABASE_URL
echo
export ADMIN_DATABASE_URL
go run ./cmd/entitlement \
  --org-id org_123 \
  --status paid_suspended \
  --actor operator@example.com \
  --note "subscription expired"
unset ADMIN_DATABASE_URL
```

Aktifkan kembali menggunakan perintah `paid_active`. Tidak ada perintah untuk
mereset tenant ke trial.

## Verify

Sebagai user tenant yang sedang login, periksa endpoint berikut:

```bash
curl --fail --show-error \
  -H "Authorization: Bearer <CLERK_TOKEN>" \
  https://pos.marvcore.com/api/v1/entitlement
```

Respons aktif harus menunjukkan `status: "paid_active"`,
`transactionLimit: null`, dan `canCheckout: true`. Di POS, tombol
`Periksa status pembayaran` memuat ulang status tanpa sign-out.

Operator dapat memeriksa status dan audit menggunakan koneksi owner:

```sql
select
  org_id, status, transaction_limit, transactions_used,
  support_reference, activated_at, activated_by, suspended_at, updated_at
from organization_entitlements
where org_id = 'org_123';

select
  actor, previous_status, new_status, note, created_at
from organization_entitlement_audit
where org_id = 'org_123'
order by created_at desc;
```

Jangan menyalin hasil query yang memuat data tenant ke channel publik.

## Rollout and rollback

Migration `000012_organization_entitlements.up.sql` mengklasifikasikan seluruh
organisasi yang sudah ada sebagai `paid_active`. Ini mencegah accidental
lockout saat fitur pertama kali dirilis. Review organisasi lama satu per satu
sebelum melakukan suspensi.

Rollback aplikasi dilakukan dengan deploy image sebelumnya. Tabel entitlement
tetap dipertahankan agar status dan audit tidak hilang. Untuk insiden schema
setelah production live, gunakan forward-fix migration; jangan menjalankan down
migration yang menghapus tabel.

## Smoke test

Gunakan tenant staging, bukan tenant production:

1. Organisasi baru memperoleh `trial`, limit 50, usage 0.
2. Checkout pada usage 49 berhasil dan mengubah usage menjadi 50.
3. Checkout baru berikutnya mengembalikan HTTP 402 dengan kode
   `PLAN_TRANSACTION_LIMIT_REACHED`.
4. Cart tetap berisi dan hanya final checkout yang diblokir.
5. Link WhatsApp/email hanya berisi nama toko dan support reference.
6. Aktivasi CLI mengubah status menjadi `paid_active`.
7. Refresh status di POS mengaktifkan checkout tanpa login ulang.
8. Suspensi memblokir checkout, tetapi halaman baca tetap tersedia.
