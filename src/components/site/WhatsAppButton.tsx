import { useQuery } from "@tanstack/react-query";
import { whatsappLink } from "@/data/content";
import { siteSettingsQuery } from "@/lib/catalog.queries";
import { cn } from "@/lib/utils";
import { luxButton, type LuxButtonProps } from "./primitives";

/** Reusable WhatsApp enquiry CTA. Number comes from site settings; pass `productName` for product context. */
export function WhatsAppButton({ productName, label = "Enquire on WhatsApp", variant = "secondary", className }: { productName?: string; label?: string; className?: string } & LuxButtonProps) {
  const { data } = useQuery(siteSettingsQuery());
  const href = whatsappLink(data?.whatsappNumber ?? "", productName);
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(luxButton({ variant }), className)}>
      {label}
    </a>
  );
}
