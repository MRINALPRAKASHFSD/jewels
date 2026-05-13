import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { validateImage, MAX_IMAGE_MB, type EditorImage } from "@/lib/admin/cms";

type Props = {
  images: EditorImage[];
  onChange: (images: EditorImage[]) => void;
  onRemove: (img: EditorImage) => void;
  canUpload: boolean;
  /** Saved images can only be deleted by roles allowed to delete media. */
  canDeleteSaved: boolean;
};

export function ImageManager({ images, onChange, onRemove, canUpload, canDeleteSaved }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const add = async (files: FileList | File[] | null) => {
    if (!files) return;
    const next: EditorImage[] = [];
    for (const f of Array.from(files)) {
      const c = await validateImage(f);
      if (!c.ok) { toast.error(c.message); continue; }
      if (c.tip) toast.message(c.tip);
      next.push({ key: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f), alt: "" });
    }
    if (next.length) onChange([...images, ...next]);
    if (input.current) input.current.value = "";
  };

  const move = (from: number, to: number) => { if (to >= 0 && to < images.length) onChange(arrayMove(images, from, to)); };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(images.findIndex((i) => i.key === e.active.id), images.findIndex((i) => i.key === e.over!.id));
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={cn("flex flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 py-8 text-center transition-colors", drag ? "border-foreground bg-secondary" : "border-border")}>
          <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm">Drag images here, or <button type="button" onClick={() => input.current?.click()} className="font-medium underline underline-offset-2">choose files</button></p>
          <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · under {MAX_IMAGE_MB} MB · at least 600 px · WebP around 2000 px wide is ideal</p>
          <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => add(e.target.files)} aria-label="Upload product images" />
        </div>
      )}
      {images.length > 0 && <p className="text-xs text-muted-foreground">Drag to reorder. The first image is the primary image and appears first on the website.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <Tile key={img.key} img={img} index={i} count={images.length}
                removable={!img.id || canDeleteSaved}
                onAlt={(alt) => onChange(images.map((x) => (x.key === img.key ? { ...x, alt } : x)))}
                onPrimary={() => move(i, 0)} onMove={(d) => move(i, i + d)}
                onRemove={() => { onRemove(img); onChange(images.filter((x) => x.key !== img.key)); }} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!images.length && !canUpload && <p className="text-sm text-muted-foreground">No images yet.</p>}
    </div>
  );
}

function Tile({ img, index, count, removable, onAlt, onPrimary, onMove, onRemove }: {
  img: EditorImage; index: number; count: number; removable: boolean; onAlt: (v: string) => void; onPrimary: () => void; onMove: (d: number) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.key });
  const btn = "flex h-8 w-8 items-center justify-center rounded-sm bg-card/90 text-foreground hover:bg-card disabled:opacity-30";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("overflow-hidden rounded-sm border border-border bg-card", isDragging && "z-10 opacity-80 shadow-sm")}>
      <div className="relative aspect-square bg-secondary">
        {img.preview && <img src={img.preview} alt={img.alt} className="h-full w-full object-cover" />}
        <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className={cn(btn, "absolute left-1.5 top-1.5 cursor-grab touch-none")}><GripVertical className="h-4 w-4" /></button>
        {index === 0 && <span className="absolute right-1.5 top-1.5 rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">Primary</span>}
        {img.file && <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-card/90 px-1.5 py-0.5 text-[10px]">Not saved yet</span>}
        <div className="absolute bottom-1.5 right-1.5 flex gap-1">
          <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move earlier"><ArrowLeft className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move later"><ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="space-y-2 p-2">
        <input value={img.alt} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text (describe the image)" aria-label="Alt text" maxLength={200}
          className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-xs outline-none" />
        <div className="flex items-center justify-between">
          <button type="button" onClick={onPrimary} disabled={index === 0} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"><Star className="h-3 w-3" />Set primary</button>
          {removable && <button type="button" onClick={onRemove} aria-label="Remove image" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
    </li>
  );
}
