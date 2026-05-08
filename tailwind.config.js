/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg:        '#0A0E1A',
          card:      '#111827',
          border:    '#1F2937',
          gold:      '#F59E0B',
          'gold-light': '#FCD34D',
          camden:    '#3B82F6',
          'camden-dark': '#1D4ED8',
          ethan:     '#10B981',
          'ethan-dark':  '#065F46',
          master:    '#8B5CF6',
          'master-dark': '#6D28D9',
          danger:    '#EF4444',
          success:   '#10B981',
          pending:   '#F97316',
          muted:     '#6B7280',
          text:      '#F9FAFB',
          'text-dim': '#9CA3AF',
        },
      },
      fontFamily: {
        game: ['Bangers', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold':   '0 0 24px rgba(245,158,11,0.5)',
        'glow-blue':   '0 0 24px rgba(59,130,246,0.5)',
        'glow-green':  '0 0 24px rgba(16,185,129,0.5)',
        'glow-purple': '0 0 24px rgba(139,92,246,0.5)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'pop': 'pop 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        'pulse-gold': {
          '0%,100%': { boxShadow: '0 0 16px rgba(245,158,11,0.3)' },
          '50%':     { boxShadow: '0 0 32px rgba(245,158,11,0.7)' },
        },
        pop: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
