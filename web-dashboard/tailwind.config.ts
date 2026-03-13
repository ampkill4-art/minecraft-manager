/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark base palette
        bg:       { DEFAULT: '#0a0a0f', 100: '#0f0f1a', 200: '#14141f', 300: '#1a1a2a' },
        surface:  { DEFAULT: '#1e1e2e', 100: '#252538', 200: '#2d2d44' },
        border:   { DEFAULT: '#2a2a3d', light: '#3a3a55' },
        // Brand accent (neon green — Minecraft-ish)
        accent:   { DEFAULT: '#00e676', dim: '#00b25c', glow: 'rgba(0,230,118,0.25)' },
        // Secondary accent (cyan for metrics)
        cyan:     { DEFAULT: '#00d4ff', dim: '#009dbd', glow: 'rgba(0,212,255,0.2)' },
        // Status colors
        online:   '#00e676',
        offline:  '#ff4569',
        warning:  '#ffb800',
        // Text
        text:     { DEFAULT: '#e2e8f0', muted: '#8892a4', dim: '#4a5568' },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0, 230, 118, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 230, 118, 0.03) 1px, transparent 1px)
        `,
        'glow-radial': 'radial-gradient(ellipse at 50% 0%, rgba(0,230,118,0.12) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'glass':   '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'accent':  '0 0 20px rgba(0,230,118,0.3), 0 0 60px rgba(0,230,118,0.1)',
        'cyan':    '0 0 20px rgba(0,212,255,0.3)',
        'card':    '0 2px 12px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 10px rgba(0,230,118,0.2)' },
          to:   { boxShadow: '0 0 30px rgba(0,230,118,0.5), 0 0 60px rgba(0,230,118,0.2)' },
        },
        slideIn: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
