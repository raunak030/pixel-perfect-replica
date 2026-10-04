import { Cpu, FlaskConical } from "lucide-react";

export type OcrMethod = "device" | "sample";

/** Scan method picker: real on-device reading vs clearly-marked sample data. */
export function OcrMethodToggle({
  value,
  onChange,
}: {
  value: OcrMethod;
  onChange: (m: OcrMethod) => void;
}) {
  const btn = (m: OcrMethod) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
      value === m
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;
  return (
    <div className="space-y-1">
      <div className="flex rounded-lg bg-muted p-1" role="radiogroup" aria-label="Scan method">
        <button
          className={btn("device")}
          role="radio"
          aria-checked={value === "device"}
          onClick={() => onChange("device")}
        >
          <Cpu className="size-3.5" /> On-device
        </button>
        <button
          className={btn("sample")}
          role="radio"
          aria-checked={value === "sample"}
          onClick={() => onChange("sample")}
        >
          <FlaskConical className="size-3.5" /> Sample data
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {value === "device"
          ? "Reads the actual card in your browser. Nothing is uploaded for recognition."
          : "Practice mode: fills sample details so you can test the flow without a real card."}
      </p>
    </div>
  );
}
