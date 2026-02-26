# Deployment Guide

This guide covers deploying the Fastify production template to a server using Docker and Docker Compose.

---

## Prerequisites

- Docker ≥ 24 and Docker Compose v2 installed on the server
- A PostgreSQL 16 database (managed service or self-hosted)
- A Redis 7 instance (managed service or self-hosted)
- A domain name with DNS pointed at your server (for TLS)

---

## 1. Prepare environment variables

Create a `.env` file on the server. Never commit this file.

```bash
cp .env.example .env
```

Set the required variables:

```bash
# REQUIRED — generate a strong secret
JWT_SECRET=$(openssl rand -hex 32)

# REQUIRED — your production database URL
DATABASE_URL=postgresql://user:password@your-db-host:5432/fastify_app?schema=public

# Production settings
NODE_ENV=production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
CORS_ORIGIN=https://your-frontend-domain.com

# Disable dev-only features
SWAGGER_ENABLED=false
```

> **Security**: Store secrets in a secrets manager (e.g. AWS Secrets Manager, Docker secrets, or a `.env` file with `chmod 600`) — never in version control.

---

## 2. Run database migrations

Before starting the app for the first time, apply all Prisma migrations:

```bash
DATABASE_URL=your-production-url pnpm db:migrate:prod
```

Or if running inside Docker:

```bash
docker run --rm \
  -e DATABASE_URL=your-production-url \
  your-image-name \
  node -e "const { execSync } = require('child_process'); execSync('npx prisma migrate deploy', { stdio: 'inherit' })"
```

> `db:migrate:prod` uses `prisma migrate deploy` (not `dev`) — applies existing migrations without generating new ones.

---

## 3. Build and start with Docker Compose

The `full` profile starts Postgres, Redis, and the app container together.

```bash
# Build and start everything
JWT_SECRET=your-secret CORS_ORIGIN=https://your-domain.com docker compose --profile full up -d

# View logs
docker compose logs -f app

# Stop
docker compose --profile full down
```

### Build the image manually

```bash
docker build -t fastify-app:latest .
```

### Run the container standalone (external DB + Redis)

```bash
docker run -d \
  --name fastify-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:size=64m \
  fastify-app:latest
```

---

## 4. Start the queue worker

The BullMQ workers run as a separate process. Start them alongside the web server:

```bash
# In a separate container or process
pnpm queue:worker

# Or with Docker
docker run -d \
  --name fastify-worker \
  --env-file .env \
  fastify-app:latest \
  node dist/queues/workers/index.js
```

---

## 5. Verify the deployment

```bash
# Liveness probe
curl https://your-domain.com/health/live

# Readiness probe (checks DB + Redis)
curl https://your-domain.com/health

# Prometheus metrics
curl https://your-domain.com/metrics
```

Expected liveness response:
```json
{ "status": "ok" }
```

Expected readiness response:
```json
{
  "status": "ok",
  "database": { "status": "ok", "latencyMs": 2 },
  "redis": { "status": "ok", "latencyMs": 1 }
}
```

---

## 6. Reverse proxy (recommended)

Run the app behind **nginx** or **Traefik** to handle TLS termination.

### nginx example

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> The app sets HSTS and CSP headers via Helmet — do not duplicate these in nginx.

---

## 7. Updating the application

```bash
# Pull latest code
git pull origin main

# Rebuild the image
docker build -t fastify-app:latest .

# Apply any new migrations
DATABASE_URL=your-production-url pnpm db:migrate:prod

# Restart the container (zero-downtime with multiple replicas)
docker compose --profile full up -d --no-deps --build app
```

---

## 8. Container security properties

The production image is hardened by default:

| Property | Value |
|----------|-------|
| User | `fastify` (UID 1001, non-root) |
| Filesystem | Read-only root (`--read-only`) |
| Writable temp | `/tmp` (64 MB tmpfs) |
| Linux capabilities | All dropped (`cap_drop: ALL`) |
| Privilege escalation | Blocked (`no-new-privileges`) |
| CPU limit | 1.0 core |
| Memory limit | 512 MB |

---

## 9. Monitoring

The app exposes Prometheus metrics at `GET /metrics`. Scrape this endpoint with a Prometheus instance and visualise with Grafana.

Key metrics to alert on:

| Metric | Alert condition |
|--------|----------------|
| `process_cpu_user_seconds_total` | Sustained high CPU |
| `nodejs_heap_used_bytes` | Approaching memory limit |
| `circuit_breaker_state` | Value = 2 (open) for > 30s |
| `cache_misses_total / cache_hits_total` | Hit rate < 50% |
| `queue_jobs{status="failed"}` | Increasing failed job count |

---

## 10. Troubleshooting

**App fails to start**
- Check `DATABASE_URL` and `JWT_SECRET` are set — these are required and the app crashes fast if missing.
- Run `docker compose logs app` to see the startup error.

**Database connection errors**
- Verify PostgreSQL is reachable from the container network.
- Check `GET /health` — it reports database latency and circuit breaker state.

**Redis connection errors**
- Verify Redis host/port/password in `.env`.
- Check `GET /health` for Redis status.
- If Redis is unavailable, rate limiting fails closed (requests are blocked) — ensure Redis is healthy before deploying.

**Migrations fail**
- Ensure `DATABASE_URL` points to the correct database.
- Never run `prisma migrate dev` in production — always use `prisma migrate deploy`.
