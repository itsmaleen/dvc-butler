import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/git-config")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/settings/git-config"!</div>;
}
