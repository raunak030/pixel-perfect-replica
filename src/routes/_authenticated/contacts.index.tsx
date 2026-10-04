import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { listContacts, type Contact } from "@/lib/contacts";
import { contactsToCsv, contactsToExcel, contactsToVCard, downloadFile } from "@/lib/export";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContactRow } from "@/components/ContactRow";
import { EmptyState } from "./dashboard";

export const Route = createFileRoute("/_authenticated/contacts/")({
  validateSearch: z.object({ q: z.string().optional().default("") }),
  head: () => ({ meta: [{ title: "Contacts — CardVault" }, { name: "description", content: "Search and filter your contacts." }, { property: "og:title", content: "Contacts — CardVault" }, { property: "og:description", content: "Search and filter your contacts." }] }),
  component: ContactsPage,
});

const SEARCH_KEYS: (keyof Contact)[] = ["full_name", "company_name", "mobile", "alternate_mobile", "email", "city", "designation", "category", "event_source", "notes"];
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();

function ContactsPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const [f, setF] = useState({ category: "", company: "", city: "", event: "", addedFrom: "", metFrom: "" });
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["contacts"], queryFn: listContacts });

  const opts = useMemo(() => ({
    category: uniq(data.map((c) => c.category)), company: uniq(data.map((c) => c.company_name)),
    city: uniq(data.map((c) => c.city)), event: uniq(data.map((c) => c.event_source)),
  }), [data]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.filter((c) =>
      (!t || SEARCH_KEYS.some((k) => String(c[k] ?? "").toLowerCase().includes(t))) &&
      (!f.category || c.category === f.category) && (!f.company || c.company_name === f.company) &&
      (!f.city || c.city === f.city) && (!f.event || c.event_source === f.event) &&
      (!f.addedFrom || c.created_at >= f.addedFrom) && (!f.metFrom || (c.date_met ?? "") >= f.metFrom));
  }, [data, q, f]);

  const sel = (k: "category" | "company" | "city" | "event", label: string) => (
    <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
      <option value="">{label}: all</option>
      {opts[k].map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={rows.length === 0}><Download /> Export ({rows.length})</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { try { downloadFile(`cardvault-contacts-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv", contactsToCsv(rows)); } catch { toast.error("Export failed."); } }}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { try { downloadFile(`cardvault-contacts-${new Date().toISOString().slice(0, 10)}.xls`, "application/vnd.ms-excel", contactsToExcel(rows)); } catch { toast.error("Export failed."); } }}>
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { try { downloadFile(`cardvault-contacts-${new Date().toISOString().slice(0, 10)}.vcf`, "text/vcard", contactsToVCard(rows)); } catch { toast.error("Export failed."); } }}>
              Export as vCard (.vcf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input autoFocus className="pl-9 h-11 bg-card" placeholder="Search name, company, phone, email, city, event, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2 text-sm items-center">
        {sel("category", "Category")}{sel("company", "Company")}{sel("city", "City")}{sel("event", "Event")}
        <label className="flex items-center gap-1 text-muted-foreground">Added since <Input type="date" className="h-9 w-auto bg-card" value={f.addedFrom} onChange={(e) => setF({ ...f, addedFrom: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-muted-foreground">Met since <Input type="date" className="h-9 w-auto bg-card" value={f.metFrom} onChange={(e) => setF({ ...f, metFrom: e.target.value })} /></label>
      </div>
      <div className="rounded-lg border bg-card">
        {isError ? <p className="p-6 text-sm text-destructive">Couldn't load contacts. Check your connection and refresh.</p>
          : isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          : data.length === 0 ? <EmptyState />
          : rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No contacts match your search.</p>
          : <><div className="px-4 py-2 text-xs text-muted-foreground border-b">{rows.length} of {data.length}</div><div className="divide-y">{rows.map((c) => <ContactRow key={c.id} c={c} />)}</div></>}
      </div>
    </div>
  );
}
