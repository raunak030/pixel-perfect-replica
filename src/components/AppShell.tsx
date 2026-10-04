import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Home, Images, ScanLine, Settings, LogOut, CreditCard, Tags, Users } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Home", desktopLabel: "Dashboard", icon: Home },
  { to: "/contacts", label: "Contacts", desktopLabel: "Contacts", icon: Users },
  { to: "/scan", label: "Scan", desktopLabel: "Scan", icon: ScanLine },
  { to: "/settings", label: "Settings", desktopLabel: "Settings", icon: Settings },
] as const;

const MORE = [
  { to: "/bulk", label: "Bulk import", icon: Images },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/categories", label: "Categories", icon: Tags },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <CreditCard className="size-5 text-sidebar-primary" />
          <span className="font-display font-semibold text-sidebar-accent-foreground">CardVault</span>
        </div>
        <div className="p-3">
          <Button asChild variant="scan" className="w-full">
            <Link to="/scan"><ScanLine /> Scan Card</Link>
          </Button>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.filter((n) => n.to !== "/scan").map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="size-4" /> {n.desktopLabel}
            </Link>
          ))}
          <div className="px-3 pt-4 pb-1 text-xs uppercase tracking-wide text-sidebar-foreground/60">Manage</div>
          {MORE.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="m-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent">
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>

      <main className="flex-1 min-w-0 pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card grid grid-cols-4">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground"
            activeProps={{ className: "text-primary font-medium" }}
          >
            <n.icon className={n.to === "/scan" ? "size-6 text-primary" : "size-5"} />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
