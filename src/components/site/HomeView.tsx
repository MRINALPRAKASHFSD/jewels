import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { CollectionTile, ProductCard } from "@/components/site/cards";
import { Container, ImageReveal, Reveal, SectionHeading, ease, luxButton } from "@/components/site/primitives";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { homeCopy as copy, media } from "@/data/content";
import type { CollectionItem, ProductSummary } from "@/data/catalog";
import type { HomeView as HomeViewData } from "@/data/home";

const arrowLink = "eyebrow group inline-flex items-center gap-3 py-2";
function Arrow() {
  return <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 ease-lux group-hover:translate-x-1" strokeWidth={1.25} />;
}

export function HomeView({ home, collections, products }: { home: HomeViewData; collections: CollectionItem[]; products: ProductSummary[] }) {
  const [c0, c1, c2] = collections;
  const { hero, story, quote, craftsmanship: cr, appointment: ap } = Object.fromEntries(Object.entries(home).map(([k, v]) => [k, v.f])) as Record<string, Record<string, string>>;
  const on = (k: string) => home[k]?.active !== false;
  return (
    <>
      {/* HERO */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-espresso text-ivory">
        <motion.img
          src={hero!["image"]}
          alt="Model wearing a fine gold solitaire necklace in soft window light"
          width={1920}
          height={1088}
          fetchPriority="high"
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.6, ease }}
          className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
        />
        <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-espresso/55 via-espresso/15 to-transparent sm:w-2/3" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-espresso/50 to-transparent sm:hidden" />
        <Container className="relative flex h-full flex-col justify-end pb-14 sm:pb-20 lg:pb-24">
          <div className="max-w-[34rem]">
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.7, ease }} className="eyebrow mb-6 text-ivory/80">
              {hero!["eyebrow"]}
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.9, ease }} className="font-display text-[2.6rem] sm:text-6xl lg:text-[4.75rem]">
              {hero!["heading"]}
            </motion.h1>
            {hero!["description"] && <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ivory/85">{hero!["description"]}</p>}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.2, ease }} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to="/collections" className={luxButton({ variant: "ghostLight" })}>{hero!["primaryCta"]}</Link>
              <Link to="/about" className={`${arrowLink} text-ivory/90`}>{hero!["secondaryCta"]} <Arrow /></Link>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* COLLECTIONS */}
      {on("collections") && (<section className="pb-24 pt-28 sm:pt-36 lg:pb-32 lg:pt-48">
        <Container>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <SectionHeading eyebrow={home["collections"]!.f["eyebrow"] ?? ""} title={home["collections"]!.f["heading"] ?? ""} className="lg:col-span-7" />
            <Reveal delay={0.1} className="lg:col-span-5 lg:justify-self-end"><Link to="/collections" className={arrowLink}>All collections <Arrow /></Link></Reveal>
          </div>
          <div className="mt-14 grid gap-4 sm:gap-5 lg:mt-20 lg:h-[min(88vh,900px)] lg:grid-cols-[1.7fr_1fr] lg:grid-rows-2">
            {c0 && <CollectionTile collection={c0} className="aspect-[4/5] sm:aspect-[4/3] lg:row-span-2 lg:aspect-auto" />}
            {c1 && <CollectionTile collection={c1} className="aspect-[4/3] lg:aspect-auto" />}
            {c2 && <CollectionTile collection={c2} className="aspect-[4/3] lg:aspect-auto" />}
          </div>
        </Container>
      </section>)}

      {/* SIGNATURE PIECES */}
      {on("signature") && (<section className="py-24 lg:py-32">
        <Container>
          <SectionHeading eyebrow={home["signature"]!.f["eyebrow"] ?? ""} title={home["signature"]!.f["heading"] ?? ""} align="center" />
          <div className="mt-16 grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-6 lg:mt-20 lg:grid-cols-4 lg:gap-x-8">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.1} className={i % 2 === 1 ? "lg:mt-16" : ""}><ProductCard product={p} /></Reveal>
            ))}
          </div>
          <Reveal className="mt-16 text-center"><Link to="/jewellery" className={luxButton({ variant: "secondary" })}>View all jewellery</Link></Reveal>
        </Container>
      </section>)}

      {/* EDITORIAL STORY */}
      {on("story") && (<section className="bg-secondary">
        <div className="grid lg:grid-cols-2">
          <ImageReveal src={story!["image"]!} alt="Hands resting on ivory silk wearing a gold solitaire ring and bangle" ratio="portrait" className="lg:aspect-auto lg:min-h-[820px]" width={1152} height={1440} />
          <div className="flex items-center px-5 py-20 sm:px-12 lg:px-20 xl:px-28">
            <div className="max-w-lg">
              <Reveal><p className="eyebrow mb-8 text-muted-foreground">{story!["eyebrow"]}</p></Reveal>
              <Reveal delay={0.1}><h2 className="font-display text-3xl leading-tight sm:text-4xl xl:text-5xl">{story!["heading"]}</h2></Reveal>
              <Reveal delay={0.2}>
                <p className="mt-8 text-[0.95rem] leading-relaxed text-muted-foreground">{story!["body"]}</p>
                <Link to="/about" className={`${arrowLink} mt-10`}>{story!["cta"]} <Arrow /></Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>)}

      {/* TYPOGRAPHIC BREAK */}
      {on("quote") && (<section className="py-36 sm:py-48 lg:py-64">
        <Container>
          <Reveal y={30}>
            <blockquote className="font-display mx-auto max-w-4xl text-center text-4xl leading-[1.1] sm:text-6xl lg:text-7xl">
              <span className="block">{quote!["quote"]}</span>
              <em className="block text-muted-foreground">{quote!["supporting"]}</em>
            </blockquote>
          </Reveal>
        </Container>
      </section>)}

      {/* CRAFTSMANSHIP */}
      {on("craftsmanship") && (<section className="surface-dark py-24 lg:py-36">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
            <SectionHeading eyebrow={cr!["eyebrow"] ?? ""} title={cr!["heading"] ?? ""} className="lg:col-span-6" />
            <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
              <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{cr!["description"]}</p>
            </Reveal>
          </div>
          <ImageReveal src={cr!["image"]!} alt="A goldsmith polishing a gold ring at a wooden bench" ratio="wide" className="mt-16 lg:mt-20 lg:aspect-[21/9]" position="center 40%" width={1152} height={1408} />
          <ol className="relative mt-20 grid gap-14 sm:grid-cols-2 lg:mt-24 lg:grid-cols-4 lg:gap-10">
            <span aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-px bg-border lg:block" />
            {copy.craft.steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.12}>
                <li className="relative list-none">
                  <span aria-hidden className="relative z-10 hidden h-[15px] w-[15px] items-center justify-center bg-espresso lg:flex"><span className="h-[5px] w-[5px] rotate-45 bg-champagne" /></span>
                  <div className="flex items-baseline gap-4 lg:mt-8">
                    <span className="font-display text-xl text-champagne">{s.n}</span>
                    <h3 className="eyebrow">{s.title}</h3>
                  </div>
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{cr![`step${i + 1}`]}</p>
                  <ImageReveal src={media.craftStepImages[s.key]} alt={`${s.title} stage`} ratio="landscape" className="mt-6 hidden opacity-80 grayscale-[35%] sm:block" />
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>)}

      {/* LOOKBOOK */}
      {on("lookbook") && (<section className="py-28 lg:py-44">
        <Container>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <SectionHeading eyebrow={home["lookbook"]!.f["eyebrow"] ?? ""} title={home["lookbook"]!.f["heading"] ?? ""} className="lg:col-span-7" />
            <Reveal delay={0.1} className="lg:col-span-5 lg:justify-self-end"><Link to="/lookbook" className={arrowLink}>View lookbook <Arrow /></Link></Reveal>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-5 lg:mt-20 lg:grid-cols-12 lg:gap-6">
            <ImageReveal src={media.lookbookImages[0]} alt="Woman in an ivory saree wearing statement gold chandbali earrings" ratio="portrait" className="col-span-2 sm:col-span-1 lg:col-span-5 lg:row-span-2" />
            <ImageReveal src={media.lookbookImages[2]} alt="Detail of a diamond ear climber" ratio="tall" className="lg:col-span-3 lg:col-start-7 lg:mt-24" />
            <ImageReveal src={media.lookbookImages[1]} alt="Woman by a sunlit window wearing layered gold necklaces" ratio="landscape" className="col-span-2 sm:col-span-1 lg:col-span-6 lg:col-start-7 lg:self-end" />
          </div>
        </Container>
      </section>)}

      {/* APPOINTMENT */}
      {on("appointment") && (<section className="border-t border-border">
        <Container className="grid gap-12 py-24 lg:grid-cols-12 lg:items-center lg:py-36">
          <Reveal className="lg:col-span-6">
            <p className="eyebrow mb-6 text-muted-foreground">{ap!["eyebrow"]}</p>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl">{ap!["heading"]}</h2>
          </Reveal>
          <Reveal delay={0.15} className="lg:col-span-5 lg:col-start-8">
            <p className="text-[0.95rem] leading-relaxed text-muted-foreground">{ap!["body"]} Visit the atelier by appointment, or speak with us directly — we reply personally, usually within the hour.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link to="/contact" className={luxButton()}>Book an Appointment</Link>
              <WhatsAppButton />
            </div>
          </Reveal>
        </Container>
      </section>)}
    </>
  );
}
