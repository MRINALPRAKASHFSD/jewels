// Query options wrapping the data-access layer. Components use these, never the database directly.
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { CatalogFilters } from "@/data/catalog";
import { getCategories, getCollections, getFeaturedProducts, getHomeContent, getLookbookItems, getProductBySlug, getProductsBySlugs, getSiteSettings, listProducts } from "./catalog.functions";

const MIN = 60_000;

export const productsQuery = (filters: CatalogFilters, limit: number) =>
  queryOptions({ queryKey: ["products", filters, limit], queryFn: () => listProducts({ data: { filters, limit } }), staleTime: MIN, placeholderData: keepPreviousData });

const none: Omit<CatalogFilters, "category" | "sort"> = { q: "", collection: [], metal: [], stone: [], occasion: [], price: [], availability: [] };
export const getProducts = (limit = 12) => productsQuery({ ...none, category: "all", sort: "featured" }, limit);
export const getNewProducts = (limit = 12) => productsQuery({ ...none, category: "new", sort: "newest" }, limit);
export const getProductsByCategory = (category: string, limit = 12) => productsQuery({ ...none, category, sort: "featured" }, limit);
export const getProductsByCollection = (collection: string, limit = 12) => productsQuery({ ...none, category: "all", collection: [collection], sort: "featured" }, limit);

export const productQuery = (slug: string) => queryOptions({ queryKey: ["product", slug], queryFn: () => getProductBySlug({ data: { slug } }), staleTime: MIN });
export const wishlistProductsQuery = (slugs: string[]) => queryOptions({ queryKey: ["wishlist", slugs], queryFn: () => getProductsBySlugs({ data: { slugs } }), staleTime: MIN });
export const featuredProductsQuery = (limit = 4) => queryOptions({ queryKey: ["featured", limit], queryFn: () => getFeaturedProducts({ data: { limit } }), staleTime: MIN });
export const collectionsQuery = () => queryOptions({ queryKey: ["collections"], queryFn: () => getCollections(), staleTime: 5 * MIN });
export const categoriesQuery = () => queryOptions({ queryKey: ["categories"], queryFn: () => getCategories(), staleTime: 5 * MIN });
export const lookbookQuery = () => queryOptions({ queryKey: ["lookbook"], queryFn: () => getLookbookItems(), staleTime: 5 * MIN });
export const siteSettingsQuery = () => queryOptions({ queryKey: ["site-settings"], queryFn: () => getSiteSettings(), staleTime: 10 * MIN });
export const homeContentQuery = () => queryOptions({ queryKey: ["home-content"], queryFn: () => getHomeContent(), staleTime: MIN });
