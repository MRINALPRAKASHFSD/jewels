import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Hand server-loaded query data to the browser so pages don't refetch (or re-sign image URLs) on hydration.
    dehydrate: () => ({ queryClientState: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (data: { queryClientState: string }) => { hydrate(queryClient, JSON.parse(data.queryClientState)); },
  });

  return router;
};
