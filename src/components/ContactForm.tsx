import { useQuery } from "@tanstack/react-query";
import { CONTACT_FIELDS, listCategories, type ContactInput } from "@/lib/contacts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm({ value, onChange }: { value: ContactInput; onChange: (v: ContactInput) => void }) {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const set = (k: keyof ContactInput, v: string) => onChange({ ...value, [k]: v === "" && k === "date_met" ? null : v });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {CONTACT_FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
            <Label htmlFor={f.key}>{f.label}{f.key === "full_name" && <span className="text-destructive"> *</span>}</Label>
            <Input id={f.key} type={f.type ?? "text"} value={(value[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="border-t pt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" value={value.category ?? ""} onChange={(e) => set("category", e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">—</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="event_source">Event / source</Label>
          <Input id="event_source" placeholder="e.g. UPITS Expo" value={value.event_source ?? ""} onChange={(e) => set("event_source", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_met">Date met</Label>
          <Input id="date_met" type="date" value={value.date_met ?? ""} onChange={(e) => set("date_met", e.target.value)} />
        </div>
        <div className="sm:col-span-3 space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
