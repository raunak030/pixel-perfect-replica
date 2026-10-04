import { Link } from "@tanstack/react-router";
import type { Contact } from "@/lib/contacts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DuplicateDialog({
  matches, onClose, onSaveAnyway, onMerge, busy,
}: {
  matches: Contact[];
  onClose: () => void;
  onSaveAnyway: () => void;
  onMerge: (c: Contact) => void;
  busy: boolean;
}) {
  return (
    <Dialog open={matches.length > 0} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Possible duplicate found</DialogTitle>
          <DialogDescription>These contacts share a phone number, email, or name and company.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y border rounded-md">
          {matches.map((c) => (
            <li key={c.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{c.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{[c.company_name, c.mobile, c.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button asChild size="sm" variant="ghost"><Link to="/contacts/$id" params={{ id: c.id }}>View</Link></Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onMerge(c)}>Merge</Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={onSaveAnyway}>Save anyway</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
