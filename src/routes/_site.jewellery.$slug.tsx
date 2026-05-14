import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProductCard, WishlistButton } from "@/components/site/cards";
import { ProductGallery } from "@/components/site/ProductGallery";
import { Container, Reveal, SectionHeading, luxButton } from "@/components/site/primitives";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatProductPrice, getCategoryLabel, getCollectionLabel, materialLine, productDetails, productLabel } from "@/data/catalog";
import { productQuery } from "@/lib/catalog.queries";

export const Route = createFileRoute("/_site/jewellery/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!data) throw notFound();
    return { product: data.product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Unavailable — Élan" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.product;
    const title = `${p.name} | Élan Jewellery`;
    const description = `Discover the ${p.name}, crafted in ${p.metal}${p.stone !== "Other" ? ` with ${p.stone.toLowerCase()}` : ""}. ${p.description.split(".")[0]}.`.slice(0, 160);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.description,
          brand: { "@type": "Brand", name: "Élan" },
          category: getCategoryLabel(p.category),
          material: p.metal,
          ...(p.price !== null && { offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, availability: p.availability === "sold-out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" } }),
        }),
      }],
    };
  },
  notFoundComponent: ProductNotFound,
  errorComponent: ProductError,
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  if (!data) return <ProductNotFound />;
  const { product: p, related } = data;
  const label = productLabel(p);
  const sections = [
    { id: "description", title: "Description", body: <p>{p.description}</p> },
    { id: "details", title: "Materials & Details", body: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-3">
        {productDetails(p).map((d) => (<div key={d.label} className="contents"><dt className="text-muted-foreground">{d.label}</dt><dd>{d.value}</dd></div>))}
      </dl>
    ) },
    { id: "craft", title: "Craftsmanship", body: <p>Drawn by hand, then made by a single master karigar in our atelier. Every stone is set and every surface finished by hand before the piece is inspected and hallmarked.</p> },
    { id: "care", title: "Care Guide", body: p.care ? <p>{p.care}</p> : <p>Store separately in the Élan pouch provided. Remove before swimming or applying perfume. Clean gently with a soft, dry cloth; we offer complimentary cleaning at the atelier.</p> },
    { id: "shipping", title: "Shipping & Returns", body: p.shipping ? <p>{p.shipping}</p> : <p>Complimentary insured shipping across India. Made-to-order pieces are delivered in 4–6 weeks. Ready pieces may be exchanged within 14 days in original condition.</p> },
  ];

  return (
    <>
      <section className="pt-24 md:pt-32 lg:pt-36">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-6 hidden md:block">
            <ol className="flex flex-wrap items-center gap-3 eyebrow text-muted-foreground">
              <li><Link to="/" className="link-underline">Home</Link></li><li aria-hidden>/</li>
              <li><Link to="/jewellery" className="link-underline">Jewellery</Link></li><li aria-hidden>/</li>
              <li><Link to="/jewellery" search={{ category: p.category }} className="link-underline">{getCategoryLabel(p.category)}</Link></li><li aria-hidden>/</li>
              <li className="text-foreground" aria-current="page">{p.name}</li>
            </ol>
          </nav>
          <div className="grid gap-10 md:grid-cols-[1.15fr_1fr] md:gap-12 lg:gap-20">
            <ProductGallery images={p.images} name={p.name} />

            <div className="md:sticky md:top-28 md:self-start">
              <nav aria-label="Breadcrumb" className="mb-6 md:hidden">
                <Link to="/jewellery" search={{ category: p.category }} className="eyebrow text-muted-foreground">← {getCategoryLabel(p.category)}</Link>
              </nav>
              <Reveal>
                <p className="eyebrow text-muted-foreground">{getCollectionLabel(p.collection)} Collection{label && <span className="text-foreground"> · {label}</span>}</p>
                <h1 className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl">{p.name}</h1>
                <p className="mt-3 text-sm text-muted-foreground">{materialLine(p)}</p>
                <p className="mt-6 text-lg tabular-nums">{formatProductPrice(p)}</p>
                <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">{p.description}</p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <WhatsAppButton productName={p.name} label="Enquire now" variant="primary" className="flex-1" />
                  <WishlistButton productId={p.slug} label={p.name} withText className="flex-1" />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{p.availability === "made-to-order" ? "Made to order · 4–6 weeks" : "Ready to ship · Complimentary insured delivery"}</p>
              </Reveal>

              <Accordion type="single" collapsible defaultValue="details" className="mt-12 border-t border-border">
                {sections.map((s) => (
                  <AccordionItem key={s.id} value={s.id} className="border-border">
                    <AccordionTrigger className="eyebrow py-5 hover:no-underline">{s.title}</AccordionTrigger>
                    <AccordionContent className="pb-6 text-sm leading-relaxed text-foreground/85">{s.body}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-10 bg-secondary px-6 py-7">
                <p className="font-display text-2xl">Prefer to see it in person?</p>
                <Link to="/contact" className="eyebrow group mt-4 inline-flex items-center gap-3 py-2">Book a private appointment <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1" strokeWidth={1.25} /></Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-28 lg:py-40">
        <Container>
          <div className="flex items-end justify-between gap-6">
            <SectionHeading eyebrow="You may also like" title="Chosen alongside" />
            <Link to="/jewellery" className={luxButton({ variant: "tertiary", className: "hidden sm:inline-flex" })}>View all</Link>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {related.map((r, i) => <Reveal key={r.id} delay={i * 0.08}><ProductCard product={r} /></Reveal>)}
          </div>
        </Container>
      </section>
    </>
  );
}

function ProductNotFound() {
  return (
    <Container className="py-48 text-center">
      <p className="font-display text-5xl">We couldn't find that piece.</p>
      <p className="mt-5 text-muted-foreground">Explore the full collection to find something similar.</p>
      <Link to="/jewellery" className={luxButton({ variant: "secondary", className: "mt-10" })}>Browse jewellery</Link>
    </Container>
  );
}

function ProductError({ reset }: { reset: () => void }) {
  return (
    <Container className="py-48 text-center">
      <p className="font-display text-5xl">We couldn't load this piece.</p>
      <p className="mt-5 text-muted-foreground">Please try again in a moment.</p>
      <button type="button" onClick={reset} className={luxButton({ variant: "secondary", className: "mt-10" })}>Try again</button>
    </Container>
  );
}
