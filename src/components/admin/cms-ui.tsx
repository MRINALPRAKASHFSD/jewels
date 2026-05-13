import { useBlocker } from "@tanstack/react-router";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { uploadImage, validateImage, type Bucket } from "@/lib/admin/cms";

export const inputCls = "w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 disabled:opacity-60";

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card">
      <div className="border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}</div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({ label, error, hint, full, children }: { label: string; error?: string | undefined; hint?: ReactNode; full?: boolean; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={cn("min-w-0 space-y-1.5", full && "sm:col-span-2")}>
      <label htmlFor={id} className="block text-xs font-medium">{label}</label>
      {children(id)}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-foreground" />
      {label}
    </label>
  );
}

/** Confirmation for visibility-changing or destructive actions. */
export function Confirm({ open, onOpenChange, title, body, confirmLabel, destructive, onConfirm }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; body: ReactNode; confirmLabel: string; destructive?: boolean; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="font-sans">
        <AlertDialogHeader><AlertDialogTitle className="font-sans text-base">{title}</AlertDialogTitle><AlertDialogDescription asChild><div>{body}</div></AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-sm">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn("rounded-sm", destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Warn before leaving with unsaved changes (in-app navigation and tab close). */
export function useUnsavedGuard(dirty: boolean) {
  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: () => dirty,
  });
}

/** Single image field: uploads straight to a bucket and returns the stored reference. */
export function ImageField({ bucket, folder, value, preview, onChange, canUpload, label = "Image" }: {
  bucket: Bucket; folder: string; value: string; preview?: string | undefined; onChange: (url: string, preview: string) => void; canUpload: boolean; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    const check = await validateImage(file);
    if (!check.ok) { toast.error(check.message); return; }
    setBusy(true);
    try {
      const up = await uploadImage(bucket, folder, file);
      onChange(up.url, URL.createObjectURL(file));
      toast.success(check.tip ? `Image uploaded. ${check.tip}` : "Image uploaded.");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-secondary">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpload && (
            <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50">
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}{busy ? "Uploading…" : value ? "Replace" : "Upload"}
            </button>
          )}
          {value && <button type="button" onClick={() => onChange("", "")} className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" />Remove</button>}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
