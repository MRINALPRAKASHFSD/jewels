# Routes

TanStack Start uses file-based routing. Every `.tsx` file in this directory defines a route. Do not create `src/pages/`, `src/routes/_app/index.tsx`, or `app/layout.tsx`, as those belong to Next.js or Remix. The root layout is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                    |
| ------------------------ | ------------------------------------------------------ |
| `index.tsx`              | `/`                                                    |
| `about.tsx`              | `/about`                                               |
| `users/index.tsx`        | `/users`                                               |
| `users/$id.tsx`          | `/users/:id` (dynamic segment with bare `$`, no `{}`)  |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                 |
| `files/$.tsx`            | `/files/*` (splat read via `_splat` param, never `*`)  |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)       |
| `__root.tsx`             | app shell wrapping every page; keep `<Outlet />`       |

`routeTree.gen.ts` is generated automatically. Do not edit it by hand.
