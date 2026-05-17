import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminState, Panel, adminBtnGhost } from "@/components/admin/AdminUI";
import { Confirm } from "@/components/admin/cms-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BUCKETS, deleteMedia, findReferences, listMedia, type Bucket } from "@/lib/admin/cms";
import { formatDate } from "@/lib/admin/data";
import { can } from "@/lib/admin/permissions";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/media")({
  head: () => ({ meta: [{ title: "Media — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="media"><MediaPage /></RequireAccess>,
});

type File = Awaited<ReturnType<typeof listMedia>>[number];
const TABS: (Bucket | "all")[] = ["all", ...BUCKETS];
const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function MediaPage() {
  const user = useAdminUser();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Bucket | "all">("all");
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "media", tab], queryFn: () => listMedia(tab) });
  const [preview, setPreview] = useState<File | null>(null);
  const [dims, setDims] = useState<Record<string, string>>({});
  const [del, setDel] = useState<{ file: File; refs: string[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canDelete = can(user.role, "media", "delete");

  const askDelete = async (file: File) => {
    setBusy(file.url);
    try { setDel({ file, refs: await findReferences(file) }); } catch { toast.error("Couldn't check where this image is used."); } finally { setBusy(null); }
  };
  const doDelete = async () => {
    if (!del) return;
    try { await deleteMedia(del.file); toast.success("Image deleted."); qc.invalidateQueries({ queryKey: ["admin", "media"] }); }
    catch (e) { toast.error((e as Error).message); }
  };
  const copy = async (f: File) => { await navigator.clipboard.writeText(f.url); toast.success("Reference copied."); };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Media library" description="Every image stored for the website. Upload images from the product, collection, lookbook and content editors." />
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap rounded-sm px-3 py-1.5 text-xs capitalize", tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>{t}</button>)}
      </div>
      <Panel title={`${data?.length ?? 0} files`}>
        {isError ? <AdminState icon="alert" title="Couldn't load media" body="Please refresh the page to try again." /> : isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading…</p> : !data?.length ? <p className="p-10 text-center text-sm text-muted-foreground">No files here yet.</p> : (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.map((f) => (
              <li key={f.url} className="overflow-hidden rounded-sm border border-border">
                <button onClick={() => setPreview(f)} className="block aspect-square w-full bg-secondary" aria-label={`Preview ${f.name}`}>
                  {f.preview && <img src={f.preview} alt="" loading="lazy" className="h-full w-full object-cover" onLoad={(e) => { const i = e.currentTarget; setDims((d) => (d[f.url] ? d : { ...d, [f.url]: `${i.naturalWidth}×${i.naturalHeight}` })); }} />}
                </button>
                <div className="space-y-1 p-2 text-xs">
                  <p className="truncate font-medium" title={f.path}>{f.name}</p>
                  <p className="text-muted-foreground">{f.bucket} · {(f.type.split("/")[1] ?? "").toUpperCase()} · {size(f.size)}</p>
                  <p className="text-muted-foreground">{dims[f.url] ?? "—"} · {f.created ? formatDate(f.created) : "—"}</p>
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => setPreview(f)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Preview" title="Preview"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => copy(f)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Copy reference" title="Copy reference"><Copy className="h-3.5 w-3.5" /></button>
                    {canDelete && <button onClick={() => askDelete(f)} disabled={busy === f.url} className="ml-auto p-1 text-muted-foreground hover:text-destructive" aria-label="Delete" title="Delete">{busy === f.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl font-sans">
          <DialogHeader><DialogTitle className="truncate font-sans text-base">{preview?.name}</DialogTitle></DialogHeader>
          {preview?.preview && <img src={preview.preview} alt="" className="max-h-[70vh] w-full object-contain" />}
          <button className={adminBtnGhost} onClick={() => preview && copy(preview)}><Copy className="h-3.5 w-3.5" />Copy reference</button>
        </DialogContent>
      </Dialog>

      <Confirm open={!!del} onOpenChange={(o) => !o && setDel(null)} destructive confirmLabel={del?.refs.length ? "Delete anyway" : "Delete"}
        title="Delete this image?"
        body={del?.refs.length ? (
          <div className="space-y-2"><p className="font-medium text-destructive">This image is currently being used{del.refs[0]!.startsWith("Product") ? " by a product" : ""}.</p>
            <ul className="list-disc pl-5">{del.refs.slice(0, 6).map((r) => <li key={r}>{r}</li>)}</ul><p>Deleting it will leave those places without an image. This can't be undone.</p></div>
        ) : "This permanently removes the file. This can't be undone."}
        onConfirm={doDelete} />
    </div>
  );
}
