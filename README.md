# Fastify Production Template

A production-ready Fastify 5 backend template with TypeScript, PostgreSQL, Redis, JWT authentication, rate limiting, caching, background queues, OpenAPI docs, circuit breakers, and a full integration test suite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS, TypeScript 5 (ESM) |
| Framework | Fastify 5 |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT (HS256) + Argon2id |
| Validation | Zod + fastify-type-provider-zod |
| Docs | OpenAPI 3.1 + Swagger UI |
| Circuit breakers | cockatiel |
| Testing | Vitest + Testcontainers |
| Logging | Pino (structured JSON) |
| Container | Docker (multi-stage, non-root, read-only FS) |

## Features

- **Authentication** — register, login, refresh token rotation, logout, protected routes
- **Rate limiting** — Redis-backed, per-user/per-IP, per-route overrides, fail-closed
- **Caching** — cache-aside pattern via Redis, ETag support, TTL + pattern invalidation
- **Background queues** — BullMQ with email, welcome-email, data-processing, and dead-letter queues
- **Circuit breakers** — protect DB and Redis with automatic open/half-open/close transitions
- **API documentation** — Swagger UI at `/documentation` (dev only), OpenAPI 3.1 JSON spec
- **Validation** — Zod schemas on all inputs and outputs; field-level error messages
- **Security** — Helmet CSP, CORS, gzip compression, Argon2id hashing
- **Code quality** — ESLint 9, Prettier, Husky v9 pre-commit hooks, commitlint
- **Tests** — 32 integration tests using real Postgres + Redis via Testcontainers
- **Docker** — multi-stage build, non-root user, read-only filesystem, resource limits

## Getting Started

### Prerequisites

- Node.js ≥ 22
- pnpm ≥ 9
- Docker + Docker Compose

### Installation

```bash
git clone https://github.com/chandru793/backend-template.git
cd backend-template
pnpm install
```

### Environment setup

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET to a strong random string (≥ 32 characters)
```

### Start infrastructure (Postgres + Redis)

```bash
pnpm docker:dev          # starts postgres + redis in background
```

### Run database migrations

```bash
pnpm db:migrate          # apply migrations and generate Prisma client
```

### Start the dev server

```bash
pnpm dev                 # tsx watch — hot reload on file changes
```

The API is available at `http://localhost:3000`.
Swagger UI is at `http://localhost:3000/documentation`.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm dev:debug` | Start dev server with Node.js inspector |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Start compiled production server |
| `pnpm test` | Run integration tests (watch mode) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:ui` | Open Vitest browser UI |
| `pnpm lint` | Lint source files |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format` | Format with Prettier |
| `pnpm type-check` | TypeScript type check (no emit) |
| `pnpm queue:worker` | Start BullMQ workers |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:migrate:prod` | Run Prisma migrations (prod) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:dev` | Start Postgres + Redis |
| `pnpm docker:full` | Start Postgres + Redis + app container |

## API Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Full health check — DB, Redis, circuit breaker states |
| GET | `/health/live` | Kubernetes liveness probe |
| GET | `/health/ready` | Kubernetes readiness probe |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register, returns token pair |
| POST | `/api/v1/auth/login` | — | Login, returns token pair |
| POST | `/api/v1/auth/refresh` | — | Rotate refresh token |
| POST | `/api/v1/auth/logout` | — | Revoke refresh token |
| GET | `/api/v1/auth/me` | Bearer | Get current user |

### Users

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users` | List users (paginated) |
| GET | `/api/v1/users/:id` | Get user by ID (cached 60s) |
| PATCH | `/api/v1/users/:id` | Update user (cache invalidated) |
| DELETE | `/api/v1/users/:id` | Delete user (cache invalidated) |

### Docs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/documentation` | Swagger UI (dev only) |
| GET | `/documentation/json` | Raw OpenAPI 3.1 spec |

## Configuration

All config is validated on startup via `@fastify/env`. Missing required vars crash fast.

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `LOG_LEVEL` | `info` | Pino log level |
| `DATABASE_URL` | — | Postgres connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password (optional) |
| `REDIS_DB` | `0` | Redis database index |
| `JWT_SECRET` | **required** | HS256 signing secret (≥ 32 chars) |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | `1000` | Max requests per window |
| `RATE_LIMIT_TIME_WINDOW` | `900000` | Window in ms (15 min) |
| `CACHE_ENABLED` | `true` | Toggle Redis caching |
| `CACHE_TTL` | `300` | Default cache TTL in seconds |
| `AUTH_ENABLED` | `true` | Toggle auth middleware |
| `SWAGGER_ENABLED` | `true` | Enable Swagger UI (auto-disabled in prod) |

## Project Structure

```
src/
├── app.ts                        # Build + configure Fastify instance
├── server.ts                     # Entry point — start server, graceful shutdown
├── config/                       # Env schema + type declarations
├── middleware/
│   └── auth.middleware.ts        # JWT auth middleware (onRequest hook)
├── plugins/                      # Fastify plugins (autoloaded alphabetically)
│   ├── cache.plugin.ts           # Redis cache service
│   ├── circuit-breaker.plugin.ts # cockatiel circuit breakers
│   ├── database.plugin.ts        # Prisma client
│   ├── errorHandler.plugin.ts    # Global error handler + Zod errors
│   ├── etag.plugin.ts            # ETag support
│   ├── jwt.plugin.ts             # @fastify/jwt setup
│   ├── queue.plugin.ts           # BullMQ queues
│   ├── rateLimit.plugin.ts       # Redis-backed rate limiting
│   ├── redis.plugin.ts           # 3 Redis connections (general / queue / rate-limit)
│   ├── security.plugin.ts        # Helmet + CORS + Compress
│   ├── sensible.plugin.ts        # @fastify/sensible
│   ├── swagger.plugin.ts         # OpenAPI 3.1 + Swagger UI
│   └── validation.plugin.ts      # Zod type provider
├── queues/                       # BullMQ queues and workers
│   ├── connections.ts
│   ├── index.ts
│   ├── jobs/types.ts
│   └── workers/
├── routes/                       # Route handlers (autoloaded, folder = URL prefix)
│   ├── health/                   # /health
│   └── api/v1/
│       ├── auth/                 # /api/v1/auth
│       └── users/                # /api/v1/users
├── schemas/validation/           # Shared Zod schemas
├── services/
│   ├── cache.service.ts          # Cache-aside + pattern invalidation
│   ├── password.service.ts       # Argon2id hashing
│   └── token.service.ts          # JWT generate / verify / rotate
├── types/                        # TypeScript ambient declarations
└── utils/                        # Logger, error classes, cache key helpers

tests/
├── global-setup.ts               # Testcontainers: spin up Postgres + Redis
├── helpers/                      # createTestApp(), cleanDatabase()
└── factories/                    # User factory (Faker)
```

## Architecture Decisions

**Three Redis connections** — `redis` (general cache), `redisQueue` (BullMQ, `maxRetriesPerRequest: null`), `redisRateLimit` (fast-fail, `connectTimeout: 500ms`). Prevents cascading failures if one connection is slow.

**Circuit breakers** — database breaker opens after 5 consecutive failures (10s recovery); Redis breaker after 3 (5s recovery). State visible in `GET /health`.

**Refresh token rotation** — each refresh issues a new token pair and revokes the old one. Tokens are stored hashed in Postgres. A `jti` (JWT ID) claim guarantees uniqueness within the same second.

**Zod as single schema source** — all route inputs and outputs are validated/serialized by Zod schemas. No duplicate type definitions; types are inferred with `z.infer<>`.

**Folder-based routing** — `@fastify/autoload` maps directory structure to URL prefixes automatically. `src/routes/api/v1/users/` → `/api/v1/users`.

## Testing

Tests use [Testcontainers](https://testcontainers.com/) to spin up real Postgres and Redis containers — no mocks, no in-memory fakes.

```bash
# Requires Docker running
pnpm test run           # run once
pnpm test               # watch mode
pnpm test:coverage      # with coverage report
```

32 integration tests across health (3), auth (14), and users (15).

## Docker

### Development (Postgres + Redis only)

```bash
pnpm docker:dev
```

### Full stack (includes app container)

```bash
# Requires JWT_SECRET env var
JWT_SECRET=your-secret pnpm docker:full
```

### Build image manually

```bash
docker build -t fastify-app .
docker run -p 3000:3000 --env-file .env fastify-app
```

The production container runs as a non-root user (`fastify:nodejs`), with a read-only root filesystem, dropped Linux capabilities, and resource limits (1 CPU / 512M RAM).

## Security

- Passwords hashed with **Argon2id** (64 MB memory, 3 iterations)
- Access tokens expire in **15 minutes**; refresh tokens in **7 days**
- Refresh tokens stored **hashed** in the database; rotated on every use
- Rate limiting: **5 req / 15 min** on login and register; **10 req / 15 min** on refresh
- Login endpoint **bans after 3 × 429** responses (403)
- Helmet sets `Content-Security-Policy`, `HSTS`, `X-Frame-Options`, etc.
- CORS allows only explicitly listed origins; preflight cached for 10 minutes
- Swagger UI disabled in `NODE_ENV=production`

## License

MIT
