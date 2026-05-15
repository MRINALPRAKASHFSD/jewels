import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/site/cards";
import { PageHeader } from "@/components/site/PageShell";
import { Container, Reveal, luxButton } from "@/components/site/primitives";
import { useQuery } from "@tanstack/react-query";
import { wishlistProductsQuery } from "@/lib/catalog.queries";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/_site/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Élan Fine Jewellery" },
      { name: "description", content: "The Élan pieces you have saved." },
      { property: "og:title", content: "Wishlist — Élan Fine Jewellery" },
      { property: "og:description", content: "The Élan pieces you have saved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { ids } = useWishlist();
  const { data: items = [], isPending } = useQuery({ ...wishlistProductsQuery(ids), enabled: ids.length > 0 });
  return (
    <PageHeader eyebrow="Wishlist" title="Your Wishlist">
      <Container className="py-20 lg:py-28">
        {ids.length > 0 && isPending ? (
          <div className="h-96" aria-busy="true" />
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="font-display text-4xl sm:text-5xl">Your collection is waiting.</p>
            <p className="mt-5 text-[0.95rem] text-muted-foreground">Save pieces you love and return to them anytime.</p>
            <Link to="/jewellery" className={luxButton({ variant: "secondary", className: "mt-10" })}>Discover jewellery</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
            {items.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 0.08}><ProductCard product={p} /></Reveal>)}
          </div>
        )}
      </Container>
    </PageHeader>
  );
}
