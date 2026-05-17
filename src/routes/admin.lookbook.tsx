import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminState, Panel, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { Check, Confirm, Field, ImageField, inputCls } from "@/components/admin/cms-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listLookbook, reorderLookbook, saveLookbook, setLookbookStatus, type LookbookValues, type Status } from "@/lib/admin/cms";
import { can } from "@/lib/admin/permissions";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/lookbook")({
  head: () => ({ meta: [{ title: "Lookbook — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="lookbook"><LookbookPage /></RequireAccess>,
});

type Item = Awaited<ReturnType<typeof listLookbook>>[number];
const empty: LookbookValues = { title: "", description: "", image_url: "", is_featured: false, status: "draft" };

function LookbookPage() {
  const user = useAdminUser();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "lookbook-cms"], queryFn: listLookbook });
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { if (data) setItems(data); }, [data]);
  const [editing, setEditing] = useState<{ id: string | null; v: LookbookValues; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ item: Item; status: Status } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "lookbook-cms"] });

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(items, items.findIndex((i) => i.id === e.active.id), items.findIndex((i) => i.id === e.over!.id));
    setItems(next);
    try { await reorderLookbook(next.map((i) => i.id)); toast.success("Order saved."); } catch (err) { toast.error((err as Error).message); refresh(); }
  };
  const save = async (status: Status) => {
    if (!editing) return;
    if (!editing.v.image_url) { toast.error("Upload an image first."); return; }
    setSaving(true);
    try {
      await saveLookbook(editing.id, { ...editing.v, status }, items.length);
      toast.success(status === "published" ? "Lookbook item published." : "Lookbook item saved.");
      setEditing(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  const change = async (item: Item, status: Status) => {
    try { await setLookbookStatus(item.id, status); toast.success(status === "published" ? "Published." : status === "archived" ? "Archived." : "Unpublished."); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const canArchive = can(user.role, "lookbook", "delete");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Lookbook" description="Editorial images on the Lookbook page. Drag to set the order."
        actions={can(user.role, "lookbook", "create") && <button onClick={() => setEditing({ id: null, v: empty, preview: "" })} className={adminBtn}><Plus className="h-3.5 w-3.5" />Add lookbook item</button>} />
      <Panel title={`${items.length} items`}>
        {isError ? <AdminState icon="alert" title="Couldn't load the lookbook" body="Please refresh the page to try again." /> : isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading…</p> : !items.length ? <p className="p-10 text-center text-sm text-muted-foreground">No lookbook items yet.</p> : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-border">
                {items.map((it) => <Row key={it.id} item={it} canArchive={canArchive}
                  onEdit={() => setEditing({ id: it.id, v: { title: it.title ?? "", description: it.description ?? "", image_url: it.image_url, is_featured: it.is_featured, status: it.status as Status }, preview: it.preview ?? "" })}
                  onStatus={(s) => setPending({ item: it, status: s })} />)}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto font-sans">
          <DialogHeader><DialogTitle className="font-sans text-base">{editing?.id ? "Edit lookbook item" : "Add lookbook item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <ImageField bucket="lookbook" folder="uploads" value={editing.v.image_url} preview={editing.preview} canUpload={can(user.role, "media", "upload")}
                onChange={(url, p) => setEditing((e) => e && { ...e, v: { ...e.v, image_url: url }, preview: p })} />
              <Field label="Title">{(f) => <input id={f} className={inputCls} value={editing.v.title} maxLength={120} onChange={(e) => setEditing((x) => x && { ...x, v: { ...x.v, title: e.target.value } })} />}</Field>
              <Field label="Description">{(f) => <textarea id={f} rows={3} className={inputCls} value={editing.v.description} maxLength={1000} onChange={(e) => setEditing((x) => x && { ...x, v: { ...x.v, description: e.target.value } })} />}</Field>
              <Check label="Featured" checked={editing.v.is_featured} onChange={(b) => setEditing((x) => x && { ...x, v: { ...x.v, is_featured: b } })} />
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button className={adminBtnGhost} disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
                <button className={adminBtnGhost} disabled={saving} onClick={() => save(editing.v.status === "published" ? "draft" : editing.v.status)}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editing.v.status === "published" ? "Save as draft (unpublish)" : "Save Draft"}</button>
                <button className={adminBtn} disabled={saving} onClick={() => save("published")}>{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editing.v.status === "published" ? "Save" : "Publish"}</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Confirm open={!!pending} onOpenChange={(o) => !o && setPending(null)}
        title={pending?.status === "published" ? "Publish this item?" : pending?.status === "archived" ? "Archive this item?" : "Unpublish this item?"}
        body={pending?.status === "published" ? "It will appear on the Lookbook page." : "It will be hidden from the website."}
        confirmLabel={pending?.status === "published" ? "Publish" : pending?.status === "archived" ? "Archive" : "Unpublish"} destructive={pending?.status === "archived"}
        onConfirm={() => pending && change(pending.item, pending.status)} />
    </div>
  );
}

function Row({ item, canArchive, onEdit, onStatus }: { item: Item; canArchive: boolean; onEdit: () => void; onStatus: (s: Status) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 bg-card px-3 py-3 sm:px-5">
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
      {item.preview ? <img src={item.preview} alt="" className="h-14 w-12 shrink-0 object-cover" /> : <div className="h-14 w-12 shrink-0 bg-secondary" />}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title || "Untitled"}</p><div className="mt-1 flex items-center gap-2"><StatusBadge status={item.status} />{item.is_featured && <span className="text-xs text-muted-foreground">Featured</span>}</div></div>
      <div className="flex flex-wrap justify-end gap-1">
        <button className={adminBtnGhost} onClick={onEdit}>Edit</button>
        {item.status !== "published" && (item.status !== "archived" || canArchive) && <button className={adminBtnGhost} onClick={() => onStatus("published")}>Publish</button>}
        {item.status === "published" && <button className={adminBtnGhost} onClick={() => onStatus("draft")}>Unpublish</button>}
        {canArchive && item.status !== "archived" && <button className={adminBtnGhost} onClick={() => onStatus("archived")}>Archive</button>}
      </div>
    </li>
  );
}
