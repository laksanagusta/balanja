# Balanja

Balanja sekarang dibagi jadi dua bagian:

- `frontend/`: React 19 + Vite 7 + Clerk untuk UI POS.
- `backend/`: Go Fiber API yang memegang seluruh akses data ke Supabase PostgreSQL.

Frontend tidak lagi boleh mengakses database Supabase secara langsung. Semua operasi data berjalan lewat `Authorization: Bearer <Clerk JWT>` ke `/api/v1`.

## Struktur penting

- `backend/migrations/000001_init.up.sql`: skema aktif dan kebijakan RLS.
- `backend/internal/`: auth, fitur domain, dan akses database.
- `deploy/compose.yaml`: deployment VPS dengan API + web reverse proxy.
- `deploy/Caddyfile`: routing `/api`, SPA fallback, dan TLS.
- `backend/.env.example`: template environment backend.
- `frontend/.env.example`: template environment frontend.

## Local development

Frontend:

```bash
cd /Users/dikalaksana/Engineering/balanja/frontend
cp .env.example .env
bun run test
bun run build
```

Backend:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
cp .env.example .env
gofmt -w ./cmd ./internal
go vet ./...
go test ./... -race
```

Menjalankan API secara lokal:

```bash
cd /Users/dikalaksana/Engineering/balanja/backend
go run ./cmd/api
```

## Database and auth

- Database tetap memakai Supabase PostgreSQL.
- Runtime API memakai role database khusus yang dipaksa lewat RLS, bukan owner credential.
- Tenant source of truth adalah claim `org_id` dari Clerk JWT yang sudah diverifikasi di backend.

Langkah provisioning dan deploy ada di [docs/deployment.md](/Users/dikalaksana/Engineering/balanja/docs/deployment.md).
