import type { Config } from 'tailwindcss'

/**
 * DashStack-inspired tokens. Runtime theme: `src/app/globals.css` @theme.
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          light: '#4ADE80',
          lighter: '#DCFCE7',
          lightest: '#F0FDF4',
        },
        /** Marketing / warm CTA (kept separate from shadcn semantic `accent` focus wash). */
        'brand-accent': {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FEF3C7',
        },
        page: {
          bg: '#F3F4F8',
        },
        card: {
          DEFAULT: '#FFFFFF',
        },
        icon: {
          blue: { DEFAULT: '#0EA5E9', bg: '#E0F2FE' },
          amber: { DEFAULT: '#F59E0B', bg: '#FEF3C7' },
          green: { DEFAULT: '#22C55E', bg: '#DCFCE7' },
          red: { DEFAULT: '#EF4444', bg: '#FEE2E2' },
          purple: { DEFAULT: '#8B5CF6', bg: '#F3E8FF' },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        icon: '12px',
        badge: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        'card-md': '0 4px 14px rgba(0,0,0,0.06)',
      },
    },
  },
} satisfies Config
