import { createWorker, type Worker } from "tesseract.js";
import { parseCardText } from "./parse";
import type { OcrResult } from "./types";

let workerPromise: Promise<Worker> | null = null;
let progressCb: ((fraction: number) => void) | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    // Dynamic assets (WASM core, English traineddata ~4 MB) load from CDN
    // on first use; the app already requires connectivity for Supabase.
    workerPromise = createWorker("eng", undefined, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") progressCb?.(m.progress);
      },
    }).catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

/**
 * On-device OCR via Tesseract (WASM, English). Runs entirely in the browser:
 * no image leaves the device for text recognition and no API key is needed.
 * A singleton worker is reused so bulk imports don't pay startup per card.
 */
export async function recognizeCard(
  image: File | Blob | string,
  onProgress?: (fraction: number) => void,
): Promise<OcrResult> {
  progressCb = onProgress ?? null;
  try {
    const worker = await getWorker();
    const {
      data: { text, confidence },
    } = await worker.recognize(image);
    const conf = Math.max(0, Math.min(1, (confidence ?? 0) / 100));
    const raw = (text ?? "").trim();
    return {
      provider: "tesseract-device",
      mock: false,
      raw_text: raw,
      confidence: raw ? conf : 0,
      data: parseCardText(raw),
    };
  } finally {
    progressCb = null;
  }
}
