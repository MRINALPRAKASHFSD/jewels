# Élan Fine Jewellery

> **A house of fine jewellery — modern Indian elegance.**

Élan is a full-stack web application for a luxury fine jewellery brand, featuring a public-facing catalogue, lookbook, wishlist, and a comprehensive admin panel for product and content management.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Élan offers customers a refined browsing experience across collections of gold, diamond, and pearl jewellery. The platform supports:

- **Public catalogue** — filterable, searchable product listings with detail pages
- **Lookbook** — editorial imagery and campaign pages
- **Wishlist** — client-side wishlist with swappable storage adapter
- **Admin panel** — full CRUD for products, collections, lookbook, content, enquiries, and media
- **WhatsApp enquiries** — integrated enquiry flow via WhatsApp

---

## Tech Stack

| Layer         | Technology                                  |
|---------------|---------------------------------------------|
| Framework     | [TanStack Start](https://tanstack.com/start) + React 19 |
| Language      | TypeScript 5.x                              |
| Styling       | Tailwind CSS v4                             |
| UI Components | Radix UI + shadcn/ui patterns               |
| Database      | [Supabase](https://supabase.com) (PostgreSQL + RLS) |
| Auth          | Supabase Auth                               |
| Build Tool    | Vite 8                                      |
| Package Mgr   | Bun                                         |
| Testing       | Vitest + Testing Library                    |

---

## Project Structure

```
jewels/
├── public/                    # Static assets (favicon, robots.txt)
├── src/
│   ├── assets/                # Brand imagery and media
│   ├── components/
│   │   ├── admin/             # Admin-specific UI components
│   │   ├── site/              # Public-facing UI primitives
│   │   └── ui/                # Base design system (Radix-based)
│   ├── data/
│   │   ├── catalog.ts         # Catalogue data model, filters, queries
│   │   ├── content.ts         # Page imagery and homepage copy
│   │   ├── home.ts            # Homepage section definitions
│   │   └── mock.ts            # Mock data (backend-shaped types)
│   ├── hooks/                 # Shared React hooks
│   ├── integrations/
│   │   └── supabase/          # Supabase client, types, auth utilities
│   ├── lib/
│   │   ├── admin/             # Admin data, permissions, CMS, session
│   │   ├── catalog.*.ts       # Catalogue server functions and queries
│   │   ├── utils.ts           # Shared utilities
│   │   └── wishlist.ts        # Wishlist store (localStorage adapter)
│   ├── routes/
│   │   ├── _site.*            # Public routes (/, /jewellery, /about, etc.)
│   │   ├── admin.*            # Admin routes (products, collections, etc.)
│   │   └── admin_.*           # Admin auth routes (login, reset-password)
│   ├── styles.css             # Global styles + design tokens
│   ├── router.tsx             # TanStack Router setup
│   └── server.ts              # SSR server entry
├── supabase/
│   ├── config.toml            # Supabase project configuration
│   └── migrations/            # SQL migration files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.x
- [Node.js](https://nodejs.org) >= 20.x (for tooling compatibility)
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/MRINALPRAKASHFSD/jewels.git
cd jewels

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start the development server
bun dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

> **Note:** Never commit `.env` files. See `.gitignore` for exclusions.

---

## Database

Database migrations are located in `supabase/migrations/`. Apply them using the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push
```

### Row-Level Security

All database access is governed by Supabase RLS policies. The application enforces:

- **Public read** for published catalogue items
- **Staff-only write** for admin operations
- **User-scoped** access for wishlist and enquiry data

---

## Architecture

Key architectural decisions are documented in [`AGENTS.md`](./AGENTS.md):

- **Public vs Admin separation** — `/` routes under `_site` layout; `/admin` has its own layout and auth guard
- **Data layer isolation** — mock/catalogue data in `src/data/`; never filtered raw in UI
- **URL-driven catalogue state** — filter/sort/search as search params on `/jewellery`
- **Audit logging** — product/collection/content changes logged via DB triggers
- **Wishlist** — client store with swappable storage adapter

---

## Contributing

We welcome contributions! Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a pull request against `main`

---

## License

Copyright © 2026 **Mrinal Prakash**. All rights reserved.

This project and its source code are proprietary. Unauthorized copying, distribution, or modification is strictly prohibited. See [`LICENSE`](./LICENSE) for full terms.
