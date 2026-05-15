import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader } from "@/components/site/PageShell";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Élan Fine Jewellery" },
      { name: "description", content: "Book a private appointment or send an enquiry to the Élan atelier." },
      { property: "og:title", content: "Contact — Élan Fine Jewellery" },
      { property: "og:description", content: "Book a private appointment or send an enquiry to the Élan atelier." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageHeader eyebrow="Contact" title="Enquiries" intro="Book a private appointment or send an enquiry to the Élan atelier.">
      <ComingSoon note="Enquiry form arrives in the next phase" />
    </PageHeader>
  );
}
