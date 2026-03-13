import { motion, useScroll, useTransform } from 'framer-motion'

export const DigestiveScrollOverlay: React.FC = () => {
  const { scrollYProgress } = useScroll()

  const bolusY = useTransform(scrollYProgress, [0, 1], [40, 520])
  const stomachGlow = useTransform(scrollYProgress, [0.1, 0.25], [0, 1])
  const smallIntestineGlow = useTransform(scrollYProgress, [0.3, 0.55], [0, 1])
  const colonGlow = useTransform(scrollYProgress, [0.6, 0.9], [0, 1])

  return (
    <div className="pointer-events-none fixed inset-0 -z-5 flex justify-center">
      <svg
        viewBox="0 0 260 560"
        className="h-full w-auto opacity-50"
      >
        <defs>
          <linearGradient id="digestivePath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00FFD1" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.22" />
            <stop offset="75%" stopColor="#FFD700" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF6B8A" stopOpacity="0.32" />
          </linearGradient>
        </defs>

        <motion.path
          d="M130 20
             C 90 60, 80 110, 110 150
             C 150 200, 140 240, 120 270
             C 100 300, 100 340, 140 380
             C 180 420, 170 460, 140 500"
          fill="none"
          stroke="url(#digestivePath)"
          strokeWidth={3.2}
          strokeLinecap="round"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.circle
          r={6}
          cx={130}
          style={{ cy: bolusY }}
          fill="#FF6B8A"
          stroke="#FFFFFF"
          strokeWidth={1}
        />

        <motion.circle
          r={28}
          cx={120}
          cy={150}
          fill="rgba(56,189,248,0.3)"
          style={{ opacity: stomachGlow }}
        />
        <motion.circle
          r={36}
          cx={135}
          cy={285}
          fill="rgba(34,197,94,0.28)"
          style={{ opacity: smallIntestineGlow }}
        />
        <motion.circle
          r={32}
          cx={140}
          cy={440}
          fill="rgba(244,63,94,0.28)"
          style={{ opacity: colonGlow }}
        />
      </svg>

      <div className="absolute inset-y-24 left-1/2 -translate-x-1/2 max-w-xs text-[11px] font-mono text-slate-300 space-y-6">
        <motion.div style={{ opacity: stomachGlow }}>
          <p className="uppercase tracking-[0.28em] text-accent-teal">Stomach</p>
          <p className="mt-1 text-[11px] text-slate-300">
            Acid and enzymes uncoil dosa starch and proteins, preparing them for absorption.
          </p>
        </motion.div>
        <motion.div style={{ opacity: smallIntestineGlow }}>
          <p className="uppercase tracking-[0.28em] text-accent-gold">Small Intestine</p>
          <p className="mt-1 text-[11px] text-slate-300">
            Carbs, fats and amino acids cross into blood while fiber slows glucose entry.
          </p>
        </motion.div>
        <motion.div style={{ opacity: colonGlow }}>
          <p className="uppercase tracking-[0.28em] text-accent-pink">Colon & Microbiome</p>
          <p className="mt-1 text-[11px] text-slate-300">
            Microbes ferment remaining fiber into short-chain fatty acids that fuel the gut lining.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

