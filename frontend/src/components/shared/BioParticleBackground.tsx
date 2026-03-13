import { motion } from 'framer-motion'

const PARTICLE_COUNT = 80

export const BioParticleBackground: React.FC = () => {
  const particles = Array.from({ length: PARTICLE_COUNT })

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_top,_#1a1f2a_0,_#050508_45%,_#000_100%)]">
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{
          backgroundImage:
            'radial-gradient(circle at 0% 0%, rgba(0,255,209,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(255,107,138,0.18), transparent 55%)',
          backgroundSize: '200% 200%',
        }}
      />

      {particles.map((_, index) => {
        const delay = Math.random() * 20
        const duration = 18 + Math.random() * 12
        const size = 2 + Math.random() * 3

        return (
          <motion.div
            key={index}
            className="absolute rounded-full bg-accent-teal mix-blend-screen"
            style={{
              width: size,
              height: size,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 18px rgba(0,255,209,0.6)',
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.8, 0], y: -40 }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

