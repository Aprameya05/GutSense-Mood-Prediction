import { motion } from 'framer-motion'
import './style.css'
import { BioParticleBackground } from './components/shared/BioParticleBackground'
import { DigestiveScrollOverlay } from './components/shared/DigestiveScrollOverlay'
import { PipelineProgress } from './components/PipelineProgress'
import { UploadPortal } from './components/Hero/UploadPortal'
import { Stage1FoodID } from './components/stages/Stage1FoodID'
import { DigestiveJourney } from './components/DigestiveJourney/DigestiveJourney'
import { Stage2Nutrition } from './components/stages/Stage2Nutrition'
import { Stage3GutProxy } from './components/stages/Stage3GutProxy'
import { Stage4Mood } from './components/stages/Stage4Mood'
import { Stage5Metabolic } from './components/stages/Stage5Metabolic'
import { Stage6Sleep } from './components/stages/Stage6Sleep'
import { Stage7Patterns } from './components/stages/Stage7Patterns'
import { Stage8Baseline } from './components/stages/Stage8Baseline'
import { Stage9Risk } from './components/stages/Stage9Risk'
import { Stage10Insights } from './components/stages/Stage10Insights'
import { usePipelineData } from './hooks/usePipelineData'

export const App: React.FC = () => {
  const { state, runDemo, isRunning, analyzeMeal } = usePipelineData()

  return (
    <div className="relative min-h-screen bg-background text-slate-100 overflow-hidden">
      <BioParticleBackground />
      <DigestiveScrollOverlay />
      <div className="relative z-10 flex">
        <PipelineProgress stages={state.stages} />
        <main className="flex-1 min-h-screen max-h-screen overflow-y-auto px-8 py-6 lg:px-16 space-y-24">
          <section id="hero">
            <UploadPortal onRunDemo={runDemo} onAnalyze={analyzeMeal} isRunning={isRunning} />
          </section>

          <motion.section
            id="stage-1"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[1].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Stage1FoodID data={state.foodIdentification} />
          </motion.section>

          <motion.section
            id="digestive-journey"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[2].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <DigestiveJourney data={state.digestiveJourney} />
          </motion.section>

          <motion.section
            id="stage-2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[2].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <Stage2Nutrition data={state.nutrition} />
          </motion.section>

          <motion.section
            id="stage-3"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[3].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Stage3GutProxy data={state.gutProxy} />
          </motion.section>

          <motion.section
            id="stage-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[4].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            <Stage4Mood data={state.mood} />
          </motion.section>

          <motion.section
            id="stage-5"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[5].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Stage5Metabolic data={state.metabolic} />
          </motion.section>

          <motion.section
            id="stage-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[6].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <Stage6Sleep data={state.sleep} />
          </motion.section>

          <motion.section
            id="stage-7"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[7].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Stage7Patterns data={state.patterns} />
          </motion.section>

          <motion.section
            id="stage-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[8].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <Stage8Baseline data={state.baseline} />
          </motion.section>

          <motion.section
            id="stage-9"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[9].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Stage9Risk data={state.risk} />
          </motion.section>

          <motion.section
            id="stage-10"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: state.stages[10].completed ? 1 : 0.4, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
          >
            <Stage10Insights data={state.insights} />
          </motion.section>
        </main>
      </div>
    </div>
  )
}

