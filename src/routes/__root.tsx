import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { EventCategory, EventName, trackEvent } from "@/lib/analytics";

export const Route = createRootRoute({
  component: () => {
    const router = useRouter();

    useEffect(() => {
      // Track initial page view
      trackEvent(EventName.PAGE_VIEW, {
        category: EventCategory.NAVIGATION,
        path: window.location.pathname,
      });

      // Track subsequent navigation events
      return router.history.subscribe(() => {
        trackEvent(EventName.PAGE_VIEW, {
          category: EventCategory.NAVIGATION,
          path: window.location.pathname,
        });
      });
    }, [router]);

    return (
      <>
        <Outlet />
        <TanStackRouterDevtools />
        <Toaster />
      </>
    );
  },
});
