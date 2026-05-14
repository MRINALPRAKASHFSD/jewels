import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { ease } from "@/components/site/primitives";
import { siteSettingsQuery } from "@/lib/catalog.queries";

export const Route = createFileRoute("/_site")({
  // Site settings (e.g. WhatsApp number) are shared by every public page; don't block render if they fail.
  loader: ({ context }) => context.queryClient.prefetchQuery(siteSettingsQuery()),
  component: SiteLayout,
});

function SiteLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:px-4 focus:py-2">Skip to content</a>
      <Navbar />
      <motion.main
        id="main"
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="flex-1"
      >
        <Outlet />
      </motion.main>
      <Footer />
    </div>
  );
}
