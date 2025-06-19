import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RenderingEngine,
  Enums,
  init as coreInit,
  StackViewport,
  imageLoader,
} from "@cornerstonejs/core";
import {
  cornerstoneNiftiImageLoader,
  init as niftiImageLoaderInit,
} from "@cornerstonejs/nifti-volume-loader";
import {
  convertMultiframeImageIds,
  loadLocalNiftiFile,
} from "../../utils/local-medical-image-loader";

export const Route = createFileRoute("/(dashboard)/nifti-viewer")({
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Cornerstone
  useEffect(() => {
    async function initializeCornerstone() {
      try {
        await coreInit();
        await niftiImageLoaderInit();
        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing Cornerstone:", error);
        setError(
          error instanceof Error ? error.message : "Failed to initialize viewer"
        );
      }
    }

    initializeCornerstone();

    return () => {
      if (renderingEngineRef.current) {
        renderingEngineRef.current.destroy();
        renderingEngineRef.current = null;
      }
    };
  }, []);

  // Handle NIFTI loading
  useEffect(() => {
    if (!path || !viewerRef.current || !isInitialized) return;

    const element = viewerRef.current;
    element.style.width = "100%";
    element.style.height = "600px";

    async function loadNifti() {
      try {
        setError(null);

        // Create new rendering engine if needed
        if (!renderingEngineRef.current) {
          const renderingEngineId = "myRenderingEngine";
          const renderingEngine = new RenderingEngine(renderingEngineId);
          renderingEngineRef.current = renderingEngine;
        }

        const viewportId = "CT_AXIAL_STACK";
        const viewportInput = {
          viewportId,
          element,
          type: Enums.ViewportType.STACK,
        };

        // Enable the viewport
        renderingEngineRef.current.enableElement(viewportInput);
        const viewport = renderingEngineRef.current.getViewport(
          viewportId
        ) as StackViewport;

        // Load and render the NIFTI
        const imageIds = await loadLocalNiftiFile(path);
        // await prefetchMetadataInformation(imageIds);
        const stack = convertMultiframeImageIds(imageIds);
        // register the image loader for nifti files
        // @ts-ignore
        imageLoader.registerImageLoader("nifti", cornerstoneNiftiImageLoader);

        await viewport.setStack(stack);
        viewport.resize();
        viewport.render();
      } catch (error) {
        console.error("Error loading NIFTI:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load NIFTI file"
        );
      }
    }

    loadNifti();
  }, [path, isInitialized]);

  if (!path) {
    return <div>No NIFTI file selected</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">NIFTI Viewer</h1>
      <p className="text-muted-foreground mb-4">Viewing file: {path}</p>
      {error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div ref={viewerRef} className="border rounded-lg overflow-hidden" />
      )}
    </div>
  );
}
