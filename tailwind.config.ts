import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0B0C',
          800: '#141416',
          700: '#1C1C1F',
          600: '#2A2A2E',
          500: '#3A3A40',
        },
        gold: {
          50: '#FBF7EC',
          100: '#F3E9CF',
          200: '#E8D08A',
          300: '#D9BA6A',
          400: '#C9A24B',
          500: '#B58C36',
          600: '#96702A',
          700: '#7A5C1E',
        },
        ivory: '#F7F5F1',
        sand: '#EDE7DC',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient':
          'linear-gradient(135deg, #7A5C1E 0%, #C9A24B 38%, #E8D08A 55%, #C9A24B 72%, #96702A 100%)',
      },
      boxShadow: {
        lux: '0 24px 60px -20px rgba(0,0,0,0.45)',
        card: '0 2px 24px -8px rgba(11,11,12,0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'kenburns': {
          '0%': { transform: 'scale(1) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.09) translate3d(0,-1.2%,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both',
        kenburns: 'kenburns 14s ease-out both',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
