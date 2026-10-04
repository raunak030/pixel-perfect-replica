import { Link } from "@tanstack/react-router";
import type { Contact } from "@/lib/contacts";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export function ContactRow({ c }: { c: Contact }) {
  return (
    <Link to="/contacts/$id" params={{ id: c.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
      <div className="size-9 shrink-0 rounded-full bg-accent text-accent-foreground grid place-items-center text-xs font-semibold">
        {initials(c.full_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{c.full_name || "Unnamed"}</div>
        <div className="text-xs text-muted-foreground truncate">{[c.designation, c.company_name].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="hidden sm:block text-xs text-muted-foreground text-right">
        <div>{c.city}</div>
        {c.event_source && <div className="truncate max-w-40">{c.event_source}</div>}
      </div>
      {c.category && <span className="hidden md:inline text-xs rounded bg-secondary px-2 py-0.5">{c.category}</span>}
      {c.needs_review && <span className="text-xs rounded bg-warning text-warning-foreground px-2 py-0.5">Review</span>}
    </Link>
  );
}
