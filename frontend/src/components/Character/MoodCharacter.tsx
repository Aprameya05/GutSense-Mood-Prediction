import { motion } from 'framer-motion'
import type { DemoData } from '../../data/demoData'

interface Props {
  mood: DemoData['mood']
}

export const MoodCharacter: React.FC<Props> = ({ mood }) => {
  const baseColor =
    mood.emoji === '😄'
      ? '#FFD700'
      : mood.emoji === '🙂'
        ? '#00FFD1'
        : mood.emoji === '😟' || mood.emoji === '😔'
          ? '#60A5FA'
          : '#F97316'

  const auraPulseSpeed = mood.emoji === '🤯' ? 0.9 : mood.emoji === '😴' ? 3.2 : 1.6

  return (
    <div className="relative h-64 md:h-72 flex items-center justify-center">
      <motion.div
        className="absolute h-44 w-44 rounded-full blur-3xl"
        style={{ backgroundColor: baseColor }}
        animate={{ opacity: [0.45, 0.9, 0.45], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: auraPulseSpeed, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="relative h-40 w-40 rounded-full border border-slate-700/80 bg-slate-950/90 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(15,23,42,0.9)]"
        animate={{
          y: mood.emoji === '😔' || mood.emoji === '😟' ? 4 : mood.emoji === '😴' ? 6 : -2,
        }}
        transition={{ duration: 1.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <motion.div
          className="text-5xl"
          animate={{
            scale: mood.emoji === '🤯' ? [1, 1.15, 1] : [1, 1.05, 1],
          }}
          transition={{ duration: mood.emoji === '🤯' ? 0.9 : 1.8, repeat: Infinity }}
        >
          {mood.emoji}
        </motion.div>
        <p className="mt-3 text-xs font-mono uppercase tracking-[0.25em] text-slate-300">
          Mood score {mood.rating}/10
        </p>
      </motion.div>
    </div>
  )
}

