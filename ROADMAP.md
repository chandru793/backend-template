# Roadmap — Fastify Production Template

7 tickets across 2 sprints. All 11 foundation phases are complete.

---

## Sprint 1 — CI/CD + Resilience

### S1-1 · GitHub Actions: CI workflow

**Files:** `.github/workflows/ci.yml`

Run lint, type-check, and tests automatically on every push and PR.

```
Jobs (run in parallel):
  lint       → pnpm lint
  typecheck  → pnpm type-check
  test       → pnpm test run  (Testcontainers — requires Docker on runner)

Trigger: push to any branch + pull_request targeting main
Node: 22, pnpm store cached between runs
```

**Acceptance Criteria**
- [ ] All 3 jobs must be green before a PR can merge
- [ ] Testcontainers spins up real Postgres + Redis inside the GitHub runner
- [ ] pnpm store is cached across runs

---

### S1-4 · Branch protection rules + CONTRIBUTING guide

**Files:** `CONTRIBUTING.md`

Document the rules that make CI meaningful.

```
Required status checks:  lint, typecheck, test
Require PR review:        1 approver
No force pushes to main
No deletions of main
```

**Acceptance Criteria**
- [ ] `CONTRIBUTING.md` created with branch protection setup guide
- [ ] README updated with PR workflow section

---

### S4-3 · Retry policy for transient DB failures

**Files:** `src/plugins/circuit-breaker.plugin.ts`

Combine cockatiel `retry` + `circuitBreaker` into a single wrapped policy.

```typescript
// Retry up to 3 times with exponential backoff,
// then the circuit breaker counts it as a failure:
const dbPolicy = wrap(
  retry(handleTransientErrors, { maxAttempts: 3, backoff: new ExponentialBackoff() }),
  circuitBreaker(handleAll, { halfOpenAfter: 10_000, breaker: new ConsecutiveBreaker(5) })
)

// handleTransientErrors: ECONNRESET, ETIMEDOUT, Prisma P1001, P1008
// Expose as fastify.policies.database and fastify.policies.redis
```

**Acceptance Criteria**
- [ ] Transient errors retried up to 3 times before propagating
- [ ] Each retry attempt logged at `warn` level with attempt number
- [ ] Circuit breaker still opens on 5 consecutive final failures
- [ ] pnpm type-check and lint pass

---

## Sprint 2 — Observability + Queue Visibility

### S2-1 · Prometheus metrics endpoint (`GET /metrics`)

**Files:** `src/plugins/metrics.plugin.ts`
**Dependencies:** `pnpm add prom-client`

Expose a Prometheus-compatible scrape endpoint.

```
Default Node.js metrics:
  process_cpu_seconds_total
  nodejs_heap_size_used_bytes
  nodejs_event_loop_delay_seconds

Custom HTTP histogram:
  http_request_duration_seconds{method, route, status_code}
  → recorded via Fastify onResponse hook

Route: GET /metrics  (Content-Type: text/plain; version=0.0.4)
Gate:  METRICS_ENABLED env var (default true, auto-false in test)
       rate limiting + ETag disabled on /metrics
```

**Acceptance Criteria**
- [ ] `GET /metrics` returns valid Prometheus text format
- [ ] `http_request_duration_seconds_bucket` present with correct labels
- [ ] Default Node.js metrics present
- [ ] pnpm type-check and lint pass

---

### S2-2 · Business metrics: circuit breakers, cache, queues

**Files:** `src/plugins/metrics.plugin.ts` (extend), `src/services/cache.service.ts`

Application-level metrics for subsystem visibility.

```
Gauge   circuit_breaker_state{breaker="database|redis"}
          0 = Closed, 1 = Open, 2 = HalfOpen
          updated on cockatiel onStateChange event

Counter cache_hits_total
Counter cache_misses_total
          incremented in CacheService.getOrSet()

Gauge   bullmq_queue_depth{queue="email|welcomeEmail|dataProcessing"}
          polled every 15 seconds via setInterval

Histogram db_query_duration_ms
          via Prisma $use middleware
```

**Acceptance Criteria**
- [ ] All metrics visible in `GET /metrics`
- [ ] `circuit_breaker_state` updates when a breaker opens/closes
- [ ] Cache counters increment correctly on hit and miss
- [ ] Queue depth refreshes every 15 seconds

---

### S2-3 · OpenTelemetry distributed tracing

**Files:** `src/tracer.ts`, `docker-compose.yml` (add Jaeger)
**Dependencies:** `pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @prisma/instrumentation`

End-to-end trace visibility across HTTP → DB → Redis.

```
SDK init:        src/tracer.ts  (loaded before app starts in server.ts)
Auto-instrument: Fastify HTTP, Prisma, ioredis, Node http
Exporter:        OTLP HTTP → OTEL_EXPORTER_OTLP_ENDPOINT
Gate:            OTEL_ENABLED=false → SDK not loaded (zero overhead in test)

docker-compose.yml (dev profile):
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: 16686 (UI), 4318 (OTLP HTTP)
```

**Acceptance Criteria**
- [ ] Traces visible in Jaeger UI at `localhost:16686`
- [ ] Each HTTP request creates a root span with correct route name
- [ ] DB queries appear as child spans under their request span
- [ ] `OTEL_ENABLED=false` = zero overhead (no SDK initialised)

---

### S4-2 · Bull Board queue dashboard (`/queues`)

**Files:** `src/plugins/bull-board.plugin.ts`
**Dependencies:** `pnpm add @bull-board/fastify @bull-board/api`

Web UI for inspecting job queues, retries, and the DLQ.

```
Route:  GET /queues  (same pattern as Swagger UI)
Queues: email, welcomeEmail, dataProcessing, deadLetter
Gate:   NODE_ENV !== 'production'  (never exposed in prod)
```

**Acceptance Criteria**
- [ ] `GET /queues` returns 200 with Bull Board HTML in development
- [ ] All 4 queues visible in the UI with job counts
- [ ] Not accessible when `NODE_ENV=production`
- [ ] pnpm type-check and lint pass

---

## Summary

| ID | Ticket | Sprint |
|----|--------|--------|
| S1-1 | GitHub Actions CI workflow | 1 |
| S1-4 | Branch protection + CONTRIBUTING guide | 1 |
| S4-3 | Retry policy for transient DB failures | 1 |
| S2-1 | Prometheus metrics `GET /metrics` | 2 |
| S2-2 | Business metrics: circuit breakers, cache, queues | 2 |
| S2-3 | OpenTelemetry distributed tracing | 2 |
| S4-2 | Bull Board queue dashboard `/queues` | 2 |

**Total: 7 tickets across 2 sprints**
