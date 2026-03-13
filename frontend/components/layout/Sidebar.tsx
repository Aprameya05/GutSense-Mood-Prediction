"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Moon,
  Calendar,
  TrendingUp,
  Target,
  ShieldAlert,
  User,
  Lock,
  Dna,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meal/log", label: "Log Meal", icon: UtensilsCrossed },
  { href: "/sleep/log", label: "Log Sleep", icon: Moon },
  { href: "/history", label: "History", icon: Calendar },
  { href: "/trends", label: "Trends", icon: TrendingUp, locked: false },
  { href: "/baselines", label: "Baselines", icon: Target, locked: false },
  { href: "/risk", label: "Risk Monitor", icon: ShieldAlert, locked: false },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col border-r border-[var(--border)] bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
        <Dna className="h-7 w-7 text-[var(--blue)]" strokeWidth={1.5} />
        <span className="font-instrument text-xl tracking-tight text-[var(--text)]">
          GutSense
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-blue-50 text-[var(--blue)] border-l-[3px] border-[var(--blue)]"
                      : "text-[var(--muted)] hover:bg-slate-50 hover:text-[var(--text)] border-l-[3px] border-transparent",
                    item.locked && "opacity-50"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <span className="font-jakarta">{item.label}</span>
                  {item.locked && (
                    <Lock className="ml-auto h-3.5 w-3.5 text-[var(--muted)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User pill */}
      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-[var(--blue)] text-xs font-bold font-ibm">
            BA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--text)]">Balaji</span>
            <span className="text-xs text-[var(--muted)] font-ibm">20y · Vegetarian</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
