import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Images, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractCard } from "@/lib/ocr/ocr.functions";
import { recognizeCardOnDevice } from "@/lib/ocr/recognize";
import type { OcrResult } from "@/lib/ocr/types";
import { createContact, fileToBase64, uploadCardImage } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { OcrMethodToggle, type OcrMethod } from "@/components/OcrMethodToggle";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk import — CardVault" },
      { name: "description", content: "Import many visiting cards at once." },
      { property: "og:title", content: "Bulk import — CardVault" },
      { property: "og:description", content: "Import many visiting cards at once." },
    ],
  }),
  component: BulkPage,
});

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const CONCURRENCY = 3;
const MAX_FILES = 500;

type ItemStatus = "queued" | "processing" | "extracted" | "needs-review" | "failed";
interface Item {
  id: string;
  file: File;
  preview: string;
  status: ItemStatus;
  message?: string | undefined;
  contactId?: string | undefined;
}

function BulkPage() {
  const extract = useServerFn(extractCard);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [eventSource, setEventSource] = useState("");
  const [dateMet, setDateMet] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState<OcrMethod>("device");
  const stopRef = useRef(false);

  const done = items.filter(
    (i) => i.status === "extracted" || i.status === "needs-review" || i.status === "failed",
  ).length;

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!TYPES.includes(f.type)) {
        toast.error(`${f.name}: invalid image. Use JPG, PNG or WEBP.`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: larger than 10 MB.`);
        return false;
      }
      return true;
    });
    if (items.length + valid.length > MAX_FILES) {
      toast.error(`Bulk import supports up to ${MAX_FILES} cards at a time.`);
      return;
    }
    setItems((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: "queued" as ItemStatus,
      })),
    ]);
  }

  function setItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function processOne(item: Item) {
    setItem(item.id, { status: "processing" });
    try {
      // recognize.ts is isomorphic-safe; Tesseract itself loads in the browser only.
      const r: OcrResult =
        method === "device"
          ? await recognizeCardOnDevice(item.file)
          : await extract({
              data: { imageBase64: await fileToBase64(item.file), mimeType: item.file.type },
            });
      const needsReview = r.mock || r.confidence < 0.6 || !r.data.full_name;
      const path = await uploadCardImage(item.file);
      const contact = await createContact({
        ...r.data,
        category: category || null,
        event_source: eventSource || null,
        date_met: dateMet || null,
        card_image_url: path,
        needs_review: needsReview,
      });
      await supabase.from("scan_records").insert({
        contact_id: contact.id,
        original_image_url: path,
        ocr_raw_text: r.raw_text,
        extraction_status: r.mock
          ? "mock"
          : r.provider === "tesseract-device"
            ? "device"
            : "success",
        confidence_score: r.confidence,
      });
      setItem(item.id, {
        status: needsReview ? "needs-review" : "extracted",
        contactId: contact.id,
        message: r.mock
          ? "Sample data — review before use"
          : !r.raw_text
            ? "No text found — review manually"
            : undefined,
      });
    } catch (e) {
      setItem(item.id, {
        status: "failed",
        message: e instanceof Error ? e.message : "Extraction failed",
      });
      try {
        await supabase.from("scan_records").insert({
          original_image_url: null,
          ocr_raw_text: null,
          extraction_status: "failed",
          confidence_score: null,
        });
      } catch {
        /* scan log is best-effort */
      }
    }
  }

  async function start() {
    const pending = items.filter((i) => i.status === "queued" || i.status === "failed");
    if (pending.length === 0) {
      toast.info("Add card images first.");
      return;
    }
    setRunning(true);
    stopRef.current = false;
    await qc.invalidateQueries().catch(() => undefined);
    // Worker-pool over a shared queue so the UI stays responsive. On-device
    // OCR reuses one Tesseract worker, so it runs strictly one card at a time.
    const parallelism = method === "device" ? 1 : CONCURRENCY;
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(parallelism, queue.length) }, async () => {
      while (queue.length > 0 && !stopRef.current) {
        const next = queue.shift();
        if (next) await processOne(next);
      }
    });
    await Promise.all(workers);
    setRunning(false);
    await qc.invalidateQueries();
    toast.success("Bulk import finished. Review flagged contacts before relying on them.");
  }

  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Bulk import</h1>
        {items.length > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {done} / {items.length} cards processed
          </p>
        )}
      </div>

      {items.length > 0 && <Progress value={pct} />}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed bg-card p-6 text-center text-sm text-muted-foreground"
          >
            <Upload className="mx-auto mb-2 size-6" />
            Drop card images here or click to select
            <br />
            JPG, PNG, WEBP · up to {MAX_FILES}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={TYPES.join(",")}
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <OcrMethodToggle value={method} onChange={setMethod} />
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-event">Event / source (applied to all)</Label>
              <Input
                id="bulk-event"
                placeholder="e.g. UPITS Expo"
                value={eventSource}
                onChange={(e) => setEventSource(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-date">Date met</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  value={dateMet}
                  onChange={(e) => setDateMet(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-cat">Category</Label>
                <Input
                  id="bulk-cat"
                  placeholder="Optional"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={running || items.length === 0} onClick={start}>
              {running && <Loader2 className="animate-spin" />}{" "}
              {running ? "Processing…" : "Start import"}
            </Button>
            {!running && items.length > 0 && (
              <Button variant="outline" onClick={() => setItems([])}>
                Clear
              </Button>
            )}
            {running && (
              <Button
                variant="outline"
                onClick={() => {
                  stopRef.current = true;
                }}
              >
                Stop
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {method === "device"
              ? "On-device reading runs one card at a time through the shared OCR worker. Bulk saves are marked “needs review” when data is uncertain."
              : `Sample mode runs ${CONCURRENCY} at a time with practice data.`}{" "}
            Nothing is treated as final without your check.
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Images className="mx-auto mb-2 size-6" />
              No images yet. Add a batch of visiting-card photos to begin.
            </div>
          ) : (
            <ul className="divide-y max-h-[70vh] overflow-auto">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-3">
                  <img src={i.preview} alt="" className="size-12 rounded object-cover border" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.file.name}</div>
                    {i.message && (
                      <div className="truncate text-xs text-muted-foreground">{i.message}</div>
                    )}
                    {i.contactId && i.status !== "failed" && (
                      <Link
                        to="/contacts/$id"
                        params={{ id: i.contactId }}
                        className="text-xs text-primary hover:underline"
                      >
                        Review contact
                      </Link>
                    )}
                  </div>
                  <StatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, string> = {
    queued: "bg-secondary text-secondary-foreground",
    processing: "bg-accent text-accent-foreground",
    extracted: "bg-success/15 text-success",
    "needs-review": "bg-warning text-warning-foreground",
    failed: "bg-destructive/10 text-destructive",
  };
  const label: Record<ItemStatus, string> = {
    queued: "Queued",
    processing: "Processing",
    extracted: "Extracted",
    "needs-review": "Needs review",
    failed: "Failed",
  };
  return (
    <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}
