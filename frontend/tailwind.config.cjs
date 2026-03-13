/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050508',
        'accent-teal': '#00FFD1',
        'accent-gold': '#FFD700',
        'accent-pink': '#FF6B8A',
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glow-teal': '0 0 40px rgba(0, 255, 209, 0.35)',
        'glow-pink': '0 0 40px rgba(255, 107, 138, 0.35)',
      },
      animation: {
        'slow-pulse': 'slow-pulse 4s ease-in-out infinite',
        'aurora-flow': 'aurora-flow 20s ease-in-out infinite',
      },
      keyframes: {
        'slow-pulse': {
          '0%, 100%': { opacity: 0.7, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.03)' },
        },
        'aurora-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}

