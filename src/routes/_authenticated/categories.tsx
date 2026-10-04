import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import {
  addCategory,
  DEFAULT_CATEGORIES,
  listContacts,
  listCustomCategories,
  removeCategory,
} from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categories — CardVault" },
      { name: "description", content: "Organise contacts with categories." },
      { property: "og:title", content: "Categories — CardVault" },
      { property: "og:description", content: "Organise contacts with categories." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: custom = [] } = useQuery({
    queryKey: ["customCategories"],
    queryFn: listCustomCategories,
  });
  const { data: contacts = [] } = useQuery({ queryKey: ["contacts"], queryFn: listContacts });
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contacts) if (c.category) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return m;
  }, [contacts]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addCategory(name);
      setName("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add category.");
    }
  }

  const all = [
    ...DEFAULT_CATEGORIES.map((n) => ({ name: n, custom: false, id: "" })),
    ...custom.map((c) => ({ name: c.name, custom: true, id: c.id })),
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <form onSubmit={add} className="flex gap-2">
        <Input
          placeholder="New category, e.g. Distributor"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>
      <div className="rounded-lg border bg-card divide-y">
        {all.map((c) => (
          <div key={c.custom ? c.id : c.name} className="flex items-center gap-3 px-4 py-3">
            <Tag className="size-4 text-muted-foreground" />
            <Link to="/contacts" search={{ q: c.name }} className="flex-1 min-w-0 hover:underline">
              <span className="font-medium">{c.name}</span>
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                {counts.get(c.name) ?? 0}
              </span>
            </Link>
            {c.custom && (
              <button
                aria-label={`Remove ${c.name}`}
                className="text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await removeCategory(c.id);
                  refresh();
                }}
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Default categories ship with CardVault. Your own categories are private to your account.
      </p>
    </div>
  );
}
