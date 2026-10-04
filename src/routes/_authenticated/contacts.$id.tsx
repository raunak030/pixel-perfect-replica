import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, Mail, MessageCircle, Globe, Linkedin, MapPin, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { deleteContact, getContact, signedImageUrl, updateContact, type ContactInput } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { initials } from "@/components/ContactRow";

export const Route = createFileRoute("/_authenticated/contacts/$id")({
  head: () => ({ meta: [{ title: "Contact — CardVault" }, { name: "description", content: "Contact profile." }, { property: "og:title", content: "Contact — CardVault" }, { property: "og:description", content: "Contact profile." }] }),
  component: ContactPage,
});

const url = (u: string) => (/^https?:\/\//.test(u) ? u : `https://${u}`);
const tel = (s: string) => s.replace(/[^\d+]/g, "");

function ContactPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: c, isLoading, isError } = useQuery({ queryKey: ["contact", id], queryFn: () => getContact(id) });
  const { data: img } = useQuery({ queryKey: ["img", c?.card_image_url], queryFn: () => signedImageUrl(c!.card_image_url!), enabled: !!c?.card_image_url });
  const [edit, setEdit] = useState<ContactInput | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (isError || !c) return <p>Contact not found. <Link to="/contacts" search={{ q: "" }} className="text-primary">Back to contacts</Link></p>;

  async function save(): Promise<void> {
    if (!edit?.full_name?.trim()) { toast.error("Full name is required."); return; }
    setBusy(true);
    try { await updateContact(id, { ...edit, needs_review: false }); await qc.invalidateQueries(); setEdit(null); toast.success("Saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed."); } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Delete ${c!.full_name}?`)) return;
    try { await deleteContact(c!); await qc.invalidateQueries(); navigate({ to: "/contacts", search: { q: "" } }); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed."); }
  }

  if (edit) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit contact</h1>
      <div className="rounded-lg border bg-card p-5"><ContactForm value={edit} onChange={setEdit} /></div>
      <div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={busy} onClick={save}>Save</Button></div>
    </div>
  );

  const addr = [c.address, c.city, c.state, c.country, c.pincode].filter(Boolean).join(", ");
  const actions = [
    c.mobile && { icon: Phone, label: "Call", href: `tel:${tel(c.mobile)}` },
    (c.whatsapp || c.mobile) && { icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/${tel(c.whatsapp || c.mobile!).replace("+", "")}` },
    c.email && { icon: Mail, label: "Email", href: `mailto:${c.email}` },
    c.website && { icon: Globe, label: "Website", href: url(c.website) },
    c.linkedin && { icon: Linkedin, label: "LinkedIn", href: url(c.linkedin) },
    addr && { icon: MapPin, label: "Map", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string }[];

  const rows: [string, string | null][] = [
    ["Mobile", c.mobile], ["Alternate", c.alternate_mobile], ["WhatsApp", c.whatsapp], ["Email", c.email],
    ["Website", c.website], ["LinkedIn", c.linkedin], ["Address", addr], ["Category", c.category],
    ["Event / source", c.event_source], ["Date met", c.date_met], ["Added", new Date(c.created_at).toLocaleDateString()],
  ];

  return (
    <div className="space-y-6">
      <Link to="/contacts" search={{ q: "" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Contacts</Link>
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-14 rounded-full bg-accent text-accent-foreground grid place-items-center font-semibold">{initials(c.full_name)}</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">{c.full_name}</h1>
          <p className="text-muted-foreground">{[c.designation, c.company_name].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { const { id: _i, user_id: _u, created_at: _c, updated_at: _up, ...rest } = c; setEdit(rest); }}><Pencil /> Edit</Button>
          <Button variant="outline" size="sm" onClick={remove}><Trash2 /> Delete</Button>
        </div>
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => <Button key={a.label} asChild variant="secondary" size="sm"><a href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"><a.icon /> {a.label}</a></Button>)}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <dl className="rounded-lg border bg-card divide-y">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-2.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>
          ))}
          {c.notes && <div className="px-4 py-3 text-sm"><dt className="text-muted-foreground mb-1">Notes</dt><dd className="whitespace-pre-wrap">{c.notes}</dd></div>}
        </dl>
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground mb-2">Original card</div>
          {img ? <img src={img} alt="Visiting card" className="w-full rounded" /> : <p className="text-sm text-muted-foreground">No image</p>}
        </div>
      </div>
    </div>
  );
}
