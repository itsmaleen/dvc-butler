import { createFileRoute } from "@tanstack/react-router";
// import "dicom-microscopy-viewer";

export const Route = createFileRoute("/(dashboard)/dicom-viewer")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      path: search.path as string,
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { path } = Route.useSearch();

  if (!path) {
    return <div>No DICOM file selected</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DICOM Viewer</h1>
      <p className="text-muted-foreground">Viewing file: {path}</p>
    </div>
  );
}
