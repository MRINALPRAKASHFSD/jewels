<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Public pages live under the `_site` pathless layout (navbar/footer); admin lives under `/admin` with its own layout — keeps the two experiences visually and structurally separate.
- All mock content is isolated in `src/data/mock.ts` with backend-shaped types — swap for real queries later without touching components.
- Public UI primitives (buttons, reveal, image frames) live in `src/components/site/primitives.tsx`; admin UI in `src/components/admin/AdminUI.tsx`.
- All page imagery and homepage copy are centralised in `src/data/content.ts` (media + homeCopy + whatsapp config) — components never import image files directly, so CMS/client photography can replace them in one place.
- WhatsApp enquiries go through the reusable `WhatsAppButton` (optional `productName` for context) — one place to wire the real number later.
- Catalogue data model, filter/sort config and query helpers (`queryCatalog`, `getRelated`) live in `src/data/catalog.ts` — UI never filters raw arrays itself, so swapping to backend queries touches one file.
- Catalogue filter/sort/search state lives in URL search params on `/jewellery` — shareable, back-button friendly.
- Wishlist is a client store in `src/lib/wishlist.ts` with a swappable storage adapter (localStorage now) — per-user backend storage can replace it later without UI changes.
- Admin auth: `/admin` layout (`ssr: false`) guards every admin page via `loadAdminSession` in `src/lib/admin/session.ts`; login/reset live at `admin_.login` / `admin_.reset-password` outside the layout — session is browser-stored, so guarding client-side avoids SSR redirect loops.
- Authorization is enforced in the database (RLS + `private.has_role/is_staff`, not exposed via the API); `src/lib/admin/permissions.ts` only mirrors it for UI hiding — keep both in sync when roles change.
- Admin data reads go through `src/lib/admin/data.ts` using the browser client as the signed-in user, so RLS decides visibility; staff actions write to `audit_logs`.
- Staff roles are granted only by trusted server tooling (no client write policy on `user_roles`); public signup is disabled.
- CMS reads/writes live in `src/lib/admin/cms.ts` (browser client as the signed-in user) — RLS stays the only real gate; UI checks only hide controls.
- Activity log entries for products/collections/lookbook/content/enquiry status are written by database triggers (`private.audit_*`) so they can't be skipped; only storage actions log from the client.
- Homepage layout is fixed in `HomeView`; editable fields are defined in `src/data/home.ts` and published content lives in `homepage_sections.content`, drafts in staff-only `homepage_drafts` — empty fields fall back to defaults.
- Product image order = `product_images.sort_order`; the first image is always the primary, so admin order and public gallery order match.
- Stored image references use the storage object URL form so the public layer can sign them from private buckets.
