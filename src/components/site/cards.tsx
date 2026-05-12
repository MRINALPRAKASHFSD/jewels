import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist";
import { formatProductPrice, materialLine, productLabel, type CollectionItem, type ProductSummary } from "@/data/catalog";
import { ImageReveal } from "./primitives";

export function WishlistButton({ productId, label, className, withText }: { productId: string; label: string; className?: string; withText?: boolean }) {
  const { has, toggle } = useWishlist();
  const on = has(productId);
  return (
    <button
      type="button"
      aria-label={on ? `Remove ${label} from wishlist` : `Add ${label} to wishlist`}
      aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(productId); }}
      className={cn(
        withText
          ? "eyebrow inline-flex h-11 items-center justify-center gap-3 border border-foreground/30 px-7 transition-colors duration-500 hover:border-foreground"
          : "flex h-11 w-11 items-center justify-center text-foreground/70 transition-colors hover:text-foreground",
        "focus-visible:outline-1 focus-visible:outline-ring",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform duration-300", on && "scale-110 fill-current text-foreground")} strokeWidth={1.25} />
      {withText && <span>{on ? "Saved to wishlist" : "Add to wishlist"}</span>}
    </button>
  );
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const label = productLabel(product);
  return (
    <Link to="/jewellery/$slug" params={{ slug: product.slug }} className="group block focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ring">
      <div className="relative">
        <ImageReveal src={product.thumbnail} alt={`${product.name} — ${materialLine(product)}`} ratio="tall" hoverScale />
        {product.secondaryImage && (
          <img src={product.secondaryImage} alt="" aria-hidden loading="lazy" className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-500 ease-lux group-hover:opacity-100 md:block" />
        )}
        {label && <span className="eyebrow absolute left-3 top-4 text-[0.625rem] text-foreground/75">{label}</span>}
        <WishlistButton productId={product.slug} label={product.name} className="absolute right-1 top-1" />
      </div>
      <div className="mt-5 space-y-1.5">
        <h3 className="eyebrow text-foreground">{product.name}</h3>
        <p className="text-[13px] text-muted-foreground">{materialLine(product)}</p>
        <p className="text-[13px] tabular-nums">{formatProductPrice(product)}</p>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden>
      <div className="placeholder-frame aspect-[3/4] animate-pulse" />
      <div className="mt-5 space-y-2.5">
        <div className="h-2.5 w-2/3 bg-secondary" />
        <div className="h-2.5 w-1/2 bg-secondary" />
        <div className="h-2.5 w-1/4 bg-secondary" />
      </div>
    </div>
  );
}

/** Editorial collection tile: text sits over the image, overlay deepens on hover. */
export function CollectionTile({ collection, className, eager }: { collection: CollectionItem; className?: string; eager?: boolean }) {
  return (
    <Link to="/collections" className={cn("group relative block overflow-hidden text-ivory focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ring", className)}>
      <ImageReveal src={collection.image} alt={`${collection.name} collection`} ratio="fill" className="absolute inset-0 h-full" hoverScale eager={eager ?? false} />
      <div className="absolute inset-0 bg-espresso/10 transition-colors duration-500 ease-lux group-hover:bg-espresso/25" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-espresso/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 transition-transform duration-500 ease-lux group-hover:-translate-y-1 sm:p-8 lg:p-10">
        <h3 className="eyebrow text-ivory">{collection.name}</h3>
        <p className="font-display mt-3 max-w-xs text-2xl leading-tight sm:text-3xl">{collection.tagline}</p>
        <span className="eyebrow mt-5 inline-flex items-center gap-2 text-ivory/90">
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1" strokeWidth={1.25} />
        </span>
      </div>
    </Link>
  );
}

export function CollectionCard({ collection, ratio = "portrait" }: { collection: CollectionItem; ratio?: "portrait" | "tall" | "square" }) {
  return (
    <Link to="/collections" className="group block">
      <ImageReveal src={collection.image} alt={collection.name} ratio={ratio} hoverScale />
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-display text-3xl">{collection.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{collection.tagline}</p>
        </div>
        <span className="eyebrow text-muted-foreground">{collection.pieces} pieces</span>
      </div>
    </Link>
  );
}
