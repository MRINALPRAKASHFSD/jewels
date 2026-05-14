import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CatalogSearch, DesktopToolbar, MobileToolbar, emptyFilters, filterGroups, type FilterKey, type FilterState } from "@/components/site/CatalogControls";
import { ProductCard, ProductCardSkeleton } from "@/components/site/cards";
import { Breadcrumb } from "@/components/site/PageShell";
import { Container, Reveal, luxButton } from "@/components/site/primitives";
import { categories, sortOptions, type CatalogFilters, type SortId } from "@/data/catalog";
import { productsQuery } from "@/lib/catalog.queries";
import { cn } from "@/lib/utils";

type Search = { [K in FilterKey]?: string[] | undefined } & { category?: string | undefined; q?: string | undefined; sort?: SortId | undefined; search?: number | undefined };

const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : typeof v === "string" && v ? [v] : undefined);
const keys: FilterKey[] = ["collection", "metal", "stone", "occasion", "price", "availability"];

export const Route = createFileRoute("/_site/jewellery/")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const s = raw as { category?: unknown; q?: unknown; sort?: unknown; search?: unknown } & Record<string, unknown>;
    const out: Search = {};
    if (typeof s.category === "string" && categories.some((c) => c.slug === s.category) && s.category !== "all") out.category = s.category;
    if (typeof s.q === "string" && s.q) out.q = s.q.slice(0, 80);
    if (typeof s.sort === "string" && sortOptions.some((o) => o.id === s.sort) && s.sort !== "featured") out.sort = s.sort as SortId;
    if (s.search) out.search = 1;
    for (const k of keys) { const a = arr(s[k]); if (a?.length) out[k] = a; }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Jewellery — Élan Fine Jewellery" },
      { name: "description", content: "Browse Élan rings, necklaces, earrings, bracelets, bangles, pendants and bridal jewellery in gold, diamond, emerald and pearl." },
      { property: "og:title", content: "Jewellery — Élan Fine Jewellery" },
      { property: "og:description", content: "Objects of light, crafted for a lifetime." },
    ],
  }),
  loaderDeps: ({ search }) => ({ search: { ...search, search: undefined } }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(productsQuery(toFilters(deps.search), PAGE)),
  pendingComponent: CatalogSkeleton,
  errorComponent: CatalogError,
  component: Catalogue,
});

const PAGE = 12;

function toFilters(search: Search): CatalogFilters {
  return {
    category: search.category ?? "all", q: search.q ?? "", sort: search.sort ?? "featured",
    collection: search.collection ?? [], metal: search.metal ?? [], stone: search.stone ?? [], occasion: search.occasion ?? [], price: search.price ?? [], availability: search.availability ?? [],
  };
}

function Catalogue() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/jewellery/" });
  const [limit, setLimit] = useState(PAGE);
  const category = search.category ?? "all";
  const sort = search.sort ?? "featured";
  const filters: FilterState = { ...emptyFilters(), ...Object.fromEntries(keys.map((k) => [k, search[k] ?? []])) };
  const { data, isFetching } = useQuery(productsQuery(toFilters(search), limit));
  const results = data?.items ?? [];
  const total = data?.total ?? 0;

  const update = (patch: Partial<Search>) => {
    setLimit(PAGE);
    navigate({ search: (prev) => { const n = { ...prev, ...patch }; for (const k of Object.keys(n) as (keyof Search)[]) { const v = n[k]; if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete n[k]; } return n; }, replace: true, resetScroll: false });
  };
  const setFilters = (f: FilterState) => update(Object.fromEntries(keys.map((k) => [k, f[k].length ? f[k] : undefined])));
  const toggle = (k: FilterKey, v: string) => update({ [k]: filters[k].includes(v) ? filters[k].filter((x) => x !== v) : [...filters[k], v] });
  const chips = filterGroups.flatMap((g) => filters[g.key].map((v) => ({ key: g.key, value: v, label: g.options.find((o) => o.value === v)?.label ?? v })));
  const hasActive = chips.length > 0 || !!search.q || category !== "all";
  const clearAll = () => { setLimit(PAGE); navigate({ search: {}, replace: true, resetScroll: false }); };

  return (
    <>
      <section className="pt-32 lg:pt-40">
        <Container>
          <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Jewellery" }]} />
          <div className="mt-10 grid gap-6 pb-12 lg:mt-14 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:pb-16">
            <Reveal>
              <p className="eyebrow mb-5 text-muted-foreground">Jewellery</p>
              <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl">Objects of light, crafted for a lifetime.</h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">Every piece is made in our atelier in small numbers — in gold, set with stones chosen one by one. Browse the full collection, or enquire about something made only for you.</p>
            </Reveal>
          </div>

          {/* Category navigation */}
          <nav aria-label="Categories" className="-mx-5 border-b border-border sm:-mx-8 lg:mx-0">
            <ul className="no-scrollbar flex gap-8 overflow-x-auto px-5 sm:px-8 lg:gap-10 lg:px-0">
              {categories.map((c) => {
                const active = c.slug === category;
                return (
                  <li key={c.slug} className="shrink-0">
                    <Link
                      to="/jewellery"
                      search={(prev) => ({ ...prev, category: c.slug === "all" ? undefined : c.slug })}
                      replace
                      resetScroll={false}
                      aria-current={active ? "page" : undefined}
                      className={cn("eyebrow relative block py-5 transition-colors duration-300", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      {c.label}
                      <span className={cn("absolute inset-x-0 -bottom-px h-px origin-left bg-foreground transition-transform duration-500 ease-lux", active ? "scale-x-100" : "scale-x-0")} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Toolbar */}
          <div className="mt-2 flex flex-col gap-2 md:mt-4">
            <div className="flex items-center gap-6">
              <div className="min-w-0 flex-1"><DesktopToolbar filters={filters} onToggle={toggle} sort={sort} onSort={(s) => update({ sort: s === "featured" ? undefined : s })} /></div>
              <div className="hidden md:block"><CatalogSearch value={search.q ?? ""} onChange={(q) => update({ q: q || undefined })} autoOpen={!!search.search} /></div>
            </div>
            <MobileToolbar filters={filters} onApply={setFilters} sort={sort} onSort={(s) => update({ sort: s === "featured" ? undefined : s })} count={total} />
            <div className="md:hidden"><CatalogSearch value={search.q ?? ""} onChange={(q) => update({ q: q || undefined })} autoOpen={!!search.search} /></div>
          </div>

          <div className="flex min-h-12 flex-wrap items-center gap-x-5 gap-y-2 py-4">
            <span className="eyebrow text-muted-foreground" aria-live="polite">{total} {total === 1 ? "piece" : "pieces"}</span>
            {chips.map((c) => (
              <button key={c.key + c.value} type="button" onClick={() => toggle(c.key, c.value)} className="inline-flex h-8 items-center gap-2 border border-border px-3 text-xs transition-colors hover:border-foreground" aria-label={`Remove filter ${c.label}`}>
                {c.label}<X className="h-3 w-3" strokeWidth={1.25} />
              </button>
            ))}
            {search.q && <span className="text-xs text-muted-foreground">“{search.q}”</span>}
            {hasActive && <button type="button" onClick={clearAll} className="link-underline eyebrow">Clear all</button>}
          </div>
        </Container>
      </section>

      <section className="pb-28 pt-6 lg:pb-40">
        <Container>
          {results.length === 0 ? (
            <div className="mx-auto max-w-md py-24 text-center lg:py-32">
              <p className="font-display text-4xl sm:text-5xl">No pieces found.</p>
              <p className="mt-5 text-[0.95rem] text-muted-foreground">{search.q ? "Try another search or explore our collections." : "No pieces match your current selection."}</p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button type="button" onClick={clearAll} className={luxButton({ variant: "secondary" })}>Clear filters</button>
                <Link to="/collections" className={luxButton({ variant: "tertiary" })}>Explore collections</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-20">
                {results.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 0.08}><ProductCard product={p} /></Reveal>
                ))}
              </div>
              {total > results.length && (
                <div className="mt-20 flex flex-col items-center gap-5">
                  <span className="eyebrow text-muted-foreground">Showing {results.length} of {total}</span>
                  <button type="button" onClick={() => setLimit((l) => l + PAGE)} disabled={isFetching} className={luxButton({ variant: "secondary" })}>{isFetching ? "Loading…" : "Load more"}</button>
                </div>
              )}
            </>
          )}
        </Container>
      </section>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <Container className="pb-28 pt-40">
      <div className="h-3 w-24 bg-secondary" />
      <div className="mt-10 h-14 w-2/3 bg-secondary" />
      <div className="mt-16 grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
        {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </Container>
  );
}

function CatalogError({ reset }: { reset: () => void }) {
  return (
    <Container className="py-48 text-center">
      <p className="font-display text-4xl sm:text-5xl">We couldn't load the collection.</p>
      <p className="mt-5 text-muted-foreground">Please try again in a moment.</p>
      <button type="button" onClick={reset} className={luxButton({ variant: "secondary", className: "mt-10" })}>Try again</button>
    </Container>
  );
}
