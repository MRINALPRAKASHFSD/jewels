import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Container } from "./primitives";

const cols: { title: string; links: { label: string; to?: "/jewellery" | "/collections" | "/lookbook" | "/about" | "/craftsmanship" | "/contact" }[] }[] = [
  { title: "Explore", links: [{ label: "Jewellery", to: "/jewellery" }, { label: "Collections", to: "/collections" }, { label: "Lookbook", to: "/lookbook" }] },
  { title: "The House", links: [{ label: "Our Story", to: "/about" }, { label: "Craftsmanship", to: "/craftsmanship" }, { label: "Contact", to: "/contact" }] },
  { title: "Client Services", links: [{ label: "Enquiries", to: "/contact" }, { label: "Care Guide" }, { label: "Shipping" }, { label: "Returns" }] },
  { title: "Follow", links: [{ label: "Instagram" }, { label: "Pinterest" }, { label: "Facebook" }] },
];

export function Footer() {
  return (
    <footer className="surface-dark">
      <Container className="pb-10 pt-24 lg:pt-32">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_2fr] lg:gap-24">
          <div>
            <p className="wordmark text-3xl">Élan</p>
            <p className="font-display mt-6 max-w-xs text-2xl leading-snug text-foreground/85">Jewellery designed to become part of your story.</p>
            <form className="mt-12 max-w-sm" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter" className="eyebrow text-muted-foreground">Receive stories from Élan</label>
              <div className="mt-4 flex items-center border-b border-foreground/30 focus-within:border-foreground">
                <input id="newsletter" type="email" required placeholder="Email address" className="h-12 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
                <button type="submit" className="eyebrow flex h-12 items-center gap-2 pl-4 transition-opacity hover:opacity-70">Subscribe <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.25} /></button>
              </div>
            </form>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="eyebrow mb-6 text-muted-foreground">{c.title}</p>
                <ul className="space-y-3 text-sm">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.to ? <Link to={l.to} className="link-underline">{l.label}</Link> : <a href="#" className="link-underline">{l.label}</a>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-24 flex flex-col gap-4 border-t border-border pt-8 eyebrow text-muted-foreground sm:flex-row sm:justify-between">
          <span>© 2026 Élan Jewels</span>
          <div className="flex gap-8"><a href="#" className="link-underline">Privacy</a><a href="#" className="link-underline">Terms</a></div>
        </div>
      </Container>
    </footer>
  );
}
