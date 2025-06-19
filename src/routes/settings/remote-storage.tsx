import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/remote-storage")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/settings/remote-storage"!</div>;
}
