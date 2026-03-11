import { MotionConfig, motion } from "framer-motion";
import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/scan", label: "Scan" },
  { href: "/brain", label: "Brain" },
  { href: "/microbiome", label: "Gut" },
  { href: "/timeline", label: "Timeline" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function Shell({
  children,
  active,
}: {
  children: ReactNode;
  active: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen text-sm text-slate-100">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-lg shadow-emerald-500/25" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">
                    BioSense AI
                  </div>
                  <div className="text-sm font-semibold text-white/90">
                    Clinical-Style Bio-AI Dashboard
                  </div>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-2">
                {navItems.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <Link key={item.href} href={item.href} className="block">
                      <motion.div
                        whileHover={{ y: -1 }}
                        className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] border transition-colors ${
                          isActive
                            ? "text-emerald-200 border-emerald-400/40 bg-emerald-400/10 shadow-lg shadow-emerald-500/20"
                            : "text-white/55 border-white/10 bg-white/5 hover:text-cyan-200 hover:border-cyan-400/30"
                        }`}
                      >
                        {item.label}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2 text-[10px]">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/60 uppercase tracking-[0.22em]">
                    Systems Online
                  </span>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">
                  Prototype
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </MotionConfig>
  );
}

