# Contributing to Élan Fine Jewellery

Thank you for contributing to Élan Fine Jewellery. This guide covers the local setup, branch naming, and review workflow.

## Code of conduct

Contributors are expected to keep discussions respectful and constructive. Harassment, discrimination, or disruptive behavior will not be tolerated.

## Getting started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/jewels.git
   cd jewels
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Copy `.env.example` to `.env` and fill in the required variables (see [`README.md`](./README.md#environment-variables)).
5. Create a branch for your work:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Branch naming

| Prefix      | Purpose                                 | Example                       |
| ----------- | --------------------------------------- | ----------------------------- |
| `feat/`     | New feature                             | `feat/product-image-carousel` |
| `fix/`      | Bug fix                                 | `fix/wishlist-persistence`    |
| `refactor/` | Code restructuring (no behavior change) | `refactor/catalog-queries`    |
| `docs/`     | Documentation updates                   | `docs/api-reference`          |
| `test/`     | Adding or updating tests                | `test/admin-auth-flow`        |
| `chore/`    | Build scripts, tooling, dependencies    | `chore/upgrade-tailwind`      |

## Commit messages

Write clear, human-readable commit messages using [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

```text
<type>(<scope>): <short summary>

[optional body explaining why the change was made]
```

Supported types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, and `security`.

### Examples

```text
feat(catalogue): add faceted filtering by material type
fix(admin): keep session active after token refresh
docs(readme): document Cashfree environment variables
chore(deps): upgrade @tanstack/react-query to 5.101
```

## Pull request checklist

- Target the `main` branch.
- Describe what changed and why, and reference any related issue (`Fixes #<issue-number>`).
- Run tests, typecheck, and formatting before requesting review:
  ```bash
  bun test
  bun x tsc --noEmit
  bun format
  ```
- Avoid rewriting published git history on branches connected to Lovable.

## Code conventions

- TypeScript strict mode is enabled (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Avoid `any` casts when generated types are available.
- Format with Prettier (`bun format`) and lint with ESLint (`bun lint`).
- Reuse public UI primitives from `src/components/site/primitives.tsx` and admin components from `src/components/admin/AdminUI.tsx`.
- Keep catalogue filtering inside `src/data/catalog.ts` and `src/lib/catalog.functions.ts` rather than filtering raw arrays in components.
- Never hardcode secrets or expose server keys with a `VITE_` prefix.

## Architecture notes

Read [`AGENTS.md`](./AGENTS.md) before making structural changes:

- Public routes live under `_site`; admin routes live under `/admin` with `loadAdminSession` in `src/lib/admin/session.ts`.
- Mock and fallback content lives in `src/data/`.
- Catalogue filters stay in URL search params on `/jewellery`.

## Reporting issues

Open a GitHub issue with steps to reproduce, expected vs. actual behavior, and your environment details. Use `bug`, `enhancement`, `documentation`, or `question` labels as appropriate.

## Copyright

Contributions to this repository become the property of **Mrinal Prakash** under the terms of the [LICENSE](./LICENSE). By submitting a pull request, you agree to these terms.

_Élan Fine Jewellery · Copyright © 2026 Mrinal Prakash. All rights reserved._
