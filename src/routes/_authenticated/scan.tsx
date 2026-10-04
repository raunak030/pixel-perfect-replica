import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractCard } from "@/lib/ocr/ocr.functions";
import { recognizeCardOnDevice } from "@/lib/ocr/recognize";
import type { OcrResult } from "@/lib/ocr/types";
import {
  createContact,
  fileToBase64,
  findDuplicates,
  mergeInto,
  updateContact,
  uploadCardImage,
  type Contact,
  type ContactInput,
} from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CameraCapture } from "@/components/CameraCapture";
import { OcrMethodToggle, type OcrMethod } from "@/components/OcrMethodToggle";
import { ContactForm } from "@/components/ContactForm";
import { DuplicateDialog } from "@/components/DuplicateDialog";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan card — CardVault" },
      { name: "description", content: "Scan a visiting card." },
      { property: "og:title", content: "Scan card — CardVault" },
      { property: "og:description", content: "Scan a visiting card." },
    ],
  }),
  component: ScanPage,
});

const TYPES = ["image/jpeg", "image/png", "image/webp"];

function ScanPage() {
  const extract = useServerFn(extractCard);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<OcrMethod>("device");
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [form, setForm] = useState<ContactInput | null>(null);
  const [dupes, setDupes] = useState<Contact[]>([]);

  function pick(f?: File | null): void {
    if (!f) return;
    if (!TYPES.includes(f.type)) {
      toast.error("Invalid image. Please use JPG, PNG or WEBP.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image is larger than 10 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setOcr(null);
    setForm(null);
  }

  async function run(): Promise<void> {
    if (!file) return;
    setBusy(true);
    setOcrProgress(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (method === "device") {
        const r = await recognizeCardOnDevice(file, setOcrProgress);
        setOcr(r);
        if (!r.raw_text)
          toast.warning("Couldn't read any text from this image — fill in the details manually.");
        else if (!r.data.full_name || r.confidence < 0.6)
          toast.warning("Low-confidence read — please correct every field before saving.");
        setForm({ ...r.data, category: "", event_source: "", date_met: today });
      } else {
        const r = await extract({
          data: { imageBase64: await fileToBase64(file), mimeType: file.type },
        });
        setOcr(r);
        setForm({ ...r.data, category: "", event_source: "", date_met: today });
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? `Extraction failed: ${e.message}`
          : "Extraction failed. You can still enter details manually.",
      );
      setForm({ full_name: "", category: "", event_source: "", date_met: null });
    } finally {
      setBusy(false);
      setOcrProgress(null);
    }
  }

  async function persist(mergeTarget?: Contact) {
    if (!form || !file) return;
    setBusy(true);
    try {
      const path = await uploadCardImage(file);
      const contact = mergeTarget
        ? await updateContact(mergeTarget.id, {
            ...mergeInto(mergeTarget, form),
            card_image_url: mergeTarget.card_image_url ?? path,
          })
        : await createContact({ ...form, card_image_url: path, needs_review: false });
      await supabase.from("scan_records").insert({
        contact_id: contact.id,
        original_image_url: path,
        ocr_raw_text: ocr?.raw_text ?? null,
        extraction_status: ocr
          ? ocr.mock
            ? "mock"
            : ocr.provider === "tesseract-device"
              ? "device"
              : "success"
          : "failed",
        confidence_score: ocr?.confidence ?? null,
      });
      await qc.invalidateQueries();
      toast.success(mergeTarget ? "Merged into existing contact" : "Contact saved");
      navigate({ to: "/contacts/$id", params: { id: contact.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save. Check your connection.");
    } finally {
      setBusy(false);
      setDupes([]);
    }
  }

  async function save() {
    if (!form?.full_name?.trim()) return toast.error("Full name is required.");
    if (!form.mobile && !form.email) toast.warning("No phone or email — saving anyway.");
    setBusy(true);
    try {
      const d = await findDuplicates(form);
      setBusy(false);
      if (d.length) return setDupes(d);
      await persist();
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Duplicate check failed.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Scan card</h1>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed bg-card p-4 grid place-items-center min-h-56 text-center ${drag ? "border-primary bg-accent" : ""}`}
          >
            {preview ? (
              <img src={preview} alt="Card preview" className="max-h-64 rounded" />
            ) : (
              <div className="text-sm text-muted-foreground">
                <Upload className="mx-auto mb-2 size-6" />
                Drop a card image or click to upload
                <br />
                JPG, PNG, WEBP
              </div>
            )}
          </div>
          {/* sr-only (not display:none): programmatic clicks on display:none file inputs fail on iOS Safari */}
          <input
            ref={fileRef}
            type="file"
            accept={TYPES.join(",")}
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <OcrMethodToggle
            value={method}
            onChange={(m) => {
              setMethod(m);
              setOcr(null);
              setForm(null);
            }}
          />
          <div className="flex gap-2">
            <CameraCapture onCapture={pick} />
            <Button className="flex-1" disabled={!file || busy} onClick={run}>
              {busy && !form ? <Loader2 className="animate-spin" /> : null} Extract details
            </Button>
          </div>
          {ocrProgress != null && (
            <div className="space-y-1">
              <Progress value={ocrProgress * 100} />
              <p className="text-xs text-muted-foreground tabular-nums">
                Reading card… {Math.round(ocrProgress * 100)}%
              </p>
            </div>
          )}
          {ocr && !ocr.mock && (
            <p className="text-xs text-muted-foreground">
              Read on-device
              {ocr.confidence > 0 ? ` · confidence ${Math.round(ocr.confidence * 100)}%` : ""}.
              Check every field before saving.
            </p>
          )}
          {ocr?.mock && (
            <div className="flex gap-2 rounded-md bg-warning text-warning-foreground p-3 text-xs">
              <FlaskConical className="size-4 shrink-0" />
              <span>
                <b>Practice mode.</b> No card reader is connected, so these details are sample data
                — not read from your card. Edit them before saving.
              </span>
            </div>
          )}
        </div>
        <div>
          {form ? (
            <div className="rounded-lg border bg-card p-5 space-y-5">
              <div>
                <h2 className="font-semibold">Review details</h2>
                <p className="text-sm text-muted-foreground">
                  Check and correct every field before saving.
                </p>
              </div>
              <ContactForm value={form} onChange={setForm} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  Discard
                </Button>
                <Button disabled={busy} onClick={save}>
                  Save contact
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Upload a card and press <b>Extract details</b> to review the contact here.
            </div>
          )}
        </div>
      </div>
      <DuplicateDialog
        matches={dupes}
        busy={busy}
        onClose={() => setDupes([])}
        onSaveAnyway={() => persist()}
        onMerge={(c) => persist(c)}
      />
    </div>
  );
}
