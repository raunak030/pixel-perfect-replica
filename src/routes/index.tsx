import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CreditCard, ScanLine, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CardVault — Turn visiting cards into a searchable network" },
      { name: "description", content: "Scan visiting cards, review the details, and find any contact in seconds." },
      { property: "og:title", content: "CardVault — Visiting card manager" },
      { property: "og:description", content: "Scan visiting cards, review the details, and find any contact in seconds." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 h-16 border-b">
        <div className="flex items-center gap-2 font-display font-semibold">
          <CreditCard className="size-5 text-primary" /> CardVault
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="flex-1 mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
          Every visiting card you collect, searchable in seconds.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl">
          Photograph a card, check the details, save. Call, email or WhatsApp anyone straight from their profile.
        </p>
        <Button asChild size="lg" className="mt-8"><Link to="/auth"><ScanLine /> Start scanning</Link></Button>
        <ul className="mt-16 grid gap-6 sm:grid-cols-3 text-sm">
          <li><ScanLine className="size-5 text-primary mb-2" /><b className="block">Scan & review</b><span className="text-muted-foreground">Nothing is saved until you confirm it.</span></li>
          <li><Search className="size-5 text-primary mb-2" /><b className="block">Instant search</b><span className="text-muted-foreground">By name, company, city or event.</span></li>
          <li><ShieldCheck className="size-5 text-primary mb-2" /><b className="block">Private</b><span className="text-muted-foreground">Only you can see your contacts.</span></li>
        </ul>
      </main>
    </div>
  );
}
