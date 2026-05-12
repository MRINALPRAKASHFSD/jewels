import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ease } from "./primitives";

const pad2 = (n: number) => String(n).padStart(2, "0");

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* Desktop: vertical thumbnails + main image */}
      <div className="hidden gap-5 md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[88px_1fr]">
        <div className="flex flex-col gap-3" role="tablist" aria-label={`${name} images`}>
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View image ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
              className={cn("relative aspect-[4/5] overflow-hidden bg-secondary transition-opacity duration-300", i === active ? "opacity-100" : "opacity-50 hover:opacity-80")}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className={cn("absolute inset-x-0 bottom-0 h-px bg-foreground transition-transform duration-500 ease-lux", i === active ? "scale-x-100" : "scale-x-0")} />
            </button>
          ))}
        </div>
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <AnimatePresence initial={false}>
            <motion.img
              key={active}
              src={images[active]}
              alt={`${name} — image ${active + 1}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
          <span className="eyebrow absolute bottom-5 right-5 text-foreground/70 tabular-nums">{pad2(active + 1)} / {pad2(images.length)}</span>
        </div>
      </div>

      {/* Mobile: swipeable track with counter */}
      <div className="relative -mx-5 sm:-mx-8 md:hidden">
        <div
          ref={track}
          onScroll={(e) => { const el = e.currentTarget; setMobileIdx(Math.round(el.scrollLeft / el.clientWidth)); }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-label={`${name} images, swipe to browse`}
        >
          {images.map((src, i) => (
            <div key={src + i} className="aspect-[4/5] w-full shrink-0 snap-center bg-secondary">
              <img src={src} alt={`${name} — image ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-4 flex items-center justify-between sm:inset-x-8">
          <div className="flex gap-1.5">{images.map((_, i) => <span key={i} className={cn("h-px w-6 transition-colors", i === mobileIdx ? "bg-foreground" : "bg-foreground/25")} />)}</div>
          <span className="eyebrow text-foreground/75 tabular-nums">{pad2(mobileIdx + 1)} / {pad2(images.length)}</span>
        </div>
      </div>
    </div>
  );
}
