import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import type { AnalyzePayload } from '../../hooks/usePipelineData'

interface Props {
  onRunDemo: () => void
  onAnalyze: (payload: AnalyzePayload) => void
  isRunning: boolean
}

const NeuralCluster: React.FC = () => {
  const group = useRef<any>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (group.current) {
      group.current.rotation.y = t * 0.25
      group.current.rotation.x = Math.sin(t * 0.3) * 0.18
    }
  })

  const nodes = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2
    const radius = 0.9 + (i % 3) * 0.15
    const y = ((i % 6) - 3) * 0.18
    return {
      x: Math.cos(angle) * radius,
      y,
      z: Math.sin(angle) * radius,
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.9, 42, 42]} />
        <meshBasicMaterial
          color="#00FFD1"
          transparent
          opacity={0.26}
          wireframe
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#FF6B8A" transparent opacity={0.9} />
      </mesh>

      {nodes.map((pos, idx) => (
        <mesh key={idx} position={[pos.x, pos.y, pos.z]}>
          <sphereGeometry args={[0.07, 20, 20]} />
          <meshBasicMaterial color="#FFD700" />
        </mesh>
      ))}

      <pointLight position={[0.5, 1.2, 1.6]} color="#FF6B8A" intensity={3} />
      <pointLight position={[-1.2, -1.0, 1.2]} color="#00FFD1" intensity={2.5} />
      <pointLight position={[1.4, 0.2, -1.4]} color="#38BDF8" intensity={1.4} />
    </group>
  )
}

export const UploadPortal: React.FC<Props> = ({ onRunDemo, onAnalyze, isRunning }) => {
  const [file, setFile] = useState<File | null>(null)
  const [userId, setUserId] = useState('balaji_001')
  const [moodEmoji, setMoodEmoji] = useState<'😄' | '🙂' | '😐' | '😟' | '😔' | '😴' | '🤯'>('🙂')
  const [moodRating, setMoodRating] = useState(7)
  return (
    <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
      <div className="relative h-[420px] rounded-3xl border border-slate-800/80 bg-slate-950/60 shadow-glow-teal overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(0,255,209,0.18),transparent_55%),radial-gradient(circle_at_10%_80%,rgba(255,107,138,0.22),transparent_55%)] opacity-70" />
        <Canvas
          camera={{ position: [0, 0, 5.5], fov: 40 }}
          className="relative z-10"
        >
          <ambientLight intensity={0.3} />
          <NeuralCluster />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} />
        </Canvas>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-6">
          <div className="flex gap-6 text-[11px] font-mono uppercase tracking-[0.3em] text-slate-300">
            <span>Stomach</span>
            <span>Small Intestine</span>
            <span>Liver</span>
            <span>Brain</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-accent-teal">
            GutSense • Living Body Intelligence
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-display text-slate-50 leading-tight">
            Drop your meal.
            <br />
            <span className="text-accent-teal">Know your body.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm md:text-base text-slate-300 font-serif">
            A cinematic 10-stage AI pipeline that follows your dosa from plate to
            microbiome, mood, metabolism, and neurological risk.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-mono text-slate-300">
            User ID
            <input
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </label>

          <label className="block text-xs font-mono text-slate-300">
            Meal image
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full text-xs text-slate-400"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
          <span>Mood</span>
          {['😄', '🙂', '😐', '😟', '😔', '😴', '🤯'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setMoodEmoji(emoji as any)}
              className={`h-7 w-7 rounded-full border text-base ${
                moodEmoji === emoji ? 'border-accent-teal bg-slate-900' : 'border-slate-700'
              }`}
            >
              {emoji}
            </button>
          ))}
          <span className="ml-2">Rating</span>
          <input
            type="number"
            min={1}
            max={10}
            value={moodRating}
            onChange={(e) => setMoodRating(Number(e.target.value) || 5)}
            className="w-12 rounded-md border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-100"
          />
        </div>

        <motion.button
          type="button"
          onClick={() => {
            if (!file) return
            onAnalyze({ file, userId, moodEmoji, moodRating })
          }}
          disabled={isRunning || !file}
          whileHover={{ scale: isRunning ? 1 : 1.03 }}
          whileTap={{ scale: isRunning ? 1 : 0.98 }}
          className="relative inline-flex items-center gap-3 rounded-full border border-accent-teal/80 bg-slate-950/80 px-5 py-2.5 text-sm font-mono uppercase tracking-[0.28em] text-accent-teal shadow-glow-teal disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent-teal/15">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-accent-teal/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Play className="relative h-3.5 w-3.5" />
          </span>
          {isRunning ? 'Analyzing meal…' : 'Analyze this meal'}
        </motion.button>

        <button
          type="button"
          onClick={onRunDemo}
          disabled={isRunning}
          className="text-[11px] font-mono uppercase tracking-[0.24em] text-slate-400 underline decoration-dotted disabled:opacity-50"
        >
          Or run cinematic dosa demo
        </button>

        <p className="text-[11px] text-slate-500 font-mono">
          No real data sent in demo mode. Live Groq-powered analysis plugs into your Python
          backend later.
        </p>
      </div>
    </div>
  )
}

