// Public data-access layer. Reads go through these server functions (RLS: visitor)
// and fall back to mock data when the database connection is unavailable.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  filterConfig,
  type CatalogFilters,
  type CollectionItem,
  type LookbookItem,
} from "@/data/catalog";
import {
  mockCategories,
  mockCollections,
  mockLookbook,
  mockSiteSettings,
  queryMockCatalog,
  getMockFeaturedProducts,
  getMockProductBySlug,
  getMockProductsBySlugs,
} from "@/data/mock";
import {
  DETAIL_SELECT,
  SUMMARY_SELECT,
  imageUrlsOf,
  publicDb,
  resolveUrl,
  signUrls,
  toDetail,
  toSummary,
  type PublicDb,
} from "./catalog.server";

const filtersSchema = z.object({
  category: z.string().max(40).default("all"),
  q: z.string().max(80).default(""),
  collection: z.array(z.string().max(40)).max(10).default([]),
  metal: z.array(z.string().max(40)).max(10).default([]),
  stone: z.array(z.string().max(40)).max(10).default([]),
  occasion: z.array(z.string().max(40)).max(10).default([]),
  price: z.array(z.string().max(20)).max(10).default([]),
  availability: z.array(z.string().max(20)).max(5).default([]),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc"]).default("featured"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rows = any[];

async function summaries(db: PublicDb, rows: Rows) {
  const signed = await signUrls(db, imageUrlsOf(rows, 2));
  return rows.map((r) => toSummary(r, signed));
}

/** Catalogue listing: filtering, search, sorting and paging run in the database with mock fallback. */
export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({ filters: filtersSchema, limit: z.number().int().min(1).max(96).default(12) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const f: CatalogFilters = data.filters;
      const db = publicDb();
      const collectionJoin = f.collection.length
        ? "collection:collections!inner(slug)"
        : "collection:collections(slug)";
      let q = db
        .from("products")
        .select(SUMMARY_SELECT.replace("collection:collections(slug)", collectionJoin), {
          count: "exact",
        })
        .eq("status", "published");

      if (f.category === "new") q = q.eq("is_new", true);
      else if (f.category !== "all") q = q.eq("categories.slug", f.category);
      if (f.collection.length) q = q.in("collections.slug", f.collection);
      if (f.metal.length) q = q.in("metal", f.metal);
      if (f.stone.length) q = q.in("stone", f.stone);
      if (f.occasion.length) q = q.overlaps("occasions", f.occasion);
      if (f.availability.length) q = q.in("availability", f.availability);
      const ranges = filterConfig.price.filter((r) => f.price.includes(r.id));
      if (ranges.length)
        q = q.or(
          ranges
            .map((r) =>
              Number.isFinite(r.max)
                ? `and(price.gte.${r.min},price.lt.${r.max})`
                : `price.gte.${r.min}`,
            )
            .join(","),
        );

      const words = f.q
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6);
      if (words.length) {
        const [{ data: cats }, { data: cols }] = await Promise.all([
          db.from("categories").select("id, name, slug"),
          db.from("collections").select("id, name, slug"),
        ]);
        for (const w of words) {
          const catIds = (cats ?? [])
            .filter((c) => c.name.toLowerCase().includes(w) || c.slug.includes(w))
            .map((c) => c.id);
          const colIds = (cols ?? [])
            .filter((c) => c.name.toLowerCase().includes(w) || c.slug.includes(w))
            .map((c) => c.id);
          const parts = [
            `name.ilike.%${w}%`,
            `metal.ilike.%${w}%`,
            `stone.ilike.%${w}%`,
            `tags.cs.{"${w}"}`,
          ];
          if (catIds.length) parts.push(`category_id.in.(${catIds.join(",")})`);
          if (colIds.length) parts.push(`collection_id.in.(${colIds.join(",")})`);
          q = q.or(parts.join(","));
        }
      }

      switch (f.sort) {
        case "newest":
          q = q.order("created_at", { ascending: false });
          break;
        case "price-asc":
          q = q.order("price", { ascending: true, nullsFirst: false });
          break;
        case "price-desc":
          q = q.order("price", { ascending: false, nullsFirst: false });
          break;
        default:
          q = q
            .order("is_featured", { ascending: false })
            .order("is_bestseller", { ascending: false })
            .order("created_at", { ascending: false });
      }
      q = q.order("id").range(0, data.limit - 1);

      const { data: rows, error, count } = await q;
      if (error) throw error;
      return { items: await summaries(db, rows ?? []), total: count ?? 0 };
    } catch (err) {
      console.warn("[catalog] listProducts falling back to mock data:", err);
      return queryMockCatalog(data.filters, data.limit);
    }
  });

/** Product detail by slug, with gallery and related pieces. */
export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const db = publicDb();
      const { data: row, error } = await db
        .from("products")
        .select(DETAIL_SELECT)
        .eq("status", "published")
        .eq("slug", data.slug)
        .maybeSingle();
      if (error) throw error;
      if (!row) return getMockProductBySlug(data.slug);
      const r = row as Rows[number];

      // Related items: same category first, then same collection, excluding the product itself.
      const base = () =>
        db
          .from("products")
          .select(SUMMARY_SELECT)
          .eq("status", "published")
          .neq("id", r.id)
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
      const { data: sameCat } = await base()
        .eq("category_id", await catId(db, r.category?.slug))
        .limit(4);
      let related: Rows = sameCat ?? [];
      if (related.length < 4 && r.collection?.slug) {
        const { data: col } = await db
          .from("collections")
          .select("id")
          .eq("slug", r.collection.slug)
          .maybeSingle();
        if (col) {
          const exclude = [r.id, ...related.map((x) => x.id)];
          const { data: more } = await base()
            .eq("collection_id", col.id)
            .not("id", "in", `(${exclude.join(",")})`)
            .limit(4 - related.length);
          related = [...related, ...(more ?? [])];
        }
      }

      const signed = await signUrls(db, [...imageUrlsOf([r]), ...imageUrlsOf(related, 2)]);
      return { product: toDetail(r, signed), related: related.map((x) => toSummary(x, signed)) };
    } catch (err) {
      console.warn(`[catalog] getProductBySlug(${data.slug}) falling back to mock data:`, err);
      return getMockProductBySlug(data.slug);
    }
  });

async function catId(db: PublicDb, slug?: string) {
  if (!slug) return "00000000-0000-0000-0000-000000000000";
  const { data } = await db.from("categories").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? "00000000-0000-0000-0000-000000000000";
}

/** Wishlist lookup. Archived or removed pieces are omitted. */
export const getProductsBySlugs = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ slugs: z.array(z.string().max(120)).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!data.slugs.length) return [];
    try {
      const db = publicDb();
      const { data: rows, error } = await db
        .from("products")
        .select(SUMMARY_SELECT)
        .eq("status", "published")
        .in("slug", data.slugs);
      if (error) throw error;
      const items = await summaries(db, rows ?? []);
      return data.slugs.map((s) => items.find((p) => p.slug === s)).filter((p) => !!p);
    } catch (err) {
      console.warn("[catalog] getProductsBySlugs falling back to mock data:", err);
      return getMockProductsBySlugs(data.slugs);
    }
  });

export const getFeaturedProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(24).default(4) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const db = publicDb();
      const { data: rows, error } = await db
        .from("products")
        .select(SUMMARY_SELECT)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("is_bestseller", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (error) throw error;
      return summaries(db, rows ?? []);
    } catch (err) {
      console.warn("[catalog] getFeaturedProducts falling back to mock data:", err);
      return getMockFeaturedProducts(data.limit);
    }
  });

export const getCollections = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionItem[]> => {
    try {
      const db = publicDb();
      const { data: rows, error } = await db
        .from("collections")
        .select("id, slug, name, tagline, description, hero_image_url, products(count)")
        .order("sort_order");
      if (error) throw error;
      const signed = await signUrls(
        db,
        (rows ?? []).map((c) => c.hero_image_url),
      );
      return (rows ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        tagline: c.tagline ?? "",
        description: c.description ?? "",
        image: resolveUrl(signed, c.hero_image_url),
        pieces: (c.products as unknown as { count: number }[])?.[0]?.count ?? 0,
      }));
    } catch (err) {
      console.warn("[catalog] getCollections falling back to mock data:", err);
      return mockCollections;
    }
  },
);

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await publicDb()
      .from("categories")
      .select("id, slug, name, sort_order")
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.warn("[catalog] getCategories falling back to mock data:", err);
    return mockCategories;
  }
});

export const getLookbookItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<LookbookItem[]> => {
    try {
      const db = publicDb();
      const { data: rows, error } = await db
        .from("lookbook_items")
        .select("id, title, image_url")
        .order("sort_order");
      if (error) throw error;
      const signed = await signUrls(
        db,
        (rows ?? []).map((r) => r.image_url),
      );
      return (rows ?? []).map((r) => ({
        id: r.id,
        title: r.title ?? "",
        image: resolveUrl(signed, r.image_url) ?? "",
      }));
    } catch (err) {
      console.warn("[catalog] getLookbookItems falling back to mock data:", err);
      return mockLookbook;
    }
  },
);

/** Public site settings. */
export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await publicDb().from("site_settings").select("key, value");
    if (error) throw error;
    const map = new Map((data ?? []).map((s) => [s.key, s.value]));
    const str = (k: string) => (typeof map.get(k) === "string" ? (map.get(k) as string) : "");
    const social = map.get("social_links");
    return {
      brandName: str("brand_name") || mockSiteSettings.brandName,
      whatsappNumber: str("whatsapp_number") || mockSiteSettings.whatsappNumber,
      currency: str("currency") || mockSiteSettings.currency,
      contactEmail: str("contact_email") || mockSiteSettings.contactEmail,
      socialLinks: (social && typeof social === "object" && !Array.isArray(social)
        ? social
        : mockSiteSettings.socialLinks) as Record<string, string>,
    };
  } catch (err) {
    console.warn("[catalog] getSiteSettings falling back to defaults:", err);
    return mockSiteSettings;
  }
});

/** Published homepage content. Image fields are signed; empty fields fall back to defaults on the client. */
export const getHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = publicDb();
    const { data, error } = await db
      .from("homepage_sections")
      .select("section_key, content, is_active");
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({
      key: r.section_key,
      active: r.is_active,
      content: (r.content ?? {}) as Record<string, string>,
    }));
    const imageUrls: string[] = [];
    for (const r of rows) {
      for (const [k, v] of Object.entries(r.content)) {
        if (
          typeof v === "string" &&
          (k.toLowerCase().includes("image") || v.includes("/storage/v1/object/"))
        ) {
          imageUrls.push(v);
        }
      }
    }
    const signed = await signUrls(db, imageUrls);
    const out: Record<string, { active: boolean; content: Record<string, string> }> = {};
    for (const r of rows) {
      const content = { ...r.content };
      for (const [k, v] of Object.entries(content)) {
        if (
          typeof v === "string" &&
          (k.toLowerCase().includes("image") || v.includes("/storage/v1/object/"))
        ) {
          content[k] = resolveUrl(signed, v) ?? "";
        }
      }
      out[r.key] = { active: r.active, content };
    }
    return out;
  } catch (err) {
    console.warn("[catalog] getHomeContent falling back to empty/defaults:", err);
    return {};
  }
});
