# Contributing to Élan Fine Jewellery

Thank you for your interest in contributing to the Élan Fine Jewellery platform. This document outlines the standards and workflow for all contributors.

---

## Code of Conduct

All contributors are expected to maintain a respectful and professional environment. Harassment, discrimination, or disruptive behavior of any kind will not be tolerated.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/jewels.git
   cd jewels
   ```
3. **Install** dependencies:
   ```bash
   bun install
   ```
4. **Configure** environment variables (see [`README.md`](./README.md#environment-variables))
5. **Create** a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Branch Naming Convention

| Prefix       | Purpose                          | Example                        |
|--------------|----------------------------------|--------------------------------|
| `feat/`      | New feature                      | `feat/product-image-carousel`  |
| `fix/`       | Bug fix                          | `fix/wishlist-persistence`     |
| `refactor/`  | Code refactoring (no behavior change) | `refactor/catalog-queries` |
| `docs/`      | Documentation only               | `docs/api-reference`           |
| `test/`      | Adding or fixing tests           | `test/admin-auth-flow`         |
| `chore/`     | Build scripts, tooling, deps     | `chore/upgrade-tailwind`       |

---

## Commit Message Format

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

- `feat` — A new feature
- `fix` — A bug fix
- `docs` — Documentation changes
- `style` — Formatting (no logic changes)
- `refactor` — Code restructuring
- `test` — Test additions/modifications
- `chore` — Maintenance tasks

### Examples

```
feat(catalogue): add faceted filtering by material type
fix(admin): resolve session persistence after token refresh
docs(readme): update environment variable instructions
chore(deps): upgrade @tanstack/react-query to 5.101
```

---

## Pull Request Guidelines

- All PRs must target the `main` branch
- Include a clear description of **what** changed and **why**
- Reference any related issues with `Fixes #<issue-number>`
- Ensure all tests pass before requesting review:
  ```bash
  bun test
  ```
- Ensure the code is formatted:
  ```bash
  bun format
  ```
- At least **one review approval** is required before merging
- Squash commits on merge is preferred for a clean history

---

## Code Style

- **TypeScript** — Strict mode enabled; avoid `any` types
- **Formatting** — Prettier is configured; run `bun format` before committing
- **Linting** — ESLint is configured; run `bun lint` to check
- **Components** — Follow patterns in `src/components/site/primitives.tsx` (public) and `src/components/admin/AdminUI.tsx` (admin)
- **Data** — Never filter raw arrays in UI; use helpers from `src/data/catalog.ts`
- **No hardcoded secrets** — All credentials via environment variables

---

## Architecture Decisions

Before making structural changes, read the architecture notes in [`AGENTS.md`](./AGENTS.md). Key rules:

- Public pages → `_site` layout
- Admin pages → `/admin` layout with auth guard
- All mock/content data → `src/data/` directory
- Catalogue filters → URL search params only
- Admin auth → `src/lib/admin/session.ts`

---

## Reporting Issues

Use GitHub Issues with one of the following labels:

- `bug` — Something is broken
- `enhancement` — Feature request
- `documentation` — Docs improvement
- `question` — General inquiry

Please include steps to reproduce, expected vs actual behavior, and environment details.

---

## Copyright

All contributions to this repository become the property of **Mrinal Prakash** under the terms of the [LICENSE](./LICENSE). By submitting a pull request, you agree to these terms.

---

*Élan Fine Jewellery — Copyright © 2026 Mrinal Prakash. All rights reserved.*
