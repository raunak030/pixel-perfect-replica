import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { listCompanies } from "@/lib/contacts";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/companies")({
  head: () => ({
    meta: [
      { title: "Companies — CardVault" },
      { name: "description", content: "Companies in your network." },
      { property: "og:title", content: "Companies — CardVault" },
      { property: "og:description", content: "Companies in your network." },
    ],
  }),
  component: CompaniesPage,
});

function CompaniesPage() {
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ["companies"], queryFn: listCompanies });
  const [q, setQ] = useState("");
  const rows = data.filter(
    (c) => !q.trim() || c.company_name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <span className="text-sm text-muted-foreground tabular-nums">{data.length} companies</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9 h-11 bg-card"
          placeholder="Search companies…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="rounded-lg border bg-card">
        {isError ? (
          <p className="p-6 text-sm text-destructive">
            Couldn't load companies. Check your connection and refresh.
          </p>
        ) : isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto mb-2 size-6 text-muted-foreground" />
            <h3 className="font-semibold">No companies yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Companies appear here automatically when you save contacts.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  to="/contacts"
                  search={{ q: c.company_name }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60"
                >
                  <div className="size-9 shrink-0 rounded bg-accent text-accent-foreground grid place-items-center">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[c.city, c.website].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {c.contactCount} contact{c.contactCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
