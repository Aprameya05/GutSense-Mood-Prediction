import { motion } from 'framer-motion'

interface Props {
  glycemicLoadLabel: string
  fiberGrams: number
}

export const DigestiveTract: React.FC<Props> = ({ glycemicLoadLabel, fiberGrams }) => {
  return (
    <svg
      viewBox="0 0 600 260"
      className="w-full h-64 md:h-72 lg:h-80"
    >
      <defs>
        <linearGradient id="tractGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00FFD1" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FF6B8A" />
        </linearGradient>
      </defs>

      <motion.path
        d="M40 80 C120 40 200 40 260 70 C310 95 320 135 280 150 C240 165 210 190 230 210 C260 240 340 235 380 210 C420 185 430 145 415 120 C395 85 360 70 320 75"
        fill="none"
        stroke="url(#tractGlow)"
        strokeWidth={4}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.3 }}
        animate={{ pathLength: 1, opacity: 1, strokeWidth: [3, 4.6, 3.4] }}
        transition={{
          duration: 6,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      <motion.circle
        r={6}
        fill="#FF6B8A"
        filter="url(#softGlow)"
        initial={{ cx: 40, cy: 80 }}
        animate={{
          cx: [40, 140, 260, 310, 280, 230, 320],
          cy: [80, 55, 70, 120, 150, 210, 75],
        }}
        transition={{
          duration: 8,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />

      <motion.text
        x={260}
        y={40}
        textAnchor="middle"
        className="fill-accent-gold text-[11px] font-mono uppercase tracking-[0.3em]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        Glycemic Load: {glycemicLoadLabel}
      </motion.text>

      <motion.text
        x={380}
        y={200}
        textAnchor="middle"
        className="fill-accent-teal text-[11px] font-mono uppercase tracking-[0.3em]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        Fiber absorbed: {fiberGrams.toFixed(1)}g
      </motion.text>
    </svg>
  )
}

