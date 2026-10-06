/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        obsidian: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090a0f',
        },
        privacy: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        tactile: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)',
        panel: '0 0 0 1px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 16px -2px rgba(15, 23, 42, 0.04)',
        'panel-hover': '0 0 0 1px rgba(37, 99, 235, 0.28), 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 12px 24px -4px rgba(15, 23, 42, 0.08)',
        button: 'inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 1px 2px rgba(15, 23, 42, 0.1)',
      }
    },
  },
  plugins: [],
};
