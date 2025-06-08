import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  Enums,
  init as coreInit,
  StackViewport,
} from "@cornerstonejs/core";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import {
  convertMultiframeImageIds,
  loadLocalDicomFile,
  prefetchMetadataInformation,
} from "../../utils/local-dicom-loader";

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
  const viewerRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path || !viewerRef.current) return;

    const element = viewerRef.current;
    element.style.width = "100%";
    element.style.height = "600px";

    async function initializeViewer() {
      try {
        setError(null);
        await coreInit();
        await dicomImageLoaderInit();

        const renderingEngineId = "myRenderingEngine";
        const renderingEngine = new RenderingEngine(renderingEngineId);
        renderingEngineRef.current = renderingEngine;

        const viewportId = "CT_AXIAL_STACK";

        const viewportInput = {
          viewportId,
          element,
          type: Enums.ViewportType.STACK,
        };

        renderingEngine.enableElement(viewportInput);

        const viewport = renderingEngine.getViewport(
          viewportId
        ) as StackViewport;

        // Load the local DICOM file
        const imageId = await loadLocalDicomFile(path);
        await prefetchMetadataInformation([imageId]);
        const stack = convertMultiframeImageIds([imageId]);

        await viewport.setStack(stack);
        viewport.render();
      } catch (error) {
        console.error("Error initializing DICOM viewer:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load DICOM file"
        );
      }
    }

    initializeViewer();

    // Cleanup function
    return () => {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
    };
  }, [path]);

  if (!path) {
    return <div>No DICOM file selected</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DICOM Viewer</h1>
      <p className="text-muted-foreground mb-4">Viewing file: {path}</p>
      {error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div ref={viewerRef} className="border rounded-lg overflow-hidden" />
      )}
    </div>
  );
}
