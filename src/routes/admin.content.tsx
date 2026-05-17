import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminState, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { Check, Confirm, Field, FormSection, ImageField, inputCls, useUnsavedGuard } from "@/components/admin/cms-ui";
import { HOME_SECTIONS } from "@/data/home";
import { discardContentDraft, getContentSections, publishContent, saveContentDraft, signRefs } from "@/lib/admin/cms";
import { formatDate } from "@/lib/admin/data";
import { can } from "@/lib/admin/permissions";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/content")({
  validateSearch: z.object({ section: z.string().optional() }),
  head: () => ({ meta: [{ title: "Homepage content — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="content"><ContentPage /></RequireAccess>,
});

function ContentPage() {
  const { section } = Route.useSearch();
  const navigate = Route.useNavigate();
  const key = HOME_SECTIONS.some((s) => s.key === section) ? section! : "hero";
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "content"], queryFn: getContentSections });
  const row = data?.find((r) => r.key === key);
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Homepage content" description="Edit the words, images and visibility of each homepage section. The layout stays fixed."
        actions={<a href="/admin/preview" target="_blank" rel="noreferrer" className={adminBtnGhost}><ExternalLink className="h-3.5 w-3.5" />Preview drafts</a>} />
      <div className="flex gap-1 overflow-x-auto">
        {HOME_SECTIONS.map((s) => {
          const hasDraft = !!data?.find((r) => r.key === s.key)?.draft;
          return (
            <button key={s.key} onClick={() => navigate({ search: { section: s.key } })}
              className={cn("whitespace-nowrap rounded-sm px-3 py-1.5 text-xs", key === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
              {s.label}{hasDraft && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-champagne align-middle" aria-label="has draft" />}
            </button>
          );
        })}
      </div>
      {isError ? <AdminState icon="alert" title="Couldn't load content" body="Please refresh the page to try again." /> : isLoading || !row ? <p className="text-sm text-muted-foreground">Loading…</p> : <SectionEditor key={key + (row.draft?.updatedAt ?? row.published.updatedAt)} row={row} />}
    </div>
  );
}

type Row = Awaited<ReturnType<typeof getContentSections>>[number];

function SectionEditor({ row }: { row: Row }) {
  const user = useAdminUser();
  const qc = useQueryClient();
  const def = HOME_SECTIONS.find((s) => s.key === row.key)!;
  const source = row.draft ?? row.published;
  const [content, setContent] = useState<Record<string, string>>(source.content);
  const [active, setActive] = useState(source.active);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"draft" | "publish" | "discard" | null>(null);
  const [confirm, setConfirm] = useState(false);
  useUnsavedGuard(dirty);
  useEffect(() => { signRefs([content["image"]]).then((s) => setPreviews({ image: s(content["image"]) ?? "" })); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => { setDirty(true); setContent((c) => ({ ...c, [k]: v })); };
  const run = async (kind: "draft" | "publish" | "discard") => {
    setBusy(kind);
    try {
      if (kind === "draft") await saveContentDraft(row.key, content, active);
      if (kind === "publish") await publishContent(row.key, content, active);
      if (kind === "discard") await discardContentDraft(row.key);
      setDirty(false);
      toast.success(kind === "draft" ? "Draft saved. The live site is unchanged." : kind === "publish" ? "Changes published." : "Draft discarded.");
      await qc.invalidateQueries({ queryKey: ["admin", "content"] });
      qc.invalidateQueries({ queryKey: ["home-content"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const canEdit = can(user.role, "content", "update");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {row.draft ? <><StatusBadge status="draft" /><span>Unpublished draft · saved {formatDate(row.draft.updatedAt)}</span></> : <><StatusBadge status="published" /><span>Showing the live version · updated {formatDate(row.published.updatedAt)}</span></>}
        {dirty && <span>· Unsaved changes</span>}
      </div>
      <FormSection title={def.label}>
        {def.hideable && <div className="sm:col-span-2"><Check label="Show this section on the homepage" checked={active} disabled={!canEdit} onChange={(b) => { setDirty(true); setActive(b); }} /></div>}
        {def.fields.map((f) => f.type === "image" ? (
          <div key={f.name} className="sm:col-span-2">
            <ImageField label={f.label} bucket="homepage" folder={`uploads/${row.key}`} value={content[f.name] ?? ""} preview={previews[f.name]} canUpload={can(user.role, "media", "upload")}
              onChange={(url, p) => { set(f.name, url); setPreviews((x) => ({ ...x, [f.name]: p })); }} />
            <p className="mt-1 text-xs text-muted-foreground">Leave empty to use the original photograph.</p>
          </div>
        ) : (
          <Field key={f.name} label={f.label} full={f.type === "textarea"}>
            {(id) => f.type === "textarea"
              ? <textarea id={id} rows={3} className={inputCls} disabled={!canEdit} value={content[f.name] ?? ""} maxLength={1200} onChange={(e) => set(f.name, e.target.value)} />
              : <input id={id} className={inputCls} disabled={!canEdit} value={content[f.name] ?? ""} maxLength={160} onChange={(e) => set(f.name, e.target.value)} />}
          </Field>
        ))}
      </FormSection>
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          {row.draft && <button className={adminBtnGhost} disabled={!!busy} onClick={() => run("discard")}>{busy === "discard" ? "Discarding…" : "Discard draft"}</button>}
          <button className={adminBtnGhost} disabled={!!busy} onClick={() => run("draft")}>{busy === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{busy === "draft" ? "Saving…" : "Save Draft"}</button>
          <button className={adminBtn} disabled={!!busy} onClick={() => setConfirm(true)}>{busy === "publish" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{busy === "publish" ? "Publishing…" : "Publish Changes"}</button>
        </div>
      )}
      <Confirm open={confirm} onOpenChange={setConfirm} title={`Publish ${def.label}?`} confirmLabel="Publish" body="These changes will appear on the live homepage straight away." onConfirm={() => run("publish")} />
    </div>
  );
}
