import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Menu, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist";
import { ease } from "./primitives";

function WishlistLink({ className }: { className: string }) {
  const { count } = useWishlist();
  return (
    <Link to="/wishlist" className={className} aria-label={`Wishlist${count ? `, ${count} saved` : ""}`}>
      <Heart className={cn("h-[18px] w-[18px]", count > 0 && "fill-current")} strokeWidth={1.25} />
      {count > 0 && <span className="absolute right-1.5 top-1.5 text-[9px] font-medium tabular-nums">{count}</span>}
    </Link>
  );
}

export const navLinks = [
  { to: "/collections", label: "Collections" },
  { to: "/jewellery", label: "Jewellery" },
  { to: "/about", label: "About" },
  { to: "/craftsmanship", label: "Craftsmanship" },
  { to: "/lookbook", label: "Lookbook" },
] as const;

export function Logo({ className }: { className?: string }) {
  return <Link to="/" className={cn("wordmark text-lg sm:text-xl", className)} aria-label="Élan — home">Élan</Link>;
}

const iconBtn = "flex h-10 w-10 items-center justify-center transition-opacity hover:opacity-60";

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const transparent = overHero && !scrolled && !open;

  return (
    <>
      <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: overHero ? 1 : 0.5, delay: overHero ? 1.3 : 0, ease }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ease-lux",
          transparent ? "border-transparent bg-transparent text-ivory" : "border-border bg-background/95 text-foreground backdrop-blur-sm",
        )}
      >
        <div className={cn("mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-500 sm:px-8 lg:px-14", scrolled ? "h-16" : "h-20")}>
          <Logo className="justify-self-start" />
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-10">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="link-underline eyebrow">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="col-start-3 flex items-center justify-self-end">
            <Link to="/jewellery" search={{ search: 1 }} className={iconBtn} aria-label="Search jewellery"><Search className="h-[18px] w-[18px]" strokeWidth={1.25} /></Link>
            <WishlistLink className={cn(iconBtn, "relative hidden sm:flex")} />
            <button className={iconBtn} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" strokeWidth={1.25} /> : <Menu className="h-5 w-5" strokeWidth={1.25} />}
            </button>
          </div>
        </div>
      </motion.header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="fixed inset-0 z-40 bg-background pt-24"
        >
          <nav aria-label="Menu" className="mx-auto flex h-full max-w-[1440px] flex-col justify-between px-5 pb-10 sm:px-8 lg:px-14">
            <ul className="space-y-2">
              {[...navLinks, { to: "/contact", label: "Contact" } as const].map((l, i) => (
                <motion.li key={l.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05, duration: 0.6, ease }}>
                  <Link to={l.to} onClick={onClose} className="font-display block py-1 text-5xl transition-opacity hover:opacity-60 sm:text-6xl">{l.label}</Link>
                </motion.li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-6 eyebrow text-muted-foreground">
              <Link to="/wishlist" onClick={onClose}>Wishlist</Link><span>Enquiries</span><span>Instagram</span>
            </div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
