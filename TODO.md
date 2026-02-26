# TODO

## High Priority

- [x] 1. Seed script — `prisma/seed.ts` (PR #23)
- [x] 2. GitHub Actions CI — lint, test, type-check, audit, docker build (PR #24)
- [x] 3. `.env.example` — verify it exists and covers all vars
- [ ] 4. ~~Multi-env support~~ — skipped
- [x] 5. `DEPLOYMENT.md` — guide on how to deploy to production

## Medium Priority

- [x] 6. npm audit in CI — dependency vulnerability scanning (PR #24)
- [ ] 7. Error handler test file — dedicated test file (currently only 2 tests in observability.test.ts)
- [ ] 8. `.nvmrc` — Node version pinning for developers
- [ ] 9. `.editorconfig` — cross-editor consistency
- [ ] 10. Pagination — README mentions it but no implementation

## Lower Priority

- [ ] 11. Kubernetes manifests — `k8s/` folder with deployment, service, ingress, configmap
- [ ] 12. Soft delete pattern — common real-world requirement
- [ ] 13. Audit logging — who accessed what, when
- [ ] 14. OpenTelemetry / distributed tracing — APM integration

## Completed

- [x] Error handler plugin
- [x] Vitest UI dashboard (`pnpm test:ui`)
- [x] Docker files — Dockerfile + docker-compose
- [x] GitHub workflows — CI pipeline
- [x] Increase test coverage to 80%
- [x] Queue and worker tests (PR #22)
- [x] Seed script (PR #23)
- [x] Security audit CI job + dependency overrides (PR #24)
