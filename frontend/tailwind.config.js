// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper:   'var(--c-paper)',
        paper2:  'var(--c-paper-2)',
        card:    'var(--c-card)',
        ink:     'var(--c-ink)',
        ink2:    'var(--c-ink-2)',
        ink3:    'var(--c-ink-3)',
        ink4:    'var(--c-ink-4)',
        signal:  'var(--c-signal)',
        cool:    'var(--c-data-cool)',
        warn:    'var(--c-warn)',
      },
      fontFamily: {
        display: ['"Newsreader Variable"', 'Newsreader', 'serif'],
        body:    ['"Söhne"', '"Geist Variable"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        meta:   ['11px',  { lineHeight: '14px', letterSpacing: '0.06em' }],
        label:  ['12px',  { lineHeight: '16px', letterSpacing: '0.10em' }],
        bodysm: ['13px',  { lineHeight: '20px' }],
        body:   ['15px',  { lineHeight: '24px' }],
        cardt:  ['18px',  { lineHeight: '24px', letterSpacing: '-0.005em' }],
        h2:     ['22px',  { lineHeight: '28px', letterSpacing: '-0.01em'  }],
        h1:     ['32px',  { lineHeight: '36px', letterSpacing: '-0.015em' }],
        disp:   ['56px',  { lineHeight: '60px', letterSpacing: '-0.02em'  }],
      },
      spacing: {
        hair: '1px', tight: '4px', snug: '8px', card: '16px',
        gutter: '24px', page: '48px', margin: '96px',
      },
      borderRadius: { DEFAULT: '2px', sm: '2px', md: '2px', lg: '2px' },
      borderWidth:  { hair: '1px' },
      transitionDuration: { fast: '80ms', base: '160ms' },
      transitionTimingFunction: { snap: 'cubic-bezier(.2,.8,.2,1)' },
      maxWidth: { prose: '66ch', plate: '1280px' },
    },
  },
  plugins: [],
};
