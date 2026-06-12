import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useAuth } from "@clerk/react";
import { Package, LayoutDashboard, FileBarChart, Settings, LogOut, Tags, ArrowRightLeft, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/parts", label: "Spare Parts", short: "Parts", icon: Package },
  { href: "/categories", label: "Categories", short: "Category", icon: Tags },
  { href: "/stock-movements", label: "Material/Parts Used", short: "Material", icon: ArrowRightLeft },
  { href: "/expenses", label: "Expenses", short: "Expense", icon: CreditCard },
  { href: "/reports", label: "Reports", short: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

function useCompanySettings(userId: string | null | undefined) {
  const key = userId ? `ck_settings_${userId}` : null;
  const load = () => {
    if (!key) return { companyName: "CK GROUP", logoUrl: "" };
    try {
      const s = JSON.parse(localStorage.getItem(key) || "{}");
      return { companyName: s.companyName || "CK GROUP", logoUrl: s.logoUrl || "" };
    } catch { return { companyName: "CK GROUP", logoUrl: "" }; }
  };
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    setSettings(load());
    const onUpdate = () => setSettings(load());
    window.addEventListener("ck-settings-updated", onUpdate);
    return () => window.removeEventListener("ck-settings-updated", onUpdate);
  }, [userId]);

  return settings;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { userId } = useAuth();
  const { companyName, logoUrl } = useCompanySettings(userId);

  const Logo = () => (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt="Company logo" className="h-8 w-8 rounded object-contain bg-primary/10 p-0.5" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      <span className="text-xl font-bold tracking-tight truncate">{companyName.toUpperCase()}</span>
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6">
          <Logo />
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 border-b border-border flex items-center px-6 shrink-0 md:hidden justify-between">
          <Logo />
          <button onClick={() => signOut({ redirectUrl: "/" })} className="text-muted-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-y-none p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden grid grid-cols-7 h-16 shrink-0 border-t border-border bg-card">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="w-full truncate text-center leading-tight">{item.short}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
