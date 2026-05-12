import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ease = [0.22, 1, 0.36, 1] as const;

export const luxButton = cva(
  "inline-flex items-center justify-center gap-3 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] transition-colors duration-500 ease-lux focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/85 h-11 px-7",
        secondary: "border border-foreground/30 text-foreground hover:border-foreground hover:bg-foreground hover:text-background h-11 px-7",
        tertiary: "link-underline text-foreground h-auto px-0 pb-1",
        ghostLight: "border border-ivory/50 text-ivory hover:bg-ivory hover:text-espresso h-11 px-7",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);
export type LuxButtonProps = VariantProps<typeof luxButton>;

export const LuxButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & LuxButtonProps>(
  ({ className, variant, ...props }, ref) => <button ref={ref} className={cn(luxButton({ variant }), className)} {...props} />,
);
LuxButton.displayName = "LuxButton";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-14", className)}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, intro, align = "left", className }: { eyebrow?: string; title: ReactNode; intro?: string; align?: "left" | "center"; className?: string }) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow mb-5 text-muted-foreground">{eyebrow}</p>}
      <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl">{title}</h2>
      {intro && <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">{intro}</p>}
    </Reveal>
  );
}

export function Reveal({ children, delay = 0, y = 24, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const ratios = { portrait: "aspect-[4/5]", tall: "aspect-[3/4]", square: "aspect-square", wide: "aspect-[16/9]", landscape: "aspect-[3/2]", fill: "" };

/** Reusable image frame: clip reveal on enter, optional hover zoom (needs a `group` parent), placeholder when no src. */
export function ImageReveal({ src, alt, ratio = "portrait", className, eager, hoverScale, width, height, position }: { src?: string | undefined; alt: string; ratio?: keyof typeof ratios; className?: string; eager?: boolean; hoverScale?: boolean; width?: number; height?: number; position?: string }) {
  return (
    <motion.div
      initial={{ clipPath: "inset(8% 0% 8% 0%)" }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.3, ease }}
      className={cn("relative overflow-hidden bg-secondary", ratios[ratio], className)}
    >
      {src ? (
        <motion.div initial={{ scale: 1.1 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease }} className="absolute inset-0">
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            style={position ? { objectPosition: position } : undefined}
            className={cn("h-full w-full object-cover", hoverScale && "transition-transform duration-700 ease-lux group-hover:scale-[1.03]")}
          />
        </motion.div>
      ) : (
        <div className="placeholder-frame absolute inset-0 flex items-center justify-center" role="img" aria-label={alt}>
          <span className="wordmark text-xs text-muted-foreground/60">Élan</span>
        </div>
      )}
    </motion.div>
  );
}
