# Contributing

## Workflow

1. Fork / clone the repo
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Make changes, ensure all checks pass locally
4. Push and open a PR targeting `main`
5. CI must be green and at least 1 review approval required before merge

## Local checks (run before pushing)

```bash
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm type-check    # TypeScript
pnpm test run      # Integration tests (requires Docker for Testcontainers)
```

All four must pass. CI runs the same checks automatically on every push.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

Types: feat | fix | docs | refactor | test | chore | ci
```

Examples:
```
feat: add cursor-based pagination to users endpoint
fix: handle null refresh token on logout
docs: update README with seed script instructions
ci: cache pnpm store in GitHub Actions
```

The `commit-msg` hook (via commitlint) rejects messages that don't follow this format.

## Branch protection rules (apply in GitHub → Settings → Branches)

| Setting | Value |
|---------|-------|
| Require status checks | `lint`, `typecheck`, `test` |
| Require branches to be up to date | Yes |
| Require pull request review | 1 approver |
| Dismiss stale reviews on new push | Yes |
| Allow force pushes | No |
| Allow deletions | No |

## Pre-commit hooks

Husky runs automatically on `git commit`:

| Hook | What it does |
|------|-------------|
| `pre-commit` | lint-staged: ESLint + Prettier on staged `.ts` files |
| `commit-msg` | commitlint: validates conventional commit format |

## Running tests

Tests use [Testcontainers](https://testcontainers.com/) — Docker must be running locally.

```bash
pnpm test          # watch mode
pnpm test run      # single run
pnpm test:coverage # with coverage report
pnpm test:ui       # browser UI
```

## Database

```bash
pnpm docker:dev       # start Postgres + Redis
pnpm db:migrate       # apply migrations
pnpm db:seed          # seed demo data
pnpm db:studio        # open Prisma Studio
```
