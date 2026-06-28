/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          lighter: '#334155',
        },
        purple: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dark: '#6D28D9',
        },
        blue: {
          DEFAULT: '#2563EB',
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger:  '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-purple-blue': 'linear-gradient(135deg, #7C3AED, #2563EB)',
        'gradient-navy-purple': 'linear-gradient(135deg, #0F172A, #1E1B4B)',
        'gradient-card': 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(37,99,235,0.08))',
        'gradient-success': 'linear-gradient(135deg, #16A34A, #15803D)',
        'gradient-warning': 'linear-gradient(135deg, #D97706, #B45309)',
        'gradient-danger':  'linear-gradient(135deg, #DC2626, #B91C1C)',
      },
      borderRadius: {
        'card':   '12px',
        'button': '8px',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-left': 'slideLeft 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in':  'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideLeft: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover':  '0 8px 30px rgba(0,0,0,0.12)',
        'glow-purple': '0 0 20px rgba(124,58,237,0.35)',
        'glow-blue':   '0 0 20px rgba(37,99,235,0.3)',
        'glow-green':  '0 0 20px rgba(22,163,74,0.3)',
        'modal':       '0 20px 60px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
