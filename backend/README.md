# Backend API

Go Fiber API untuk Balanja. Backend ini menjadi satu-satunya jalur baca/tulis data ke Supabase PostgreSQL.

## Requirements

- Go `1.25.x`
- PostgreSQL yang kompatibel dengan Supabase
- Clerk application dengan organization enabled

## Environment variables

Semua value dibaca dari `backend/.env` atau environment shell yang sudah di-export.

| Variable | Required | Notes |
| --- | --- | --- |
| `PORT` | no | Default `8080` |
| `DATABASE_URL` | yes | Supavisor session-pooler URL untuk role runtime `balanja_runtime` |
| `CLERK_ISSUER_URL` | yes | Contoh `https://clerk.example.lcl.dev` atau issuer production Clerk |
| `CLERK_AUDIENCE` | yes | Audience yang harus cocok dengan JWT template Clerk |
| `ALLOWED_ORIGINS` | no | CSV origin yang boleh melakukan CORS ke API |
| `DB_MAX_CONNS` | no | Default `10` |
| `SHUTDOWN_TIMEOUT` | no | Default `10s` |
| `R2_ENABLED` | no | Default `false`; aktifkan upload foto produk setelah semua konfigurasi R2 tersedia |
| `R2_ENDPOINT` | jika R2 aktif | Endpoint S3-compatible `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | jika R2 aktif | Access key backend untuk bucket foto produk |
| `R2_SECRET_ACCESS_KEY` | jika R2 aktif | Secret key backend; jangan pernah diekspos ke frontend atau log |
| `R2_BUCKET` | jika R2 aktif | Nama bucket foto produk |
| `R2_PUBLIC_BASE_URL` | jika R2 aktif | Domain publik/custom domain tanpa path object |

Credential R2 sebaiknya dibatasi ke operasi object put/delete pada bucket foto produk. Pembacaan gambar dilakukan melalui `R2_PUBLIC_BASE_URL`; credential tidak pernah dikirim ke browser.

## Routes

Public:

- `GET /healthz`
- `GET /readyz`

Protected:

- `GET /api/v1/products`
- `POST /api/v1/products`
- `PUT /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `GET /api/v1/transactions`
- `GET /api/v1/dashboard/summary?days=7|30`
- `POST /api/v1/checkout`

Semua route `/api/v1/*` butuh Clerk Bearer token yang valid dan memiliki `org_id`.

## Migrations

Skema aktif ada di [000001_init.up.sql](/Users/dikalaksana/Engineering/balanja/backend/migrations/000001_init.up.sql). Sebelum API dipakai, jalankan migration sebagai owner database:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-up
```

Untuk rollback development penuh:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-down
```

Untuk forward fix kolom transaksi yang sempat hilang di database lama:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0002
```

Untuk forward fix tabel idempotency checkout yang sempat hilang di database lama:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0003
```

Untuk forward fix tabel counter nomor transaksi yang sempat hilang di database lama:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0004
```

Untuk forward fix constraint `cashier_name` yang sempat `not null` di database lama:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0005
```

Untuk forward fix object checkout lama dari Supabase RPC/Edge Function path:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0006
```

Untuk forward fix tabel ledger stock movement:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
make migrate-fix-0007
```

## Runtime role provisioning

Migration hanya membuat role `balanja_api` tanpa login. Provisioning login role tetap dilakukan manual sebagai database owner:

```sql
create role balanja_runtime login inherit;
grant balanja_api to balanja_runtime;
alter role balanja_runtime set role balanja_api;
\password balanja_runtime
```

Gunakan credential `balanja_runtime` untuk `DATABASE_URL` runtime. Jangan pakai owner role Supabase di API.

## Local verification

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
cp .env.example .env
make run
go test ./... -race
```

`make` akan memuat `backend/.env` otomatis kalau file itu ada, jadi Anda tidak perlu `source .env` manual untuk target-target di atas.

Integration tests butuh environment tambahan:

- `TEST_DATABASE_URL`: connection owner/admin untuk apply migration test
- `TEST_RUNTIME_DATABASE_URL`: connection runtime role `balanja_runtime` untuk verifikasi RLS dan checkout

Contoh:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
TEST_DATABASE_URL="$TEST_DATABASE_URL" TEST_RUNTIME_DATABASE_URL="$TEST_RUNTIME_DATABASE_URL" go test ./internal/integration -tags=integration -race -count=1 -v
```
