import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, HeartPulse, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareSync HIV — Smart Adherence & Treatment Support System" },
      {
        name: "description",
        content: "IoT medication monitoring, real-time adherence tracking, risk assessment, and care team support for people living with HIV.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen flex flex-col">
        <div className="bg-gradient-hero text-white px-6 pt-14 pb-16 rounded-b-[2rem]">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-white p-1.5 shadow-soft flex items-center justify-center">
              <Logo size={32} showText={false} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold text-lg">CareSync HIV</div>
              <div className="text-[11px] text-white/75">Smart Adherence &amp; Treatment Support</div>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold mt-10 leading-tight">
            Stay on treatment.
            <br />
            Stay in control.
          </h1>
          <p className="text-white/75 mt-3 text-sm leading-relaxed">
            Smart adherence and treatment support — medication monitoring, real-time
            tracking, and AI-powered risk assessment, all in one place.
          </p>
        </div>

        <div className="flex-1 px-6 pt-8 pb-10 space-y-4">
          <Feature
            icon={Smartphone}
            title="IoT Pillbox Monitoring"
            desc="Smart pillbox logs every dose automatically so you never guess whether you took it."
          />
          <Feature
            icon={HeartPulse}
            title="Adherence Tracking"
            desc="See today's schedule, 7- and 30-day adherence, and catch missed doses early."
          />
          <Feature
            icon={ShieldCheck}
            title="AI Risk Assessment"
            desc="Personalized risk score and guidance from your adherence patterns."
          />

          <div className="pt-6 space-y-3">
            <Button asChild className="w-full h-12 rounded-xl bg-gradient-care hover:opacity-90 shadow-glow font-semibold">
              <Link to="/login">Get started</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Your data is encrypted and private to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Activity; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex gap-3 shadow-soft">
      <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-display font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
