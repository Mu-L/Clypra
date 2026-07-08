export interface ComparisonResult {
  match: boolean;
  mismatchPercentage: number;
  totalPixels: number;
  differentPixels: number;
}

/**
 * Pixel-by-pixel difference check between two ImageData buffers.
 */
export function pixelDiff(imgData1: ImageData, imgData2: ImageData, threshold = 15): ComparisonResult {
  if (imgData1.width !== imgData2.width || imgData1.height !== imgData2.height) {
    return {
      match: false,
      mismatchPercentage: 100,
      totalPixels: imgData1.width * imgData1.height,
      differentPixels: imgData1.width * imgData1.height,
    };
  }

  const d1 = imgData1.data;
  const d2 = imgData2.data;
  const total = imgData1.width * imgData1.height;
  let diffCount = 0;

  for (let i = 0; i < d1.length; i += 4) {
    const dr = Math.abs(d1[i] - d2[i]);
    const dg = Math.abs(d1[i + 1] - d2[i + 1]);
    const db = Math.abs(d1[i + 2] - d2[i + 2]);
    const da = Math.abs(d1[i + 3] - d2[i + 3]);

    if (dr > threshold || dg > threshold || db > threshold || da > threshold) {
      diffCount++;
    }
  }

  const mismatchPercentage = (diffCount / total) * 100;

  return {
    match: mismatchPercentage < 1.0, // Match if <1% diff
    mismatchPercentage,
    totalPixels: total,
    differentPixels: diffCount,
  };
}

/**
 * Compares Pixi WebGL output and Canvas2D output for DEV/QA validation.
 */
export async function validateLayerAgainstLegacy(
  legacyCanvas: HTMLCanvasElement,
  pixiCanvas: HTMLCanvasElement,
): Promise<ComparisonResult> {
  const w = legacyCanvas.width;
  const h = legacyCanvas.height;

  const legacyCtx = legacyCanvas.getContext("2d");
  const pixiCtx = pixiCanvas.getContext("webgl2") || pixiCanvas.getContext("webgl");

  if (!legacyCtx || !pixiCtx) {
    return {
      match: false,
      mismatchPercentage: 100,
      totalPixels: w * h,
      differentPixels: w * h,
    };
  }

  const legacyData = legacyCtx.getImageData(0, 0, w, h);

  // For WebGL, we draw to a temporary 2D canvas to extract pixels
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return {
      match: false,
      mismatchPercentage: 100,
      totalPixels: w * h,
      differentPixels: w * h,
    };
  }

  tempCtx.drawImage(pixiCanvas, 0, 0);
  const pixiData = tempCtx.getImageData(0, 0, w, h);

  return pixelDiff(legacyData, pixiData);
}
