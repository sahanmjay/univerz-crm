/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#faf8f4', // Univerz CRM background (--paper)
          900: '#ffffff', // Pure white card surface (--surface)
          850: '#f8f6f0', // Inner card surface
          800: '#e7e1d6', // Border line (--line)
          750: '#ded7c9',
          700: '#d8d1c2', // Strong line (--line-strong)
          600: '#6f6a60', // Muted text (--muted)
          500: '#524e46',
          400: '#444b54', // Soft ink text (--ink-soft)
          300: '#2d333b',
          200: '#20262e', // Primary ink text (--ink)
          100: '#20262e', // Primary ink text (--ink)
          50: '#ffffff'
        },
        indigo: {
          50: '#e8f0ef',
          100: '#d1e3e1',
          200: '#a3c7c4',
          300: '#75aba6',
          400: '#478f89',
          500: '#1f5c5a', // Univerz Teal
          600: '#1f5c5a', // Univerz Teal
          700: '#174644', // Univerz Deep Teal
          800: '#113533',
          900: '#0b2322',
          950: '#e8f0ef',
        },
        brand: {
          50: '#e8f0ef',
          100: '#d1e3e1',
          200: '#a3c7c4',
          300: '#75aba6',
          400: '#478f89',
          500: '#1f5c5a',
          600: '#1f5c5a',
          700: '#174644',
          800: '#113533',
          900: '#0b2322',
          950: '#e8f0ef',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'tick-pop': 'tickPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out'
      },
      keyframes: {
        tickPop: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      }
    },
  },
  plugins: [],
}
