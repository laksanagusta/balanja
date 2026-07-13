# Deployment Guide

Dokumen ini mengasumsikan target VPS Linux tunggal dengan Docker Engine + Docker Compose plugin, domain publik, dan stack di repo ini.

## 1. Provision external services

### Supabase

1. Siapkan project Supabase PostgreSQL.
2. Jalankan migration aktif sebagai owner database:

```bash
cd /Users/dikalaksana/Engineering/balanja
set -a
source .env
set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/000001_init.up.sql
```

3. Buat role runtime:

```sql
create role balanja_runtime login inherit;
grant balanja_api to balanja_runtime;
alter role balanja_runtime set role balanja_api;
\password balanja_runtime
```

4. Pakai URL Supavisor session pooler untuk role `balanja_runtime` sebagai `DATABASE_URL` runtime aplikasi.
5. Simpan backup owner credential di tempat terpisah; jangan masuk ke `.env` production API.

### Clerk

Set production issuer dan audience sesuai JWT yang benar-benar akan diterima backend:

- `CLERK_ISSUER_URL`: issuer production Clerk untuk instance kamu.
- `CLERK_AUDIENCE`: audience yang dipakai template token frontend.
- `VITE_CLERK_PUBLISHABLE_KEY`: publishable key frontend production.

Kalau issuer atau audience salah, semua request `/api/v1/*` akan ditolak.

## 2. Prepare VPS

Minimum yang realistis untuk beban awal ini tetap masuk akal:

- `2 vCPU`
- `2 GB RAM`
- `40 GB SSD`

Firewall inbound minimum:

- `22/tcp` untuk SSH
- `80/tcp` untuk HTTP
- `443/tcp` untuk HTTPS

DNS:

1. A/AAAA record domain menuju IP VPS.
2. Set `SITE_ADDRESS=pos.domainkamu.com` di `.env`.
3. Caddy akan mengambil TLS otomatis saat domain sudah resolve publik.

## 3. Prepare server files

Salin repo ke VPS lalu buat file env terpisah:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
chmod 600 backend/.env frontend/.env
```

Isi minimal:

`backend/.env`:

```dotenv
DATABASE_URL=postgres://balanja_runtime:***@<supavisor-host>:5432/postgres?sslmode=require
CLERK_ISSUER_URL=https://<your-clerk-issuer>
CLERK_AUDIENCE=balanja
ALLOWED_ORIGINS=https://pos.domainkamu.com
DB_MAX_CONNS=10
SHUTDOWN_TIMEOUT=10s
```

`frontend/.env`:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_API_BASE_URL=
```

`SITE_ADDRESS=pos.domainkamu.com` tetap di-export saat menjalankan Compose atau disimpan di env shell/deployment system.

## 4. First deploy

Sebelum `docker compose`, export value dari dua file env itu ke shell deploy:

```bash
set -a
source backend/.env
source frontend/.env
export SITE_ADDRESS=pos.domainkamu.com
set +a
```

Build image:

```bash
docker compose -f deploy/compose.yaml build
```

Naikkan stack:

```bash
docker compose -f deploy/compose.yaml up -d
```

Jalankan smoke test lokal dari VPS:

```bash
./deploy/smoke.sh http://localhost
```

Inspect service:

```bash
docker compose -f deploy/compose.yaml ps
docker compose -f deploy/compose.yaml logs api --tail=200
docker compose -f deploy/compose.yaml logs web --tail=200
```

## 5. Upgrades and rollback

Deploy versi baru:

```bash
git pull
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
./deploy/smoke.sh http://localhost
```

Rollback image cepat:

1. Checkout commit/tag terakhir yang stabil.
2. Build ulang image dari commit itu.
3. Jalankan `docker compose -f deploy/compose.yaml up -d`.

Rollback schema:

- Untuk environment yang belum live, jalankan [000001_init.down.sql](/Users/dikalaksana/Engineering/balanja/backend/migrations/000001_init.down.sql).
- Untuk environment production nanti, jangan andalkan full down migration. Ambil backup Supabase dulu lalu pakai forward fix migration.

## 6. Logs and operations

- `api` health check: `GET /readyz`
- `web` health check bergantung pada `api` healthy
- Docker log rotation sudah dibatasi `10m x 3` per service
- Memory limit Compose: `api 512m`, `web 256m`

Operasional dasar:

```bash
docker compose -f deploy/compose.yaml ps
docker compose -f deploy/compose.yaml logs -f api
docker compose -f deploy/compose.yaml logs -f web
docker compose -f deploy/compose.yaml restart api
```

## 7. Backup

Minimum backup policy Supabase:

1. Pastikan PITR / automatic backup aktif di plan Supabase yang dipakai.
2. Sebelum migration besar, ambil logical backup manual.
3. Simpan owner credential dan runtime credential terpisah.

Contoh logical backup:

```bash
pg_dump "$SUPABASE_OWNER_DATABASE_URL" > supabase-backup-$(date +%Y%m%d-%H%M%S).sql
```

`SUPABASE_OWNER_DATABASE_URL` jangan ditaruh di repo atau `.env.example`.
