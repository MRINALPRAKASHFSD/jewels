# Élan Fine Jewellery

> **A house of fine jewellery: modern Indian elegance.**

Élan is a full-stack web application for a fine jewellery brand. It includes a public storefront with a filterable catalogue, editorial lookbook, wishlist, and Cashfree checkout, paired with an internal admin panel for managing products, collections, orders, enquiries, and homepage content.

## Table of contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## Overview

The storefront lets visitors browse collections of gold, diamond, and pearl jewellery, save pieces to a wishlist, submit enquiries over WhatsApp or the contact form, and purchase fixed-price pieces through Cashfree (UPI, cards, and net banking).

Staff members sign in at `/admin` to manage products, collections, lookbook entries, media uploads, homepage sections, customer enquiries, and online orders.

## Tech stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | [TanStack Start](https://tanstack.com/start) + React 19 |
| Language      | TypeScript 5.x                                          |
| Styling       | Tailwind CSS v4                                         |
| UI Components | Radix UI + shadcn/ui patterns                           |
| Database      | [Supabase](https://supabase.com) (PostgreSQL + RLS)     |
| Auth          | Supabase Auth                                           |
| Payments      | [Cashfree Payments](https://www.cashfree.com)           |
| Build Tool    | Vite 8                                                  |
| Package Mgr   | Bun                                                     |
| Testing       | Vitest + Testing Library                                |

## Project structure

```text
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
│   │   └── mock.ts            # Mock data and local fallback catalogue
│   ├── hooks/                 # Shared React hooks
│   ├── integrations/
│   │   └── supabase/          # Supabase browser and server clients, types
│   ├── lib/
│   │   ├── admin/             # Admin data, permissions, CMS, session
│   │   ├── payment/           # Cashfree client, orders, server functions, webhook
│   │   ├── catalog.*.ts       # Catalogue server functions and queries
│   │   ├── enquiry.*.ts       # Rate-limited enquiry submission handlers
│   │   ├── utils.ts           # Shared utilities
│   │   └── wishlist.ts        # Wishlist store (localStorage adapter)
│   ├── routes/
│   │   ├── _site.*            # Public routes (/, /jewellery, /checkout, etc.)
│   │   ├── admin.*            # Admin routes (products, orders, enquiries, etc.)
│   │   └── admin_.*           # Admin auth routes (login, reset-password, preview)
│   ├── styles.css             # Global styles and design tokens
│   ├── router.tsx             # TanStack Router setup
│   └── server.ts              # SSR server entry and webhook endpoint
├── supabase/
│   ├── config.toml            # Supabase project configuration
│   └── migrations/            # SQL migration files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh) >= 1.x
- [Node.js](https://nodejs.org) >= 20.x
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
# Edit .env with your Supabase and Cashfree credentials

# Start the development server
bun dev
```

The development server runs at `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` in the project root and fill in your credentials:

```env
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_publishable_or_anon_key"
SUPABASE_URL="https://your_project_id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

CASHFREE_ENVIRONMENT="sandbox"
CASHFREE_APP_ID="your_app_id"
CASHFREE_SECRET_KEY="your_secret_key"
CASHFREE_WEBHOOK_URL=""
VITE_CASHFREE_ENVIRONMENT="sandbox"
```

> **Note:** Never commit `.env` files. Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CASHFREE_SECRET_KEY`) must never use the `VITE_` prefix.

## Database

Database migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
# Link to your project
bunx supabase link --project-ref <your-project-ref>

# Apply pending migrations to the remote database
bunx supabase db push --remote
```

### Row-level security

Database access is enforced by Supabase RLS policies and `security_invoker` views:

- Visitors can read published catalogue items, collections, categories, lookbook entries, and public site settings.
- Staff members (`admin` and `editor` roles verified via `private.is_staff`) can manage catalogue records and view enquiries and orders.
- Public enquiries and Cashfree order writes run through server functions using the service-role client after input validation.

## Architecture

Architectural notes live in [`AGENTS.md`](./AGENTS.md):

- Public pages sit under the `_site` layout; `/admin` uses its own layout and client-side session guard.
- Catalogue queries and filter configurations live in `src/data/catalog.ts` and `src/lib/catalog.functions.ts`, with URL search params driving filter state on `/jewellery`.
- Product, collection, lookbook, and enquiry status changes write to `audit_logs` through database triggers.
- Checkout reads the canonical product price from the database on the server before creating a Cashfree order, and `/api/webhook/cashfree` verifies HMAC-SHA256 signatures before updating payment state.

## Contributing

Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Run `bun lint`, `bun x tsc --noEmit`, and `bun test`
4. Open a pull request against `main`

## License

Copyright © 2026 **Mrinal Prakash**. All rights reserved.

This project and its source code are proprietary. Unauthorized copying, distribution, or modification is prohibited. See [`LICENSE`](./LICENSE) for full terms.
