import { createIsomorphicFn } from "@tanstack/react-start";
import type { OcrResult } from "./types";

/**
 * On-device OCR entry point safe to import from route modules (which also
 * SSR). The Tesseract implementation lives in `./tesseract.client` and is
 * only ever loaded in the browser; the server branch throws if reached.
 */
export const recognizeCardOnDevice = createIsomorphicFn()
  .server((_image: File | Blob, _onProgress?: (fraction: number) => void): Promise<OcrResult> => {
    throw new Error("On-device OCR runs in the browser only.");
  })
  .client(
    async (image: File | Blob, onProgress?: (fraction: number) => void): Promise<OcrResult> => {
      const { recognizeCard } = await import("./tesseract.client");
      return recognizeCard(image, onProgress);
    },
  );
