import { MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/scan", label: "Scan Meal" },
  { href: "/microbiome", label: "Microbiome" },
  { href: "/brain", label: "Brain" },
  { href: "/timeline", label: "Timeline" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ children, active }: { children: ReactNode; active: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex text-sm text-slate-100">
        <aside className="hidden md:flex w-60 flex-col border-r border-slate-800/70 bg-biosense-surface/90 backdrop-blur-xl">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-slate-800/70">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-biosense-accent to-biosense-blue shadow-lg" />
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                BioSense
              </div>
              <div className="text-sm font-semibold">NeuroGut Intelligence</div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = active === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer ${
                      isActive
                        ? "bg-biosense-accent-soft/70 text-biosense-accent"
                        : "text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-biosense-accent to-biosense-blue opacity-60" />
                    <span>{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>
          <div className="px-4 pb-4 text-[10px] text-slate-500">
            Prototype · Not a medical device.
          </div>
        </aside>
        <main className="flex-1 flex flex-col">
          <header className="flex items-center justify-between border-b border-slate-800/70 bg-gradient-to-r from-biosense-surface-soft/90 to-biosense-surface/80 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-col">
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Bio-AI Systems Lab
              </div>
              <div className="text-sm font-medium text-slate-100">
                Adaptive Gut–Brain State Simulation
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 rounded-full border border-emerald-500/50 px-2 py-1 text-emerald-300 bg-emerald-900/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                API: Online
              </div>
              <div className="hidden sm:flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-slate-400 bg-slate-900/40">
                <span className="h-1 w-1 rounded-full bg-biosense-blue" />
                Wearables: Placeholder
              </div>
            </div>
          </header>
          <div className="flex-1 px-3 py-4 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
    </MotionConfig>
  );
}

