import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageShell";
import { CollectionCard } from "@/components/site/cards";
import { Container, Reveal } from "@/components/site/primitives";
import { useSuspenseQuery } from "@tanstack/react-query";
import { collectionsQuery } from "@/lib/catalog.queries";
export const Route = createFileRoute("/_site/collections")({
  head: () => ({
    meta: [
      { title: "Collections — Élan Fine Jewellery" },
      { name: "description", content: "Signature collections from the Élan atelier, each a quiet study in form." },
      { property: "og:title", content: "Collections — Élan Fine Jewellery" },
      { property: "og:description", content: "Signature collections from the Élan atelier, each a quiet study in form." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(collectionsQuery()),
  component: Page,
});

function Page() {
  const { data: collections } = useSuspenseQuery(collectionsQuery());
  return (
    <PageHeader eyebrow="Collections" title="Collections" intro="Signature collections from the Élan atelier, each a quiet study in form.">
      <Container className="grid gap-12 py-20 md:grid-cols-3 md:gap-8 lg:py-28">{collections.map((c, i) => <Reveal key={c.id} delay={i * 0.1}><CollectionCard collection={c} /></Reveal>)}</Container>
    </PageHeader>
  );
}
