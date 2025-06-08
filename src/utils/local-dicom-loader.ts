import { invoke } from "@tauri-apps/api/core";
import { metaData, StackViewport } from "@cornerstonejs/core";
import cornerstoneDICOMImageLoader from "@cornerstonejs/dicom-image-loader";
import uids from "./uids";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";

export async function loadLocalDicomFile(filePath: string): Promise<string> {
  try {
    // Read the file using Tauri's fs API
    const fileContent = await invoke<string>("get_file_binary", {
      path: filePath,
    });

    // Create a blob URL for the file
    const blob = new Blob([fileContent], { type: "application/dicom" });

    const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(blob);
    return imageId;
  } catch (error) {
    console.error("Error loading local DICOM file:", error);
    throw error;
  }
}

function getFrameInformation(imageId: string) {
  if (imageId.includes("wadors:")) {
    const frameIndex = imageId.indexOf("/frames/");
    const imageIdFrameless =
      frameIndex > 0 ? imageId.slice(0, frameIndex + 8) : imageId;
    return {
      frameIndex,
      imageIdFrameless,
    };
  } else {
    const frameIndex = imageId.indexOf("&frame=");
    let imageIdFrameless =
      frameIndex > 0 ? imageId.slice(0, frameIndex + 7) : imageId;
    if (!imageIdFrameless.includes("&frame=")) {
      imageIdFrameless = imageIdFrameless + "&frame=";
    }
    return {
      frameIndex,
      imageIdFrameless,
    };
  }
}

export function convertMultiframeImageIds(imageIds: string[]) {
  const newImageIds: string[] = [];
  imageIds.forEach((imageId) => {
    const { imageIdFrameless } = getFrameInformation(imageId);
    const instanceMetaData = metaData.get("multiframeModule", imageId);
    if (
      instanceMetaData &&
      instanceMetaData.NumberOfFrames &&
      instanceMetaData.NumberOfFrames > 1
    ) {
      const NumberOfFrames = instanceMetaData.NumberOfFrames;
      for (let i = 0; i < NumberOfFrames; i++) {
        const newImageId = imageIdFrameless + (i + 1);
        newImageIds.push(newImageId);
      }
    } else {
      newImageIds.push(imageId);
    }
  });
  return newImageIds;
}

export async function prefetchMetadataInformation(
  imageIdsToPrefetch: string[]
) {
  for (let i = 0; i < imageIdsToPrefetch.length; i++) {
    await cornerstoneDICOMImageLoader.wadouri.loadImage(imageIdsToPrefetch[i])
      .promise;
  }
}

export async function loadAndViewImage(
  imageId: string,
  viewport: StackViewport
) {
  await prefetchMetadataInformation([imageId]);
  const stack = convertMultiframeImageIds([imageId]);
  // Set the stack on the viewport
  viewport.setStack(stack).then(() => {
    // Set the VOI of the stack
    // viewport.setProperties({ voiRange: ctVoiRange });
    // Render the image
    viewport.render();

    const imageData = viewport.getImageData();

    const {
      pixelRepresentation,
      bitsAllocated,
      bitsStored,
      highBit,
      photometricInterpretation,
    } = metaData.get("imagePixelModule", imageId);

    const voiLutModule = metaData.get("voiLutModule", imageId);

    const sopCommonModule = metaData.get("sopCommonModule", imageId);
    const transferSyntax = metaData.get("transferSyntax", imageId);

    const transfersyntax = document.getElementById("transfersyntax");
    if (transfersyntax) {
      transfersyntax.innerHTML = transferSyntax.transferSyntaxUID;
    }
    const sopclassuid = document.getElementById("sopclassuid");
    if (sopclassuid) {
      sopclassuid.innerHTML = `${
        sopCommonModule.sopClassUID
      } [${uids[sopCommonModule.sopClassUID as keyof typeof uids]}]`;
      const sopInstanceUidElement = document.getElementById("sopinstanceuid");
      if (sopInstanceUidElement) {
        sopInstanceUidElement.innerHTML = sopCommonModule.sopInstanceUID;
      }
      const rowsElement = document.getElementById("rows");
      if (rowsElement) {
        rowsElement.innerHTML = imageData.dimensions[0].toString();
      }
      const columnsElement = document.getElementById("columns");
      if (columnsElement) {
        columnsElement.innerHTML = imageData.dimensions[1].toString();
      }
      const spacingElement = document.getElementById("spacing");
      if (spacingElement) {
        spacingElement.innerHTML = imageData.spacing.join("\\");
      }
      const directionElement = document.getElementById("direction");
      if (directionElement) {
        directionElement.innerHTML = imageData.direction
          .map((x) => Math.round(x * 100) / 100)
          .join(",");
      }

      const originElement = document.getElementById("origin");
      if (originElement) {
        originElement.innerHTML = imageData.origin
          .map((x) => Math.round(x * 100) / 100)
          .join(",");
      }

      const modalityElement = document.getElementById("modality");
      if (modalityElement) {
        modalityElement.innerHTML = imageData.metadata.Modality;
      }

      const pixelRepresentationElement = document.getElementById(
        "pixelrepresentation"
      );
      if (pixelRepresentationElement) {
        pixelRepresentationElement.innerHTML = pixelRepresentation;
      }
      const bitsAllocatedElement = document.getElementById("bitsallocated");
      if (bitsAllocatedElement) {
        bitsAllocatedElement.innerHTML = bitsAllocated;
      }
      const bitsStoredElement = document.getElementById("bitsstored");
      if (bitsStoredElement) {
        bitsStoredElement.innerHTML = bitsStored;
      }
      const highBitElement = document.getElementById("highbit");
      if (highBitElement) {
        highBitElement.innerHTML = highBit;
      }
      const photometricInterpretationElement = document.getElementById(
        "photometricinterpretation"
      );
      if (photometricInterpretationElement) {
        photometricInterpretationElement.innerHTML = photometricInterpretation;
      }
      const windowCenterElement = document.getElementById("windowcenter");
      if (windowCenterElement) {
        windowCenterElement.innerHTML = voiLutModule.windowCenter;
      }
      const windowWidthElement = document.getElementById("windowwidth");
      if (windowWidthElement) {
        windowWidthElement.innerHTML = voiLutModule.windowWidth;
      }
    }
  });
}

async function getFileContent(filePath: string) {
  // Read the file using Tauri's fs API
  const relativePath = await invoke<string>("get_relative_path", {
    absolutePath: filePath,
  });
  console.log("relativePath", relativePath);

  const fileContent = await readFile(relativePath, {
    baseDir: BaseDirectory.Home,
  });
  return fileContent;
}
