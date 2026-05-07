import { Link, useLocation } from "@tanstack/react-router";
import { Home, Pill, ShieldAlert, User, Users, type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const tabs: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/medications", label: "Meds", icon: Pill },
  { to: "/risk", label: "Risk", icon: ShieldAlert },
  { to: "/providers", label: "Care", icon: Users },
  { to: "/settings", label: "Account", icon: User },
];

export function MobileShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-background relative pb-28">
        {children}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-[480px] px-4 pb-4 pointer-events-auto">
            <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-elegant flex items-center justify-around px-2 py-2">
              {tabs.map((t) => {
                const active =
                  t.to === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-smooth flex-1",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-lg transition-smooth",
                        active && "bg-primary/10",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-medium">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
