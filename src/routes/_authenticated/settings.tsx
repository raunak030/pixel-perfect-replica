import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { addCategory, DEFAULT_CATEGORIES, listCustomCategories, removeCategory } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — CardVault" }, { name: "description", content: "CardVault settings." }, { property: "og:title", content: "Settings — CardVault" }, { property: "og:description", content: "CardVault settings." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: custom = [] } = useQuery({ queryKey: ["customCategories"], queryFn: listCustomCategories });
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try { await addCategory(name); setName(""); refresh(); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not add category."); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="rounded-lg border bg-card p-5 space-y-2">
        <h2 className="font-semibold">Card reading</h2>
        <p className="text-sm text-muted-foreground">Practice mode is on: scans fill in sample details so you can test the full flow. A real card reader can be connected later.</p>
      </section>
      <section className="rounded-lg border bg-card p-5 space-y-2">
        <h2 className="font-semibold">Manage</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/bulk" className="text-primary hover:underline">Bulk import</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/companies" className="text-primary hover:underline">Companies</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/categories" className="text-primary hover:underline">Categories</Link>
        </div>
      </section>
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CATEGORIES.map((c) => <span key={c} className="text-xs rounded bg-secondary px-2 py-1">{c}</span>)}
          {custom.map((c) => (
            <span key={c.id} className="text-xs rounded bg-accent text-accent-foreground px-2 py-1 inline-flex items-center gap-1">
              {c.name}<button aria-label={`Remove ${c.name}`} onClick={async () => { await removeCategory(c.id); refresh(); }}><X className="size-3" /></button>
            </span>
          ))}
        </div>
        <form onSubmit={add} className="flex gap-2"><Input placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} /><Button type="submit">Add</Button></form>
      </section>
    </div>
  );
}
