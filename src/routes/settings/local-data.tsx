import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/local-data')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/settings/local-data"!</div>
}
