import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { collectionOptions, filterConfig, sortOptions, type SortId } from "@/data/catalog";
import { cn } from "@/lib/utils";

export type FilterKey = "collection" | "metal" | "stone" | "occasion" | "price" | "availability";
export type FilterState = Record<FilterKey, string[]>;

export const filterGroups: { key: FilterKey; label: string; options: { value: string; label: string }[] }[] = [
  { key: "collection", label: "Collection", options: collectionOptions.map((c) => ({ value: c.slug, label: c.label })) },
  { key: "metal", label: "Metal", options: filterConfig.metal.map((m) => ({ value: m, label: m })) },
  { key: "stone", label: "Stone", options: filterConfig.stone.map((m) => ({ value: m, label: m })) },
  { key: "occasion", label: "Occasion", options: filterConfig.occasion.map((m) => ({ value: m, label: m })) },
  { key: "price", label: "Price", options: filterConfig.price.map((p) => ({ value: p.id, label: p.label })) },
  { key: "availability", label: "Availability", options: filterConfig.availability.map((a) => ({ value: a.id, label: a.label })) },
];

export const emptyFilters = (): FilterState => ({ collection: [], metal: [], stone: [], occasion: [], price: [], availability: [] });
const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function OptionRow({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick} className="flex min-h-11 w-full items-center gap-3 text-left text-sm transition-opacity hover:opacity-70">
      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center border transition-colors", checked ? "border-foreground bg-foreground text-background" : "border-foreground/30")}>
        {checked && <Check className="h-3 w-3" strokeWidth={2} />}
      </span>
      {label}
    </button>
  );
}

const trigger = "eyebrow inline-flex h-11 items-center gap-2 transition-opacity hover:opacity-70 data-[state=open]:opacity-100";

/** Desktop: inline toolbar of dropdown filters + sort. */
export function DesktopToolbar({ filters, onToggle, sort, onSort }: { filters: FilterState; onToggle: (k: FilterKey, v: string) => void; sort: SortId; onSort: (s: SortId) => void }) {
  return (
    <div className="hidden items-center justify-between gap-6 md:flex">
      <div className="flex flex-wrap items-center gap-x-8">
        <span className="eyebrow flex items-center gap-2 text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.25} />Filter</span>
        {filterGroups.map((g) => {
          const n = filters[g.key].length;
          return (
            <Popover key={g.key}>
              <PopoverTrigger className={trigger}>
                {g.label}{n > 0 && <span className="text-muted-foreground">({n})</span>}
                <ChevronDown className="h-3 w-3" strokeWidth={1.25} />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 rounded-none border-border bg-background p-4 shadow-none">
                {g.options.map((o) => <OptionRow key={o.value} label={o.label} checked={filters[g.key].includes(o.value)} onClick={() => onToggle(g.key, o.value)} />)}
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <SortMenu sort={sort} onSort={onSort} />
    </div>
  );
}

function SortMenu({ sort, onSort }: { sort: SortId; onSort: (s: SortId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={trigger}>
        <span className="text-muted-foreground">Sort by</span> {sortOptions.find((s) => s.id === sort)?.label}
        <ChevronDown className="h-3 w-3" strokeWidth={1.25} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 rounded-none border-border bg-background p-2 shadow-none">
        {sortOptions.map((s) => (
          <button key={s.id} type="button" onClick={() => { onSort(s.id); setOpen(false); }} className={cn("flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-secondary", s.id === sort && "font-medium")}>
            {s.label}{s.id === sort && <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Mobile: sticky FILTER / SORT bar opening bottom sheets. */
export function MobileToolbar({ filters, onApply, sort, onSort, count }: { filters: FilterState; onApply: (f: FilterState) => void; sort: SortId; onSort: (s: SortId) => void; count: number }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (filterOpen) setDraft(filters); }, [filterOpen, filters]);
  const active = Object.values(filters).flat().length;

  return (
    <div className="sticky top-16 z-30 -mx-5 grid grid-cols-2 border-y border-border bg-background/95 backdrop-blur-sm sm:-mx-8 md:hidden">
      <button type="button" onClick={() => setFilterOpen(true)} className="eyebrow flex h-12 items-center justify-center gap-2 border-r border-border">
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.25} /> Filter{active > 0 && ` (${active})`}
      </button>
      <button type="button" onClick={() => setSortOpen(true)} className="eyebrow flex h-12 items-center justify-center gap-2">Sort <ChevronDown className="h-3 w-3" strokeWidth={1.25} /></button>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" className="flex h-[88svh] flex-col gap-0 rounded-none border-border bg-background p-0">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
            <SheetTitle className="eyebrow font-medium">Filter</SheetTitle>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {filterGroups.map((g) => (
              <fieldset key={g.key} className="border-b border-border py-5 last:border-0">
                <legend className="eyebrow mb-2 text-muted-foreground">{g.label}</legend>
                <div className="grid grid-cols-2 gap-x-4">
                  {g.options.map((o) => <OptionRow key={o.value} label={o.label} checked={draft[g.key].includes(o.value)} onClick={() => setDraft({ ...draft, [g.key]: toggleIn(draft[g.key], o.value) })} />)}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border p-4">
            <button type="button" onClick={() => setDraft(emptyFilters())} className="eyebrow h-12 border border-foreground/30">Clear all</button>
            <button type="button" onClick={() => { onApply(draft); setFilterOpen(false); }} className="eyebrow h-12 bg-primary text-primary-foreground">Apply filters</button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sortOpen} onOpenChange={setSortOpen}>
        <SheetContent side="bottom" className="rounded-none border-border bg-background px-5 pb-8 pt-5">
          <SheetTitle className="eyebrow mb-4 font-medium">Sort by</SheetTitle>
          {sortOptions.map((s) => (
            <button key={s.id} type="button" onClick={() => { onSort(s.id); setSortOpen(false); }} className="flex min-h-12 w-full items-center justify-between border-b border-border text-left text-sm last:border-0">
              {s.label}{s.id === sort && <Check className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          ))}
        </SheetContent>
      </Sheet>
      <span className="sr-only" aria-live="polite">{count} pieces</span>
    </div>
  );
}

/** Icon that expands into a search field (desktop) / full-width field (mobile). */
export function CatalogSearch({ value, onChange, autoOpen }: { value: string; onChange: (q: string) => void; autoOpen?: boolean }) {
  const [open, setOpen] = useState(!!value || !!autoOpen);
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setText(value), [value]);
  useEffect(() => { if (open && autoOpen) ref.current?.focus(); }, [open, autoOpen]);
  useEffect(() => {
    const t = setTimeout(() => { if (text !== value) onChange(text); }, 250);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("flex items-center border-b transition-all duration-500 ease-lux", open ? "w-full border-foreground/40 md:w-80" : "w-11 border-transparent")}>
      <button type="button" aria-label={open ? "Search" : "Open search"} onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 50); }} className="flex h-11 w-11 shrink-0 items-center justify-center">
        <Search className="h-4 w-4" strokeWidth={1.25} />
      </button>
      {open && (
        <>
          <input
            ref={ref}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search by piece, stone, metal…"
            aria-label="Search jewellery"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" aria-label="Close search" onClick={() => { setText(""); onChange(""); setOpen(false); }} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={1.25} />
          </button>
        </>
      )}
    </div>
  );
}
