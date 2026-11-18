import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: token('violet'),
        cyan: token('cyan'),
        magenta: token('magenta'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        bg: { DEFAULT: token('bg'), elevated: token('bg-elevated') },
        surface: token('surface'),
        fg: { DEFAULT: token('fg'), muted: token('fg-muted'), subtle: token('fg-subtle') },
        line: token('border'),
        ring: token('ring'),
        paper: { DEFAULT: token('paper'), alt: token('paper-alt') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted') },
        chat: {
          head: token('chat-head'),
          bg: token('chat-bg'),
          out: token('chat-out'),
          in: token('chat-in'),
          text: token('chat-text'),
          meta: token('chat-meta'),
          link: token('chat-link'),
          line: token('chat-line'),
        },
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'glow-violet': 'var(--shadow-glow-violet)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
      },
      backgroundImage: {
        'grad-brand': 'var(--grad-brand)',
        'grad-primary': 'var(--grad-primary)',
      },
      transitionTimingFunction: { out: 'var(--ease-out)' },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(4%, -3%, 0) scale(1.08)' },
        },
        'pulse-live': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--c-success) / 0.55)' },
          '50%': { boxShadow: '0 0 0 6px rgb(var(--c-success) / 0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'aurora-drift': 'aurora-drift 22s ease-in-out infinite',
        'pulse-live': 'pulse-live 2.2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
