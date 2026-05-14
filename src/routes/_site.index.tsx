import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/site/HomeView";
import { mergeHome } from "@/data/home";
import { useSuspenseQuery } from "@tanstack/react-query";
import { collectionsQuery, featuredProductsQuery, homeContentQuery } from "@/lib/catalog.queries";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Élan — Fine Jewellery, Quietly Made" },
      { name: "description", content: "Élan is a house of fine jewellery — modern Indian elegance in gold, diamond and pearl." },
      { property: "og:title", content: "Élan — Fine Jewellery, Quietly Made" },
      { property: "og:description", content: "Modern Indian elegance in gold, diamond and pearl." },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(collectionsQuery()),
    context.queryClient.ensureQueryData(featuredProductsQuery(4)),
    context.queryClient.ensureQueryData(homeContentQuery()),
  ]),
  component: Home,
});

function Home() {
  const { data: collections } = useSuspenseQuery(collectionsQuery());
  const { data: products } = useSuspenseQuery(featuredProductsQuery(4));
  const { data: content } = useSuspenseQuery(homeContentQuery());
  return <HomeView home={mergeHome(content)} collections={collections} products={products} />;
}
