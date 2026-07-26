# Tencent Cloud Production Deployment

Panduan ini men-deploy Balanja dari branch `main` ke satu server Ubuntu Tencent
Cloud pada `https://pos.marvcore.com`.

Alur production:

1. GitHub Actions menjalankan test backend, frontend, dan deployment assets.
2. GitHub Actions membangun image berdasarkan full Git commit SHA.
3. Image `balanja-api` dan `balanja-web` dikirim ke Docker Hub.
4. GitHub Actions masuk ke server lewat SSH dan menjalankan `/opt/balanja/deploy.sh`.
5. Server menarik image baru, menjalankan health check, dan otomatis kembali ke
   SHA sebelumnya bila verifikasi gagal.

Database migration tidak dijalankan otomatis.

## 1. Prerequisites

Server Ubuntu harus sudah memiliki:

- Docker Engine.
- Docker Compose v2 plugin.
- `curl`.
- `flock` dari paket `util-linux`.
- Public IPv4.

Periksa dari server:

```bash
docker version
docker compose version
curl --version
command -v flock
getent hosts pos.marvcore.com
```

Tencent Cloud Security Group harus mengizinkan inbound:

- TCP 22 dari alamat operator/GitHub runner, atau port SSH khusus yang dipakai.
- TCP 80 dari internet.
- TCP 443 dari internet.

Jika UFW aktif, buka port yang sama:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

Buat DNS A record:

```text
pos.marvcore.com -> <TENCENT_PUBLIC_IPV4>
```

Pastikan record tersebut sudah resolve sebelum first deploy. Caddy mengambil dan
memperbarui sertifikat TLS secara otomatis melalui port 80/443.

## 2. Prepare Docker Hub

Buat dua repository di namespace Docker Hub milikmu:

- `balanja-api`
- `balanja-web`

Buat dua access token terpisah:

1. Token CI dengan izin write untuk GitHub Actions.
2. Token server read-only untuk menarik image.

Jangan menggunakan password akun Docker Hub di GitHub atau server. Bila
repository image bersifat public, server tetap sebaiknya login agar pull tidak
menggunakan batas anonymous.

## 3. Create the Deployment SSH Key

Di mesin operator, buat key khusus deployment:

```bash
ssh-keygen \
  -t ed25519 \
  -f ~/.ssh/balanja_tencent_deploy \
  -C "balanja production deploy"
```

Private key `~/.ssh/balanja_tencent_deploy` akan menjadi GitHub secret
`DEPLOY_SSH_KEY`. Public key dengan ekstensi `.pub` dipasang pada user
`balanja-deploy`.

## 4. Bootstrap the Ubuntu Server

Kirim bootstrap script menggunakan user administrator server, biasanya
`ubuntu`:

```bash
scp deploy/bootstrap-server.sh ubuntu@<TENCENT_PUBLIC_IPV4>:/tmp/
ssh ubuntu@<TENCENT_PUBLIC_IPV4>
sudo /tmp/bootstrap-server.sh balanja-deploy
```

Pasang public deployment key:

```bash
sudo install -d -m 0700 -o balanja-deploy -g balanja-deploy \
  /home/balanja-deploy/.ssh
sudo touch /home/balanja-deploy/.ssh/authorized_keys
printf '%s\n' '<CONTENTS_OF_BALANJA_TENCENT_DEPLOY.PUB>' |
  sudo tee /home/balanja-deploy/.ssh/authorized_keys >/dev/null
sudo chown balanja-deploy:balanja-deploy \
  /home/balanja-deploy/.ssh/authorized_keys
sudo chmod 0600 /home/balanja-deploy/.ssh/authorized_keys
```

Keluar dari sesi SSH lalu uji sesi baru. Membership group Docker baru aktif pada
login baru:

```bash
ssh -i ~/.ssh/balanja_tencent_deploy \
  balanja-deploy@<TENCENT_PUBLIC_IPV4> \
  'docker version && docker compose version'
```

Nonaktifkan password login dan root login hanya setelah key administrator dan
deployment sama-sama sudah diuji melalui sesi SSH baru.

## 5. Install Deployment Assets

Dari root repository di mesin operator:

```bash
tar -C deploy -czf - \
  compose.production.yaml \
  deploy.sh \
  smoke.sh |
  ssh -i ~/.ssh/balanja_tencent_deploy \
    balanja-deploy@<TENCENT_PUBLIC_IPV4> \
    'tar -C /opt/balanja -xzf - && chmod 750 /opt/balanja/deploy.sh /opt/balanja/smoke.sh'
```

Kirim template environment:

```bash
scp -i ~/.ssh/balanja_tencent_deploy \
  deploy/.env.production.example \
  balanja-deploy@<TENCENT_PUBLIC_IPV4>:/opt/balanja/.env

scp -i ~/.ssh/balanja_tencent_deploy \
  deploy/.release.env.example \
  balanja-deploy@<TENCENT_PUBLIC_IPV4>:/opt/balanja/.release.env
```

Masuk sebagai `balanja-deploy`, batasi permission, lalu isi nilai production:

```bash
chmod 600 /opt/balanja/.env /opt/balanja/.release.env
nano /opt/balanja/.env
```

Nilai minimum `/opt/balanja/.env`:

```dotenv
SITE_ADDRESS=pos.marvcore.com
DATABASE_URL=postgres://balanja_runtime:***@<supavisor-host>:5432/postgres?sslmode=require
CLERK_ISSUER_URL=https://<production-clerk-issuer>
CLERK_AUDIENCE=balanja
ALLOWED_ORIGINS=https://pos.marvcore.com
DB_MAX_CONNS=10
SHUTDOWN_TIMEOUT=10s
R2_ENABLED=false
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

Jika R2 aktif, set `R2_ENABLED=true` dan isi seluruh nilai R2. Jangan commit
`backend/.env`, `/opt/balanja/.env`, access token, atau private key.

## 6. Authenticate the Server to Docker Hub

Masuk sebagai `balanja-deploy`, lalu login dengan token read-only:

```bash
read -rsp 'Docker Hub read token: ' DOCKERHUB_READ_TOKEN
echo
printf '%s' "$DOCKERHUB_READ_TOKEN" |
  docker login \
    --username '<DOCKERHUB_USERNAME>' \
    --password-stdin
unset DOCKERHUB_READ_TOKEN
```

Credential disimpan di home user deployment, bukan di repository.

## 7. Configure GitHub

Tambahkan repository variable:

- `DOCKERHUB_USERNAME`: namespace Docker Hub tanpa `docker.io/`.
- `UPGRADE_WHATSAPP_NUMBER`: nomor WhatsApp tujuan upgrade dalam format
  internasional, hanya digit, misalnya `6281234567890`.
- `UPGRADE_EMAIL`: alamat email tujuan upgrade. Minimal salah satu channel
  upgrade harus terisi.

Tambahkan repository secrets:

- `DOCKERHUB_TOKEN`: token CI Docker Hub dengan izin write.
- `VITE_CLERK_PUBLISHABLE_KEY`: publishable key Clerk production.

Buat GitHub Environment bernama `production`, lalu tambahkan environment
secrets:

- `DEPLOY_HOST`: public IPv4 atau hostname SSH server.
- `DEPLOY_PORT`: port SSH, biasanya `22`.
- `DEPLOY_USER`: `balanja-deploy`.
- `DEPLOY_SSH_KEY`: seluruh isi private deployment key.
- `DEPLOY_KNOWN_HOSTS`: pinned SSH host-key line.

Ambil host key dari mesin operator:

```bash
DEPLOY_HOST=<TENCENT_PUBLIC_IPV4>
DEPLOY_PORT=22
ssh-keyscan -p "$DEPLOY_PORT" -H "$DEPLOY_HOST"
```

Bandingkan fingerprint dengan host key dari console Tencent sebelum
menyimpannya:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

GitHub workflow memakai `StrictHostKeyChecking=yes`; perubahan host key akan
menghentikan deployment, bukan melewati peringatan.

Environment protection rule dapat ditambahkan bila setiap production deploy
harus mendapat approval manual.

## 8. First Deployment

Merge workflow dan deployment assets ke branch `main`, lalu push `main`. Workflow
`.github/workflows/ci-cd.yml` akan:

1. Menjalankan seluruh CI.
2. Mempublikasikan:
   - `<DOCKERHUB_USERNAME>/balanja-api:<FULL_COMMIT_SHA>`
   - `<DOCKERHUB_USERNAME>/balanja-web:<FULL_COMMIT_SHA>`
3. Mengunggah deployment assets.
4. Menjalankan deploy dan smoke test di server.

Periksa hasil publik:

```bash
curl --fail --show-error https://pos.marvcore.com/healthz
curl --fail --show-error https://pos.marvcore.com/readyz
curl --fail --show-error https://pos.marvcore.com/
```

## 9. Inspect Production

Di server:

```bash
docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml \
  ps

docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml \
  logs --tail=200 api web

cat /opt/balanja/.deploy/current
cat /opt/balanja/.deploy/previous
```

Untuk mengikuti log:

```bash
docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml \
  logs -f api web
```

## 10. Manual Rollback

Gunakan full commit SHA yang image-nya masih tersedia di Docker Hub:

```bash
/opt/balanja/deploy.sh \
  '<DOCKERHUB_USERNAME>' \
  '<PREVIOUS_FULL_COMMIT_SHA>'
```

Script memakai jalur yang sama seperti deployment normal: pull, Compose health
check, smoke test lokal, smoke test HTTPS, dan pencatatan release.

Jika deployment otomatis gagal, kandidat tidak mengganti
`/opt/balanja/.deploy/current`. Bila rollback juga gagal:

```bash
docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml \
  ps

docker compose \
  --env-file /opt/balanja/.env \
  --env-file /opt/balanja/.release.env \
  -f /opt/balanja/compose.production.yaml \
  logs --tail=300 api web
```

## 11. Database Migrations and Backups

CI/CD ini tidak menjalankan migration. Jalankan migration sebagai operasi
terpisah menggunakan owner database, setelah backup, dan sebelum image yang
bergantung pada schema baru diaktifkan.

Minimum policy:

1. Pastikan backup/PITR Supabase aktif.
2. Ambil logical backup sebelum migration besar.
3. Jangan simpan owner database URL pada server aplikasi.
4. Gunakan forward-fix migration untuk production; jangan mengandalkan full down
   migration setelah data live.

Untuk rollout entitlement transaction:

1. Jalankan `backend/migrations/000012_organization_entitlements.up.sql`
   menggunakan owner database.
2. Verifikasi seluruh organisasi lama berstatus `paid_active`. Backfill ini
   disengaja agar toko yang sudah berjalan tidak mendadak terkunci.
3. Pastikan `UPGRADE_WHATSAPP_NUMBER` dan/atau `UPGRADE_EMAIL` sudah diatur,
   kemudian build dan deploy image web baru.
4. Deploy API baru dan lakukan smoke test dari
   [runbook entitlement](operations/entitlements.md).
5. Ubah tenant lama menjadi `paid_suspended` hanya setelah review operator;
   jangan mengembalikan tenant ke trial atau mengubah counter secara manual.

## 12. Credential Rotation

- Docker Hub CI token: buat token write baru, ganti `DOCKERHUB_TOKEN`, uji push,
  lalu cabut token lama.
- Docker Hub server token: login memakai token read-only baru, uji
  `docker pull`, lalu cabut token lama.
- SSH key: tambahkan public key baru ke `authorized_keys`, ganti
  `DEPLOY_SSH_KEY`, uji workflow, lalu hapus key lama.
- Database/Clerk/R2: ubah `/opt/balanja/.env`, kemudian deploy ulang SHA aktif
  atau jalankan `docker compose up -d`.

Selalu uji credential baru sebelum mencabut credential lama.
