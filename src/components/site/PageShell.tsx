import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Container, Reveal } from "./primitives";

export function Breadcrumb({ items }: { items: { label: string; to?: "/" }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-3 eyebrow text-muted-foreground">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-3">
            {it.to ? <Link to={it.to} className="link-underline">{it.label}</Link> : <span className="text-foreground">{it.label}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Editorial page header used by every inner public page. */
export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children?: ReactNode }) {
  return (
    <section className="pt-36 lg:pt-44">
      <Container>
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: eyebrow }]} />
        <div className="mt-14 grid gap-8 border-b border-border pb-16 lg:grid-cols-[2fr_1fr] lg:items-end lg:pb-20">
          <Reveal><h1 className="font-display text-5xl sm:text-7xl lg:text-8xl">{title}</h1></Reveal>
          {intro && <Reveal delay={0.1}><p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">{intro}</p></Reveal>}
        </div>
      </Container>
      {children}
    </section>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <Container className="py-28 lg:py-40">
      <p className="eyebrow text-center text-muted-foreground">{note}</p>
    </Container>
  );
}
