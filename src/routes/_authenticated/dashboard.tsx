import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScanLine, Search } from "lucide-react";
import { dashboardStats, listContacts } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactRow } from "@/components/ContactRow";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CardVault" }, { name: "description", content: "Your CardVault overview." }, { property: "og:title", content: "Dashboard — CardVault" }, { property: "og:description", content: "Your CardVault overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const stats = useQuery({ queryKey: ["stats"], queryFn: dashboardStats });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: listContacts });
  const recent = (contacts.data ?? []).slice(0, 6);
  const s = stats.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button asChild size="lg"><Link to="/scan"><ScanLine /> Scan Card</Link></Button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/contacts", search: { q } }); }} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-9 h-11 bg-card" placeholder="Search name, company, phone, city, event…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Total cards", s?.cards],
          ["Contacts", s?.contacts],
          ["Companies", s?.companies],
          ["Needs review", s?.review],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{n ?? "–"}</div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Recently added</h2>
          <Link to="/contacts" search={{ q: "" }} className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {contacts.isError ? (
          <p className="p-6 text-sm text-destructive">Couldn't load contacts. Check your connection and refresh.</p>
        ) : contacts.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y">{recent.map((c) => <ContactRow key={c.id} c={c} />)}</div>
        )}
      </section>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="p-10 text-center">
      <h3 className="font-semibold">No contacts yet</h3>
      <p className="text-sm text-muted-foreground mt-1">Scan your first visiting card to start building your network.</p>
      <Button asChild className="mt-4"><Link to="/scan"><ScanLine /> Scan Card</Link></Button>
    </div>
  );
}
