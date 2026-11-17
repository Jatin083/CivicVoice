/** @type {import('tailwindcss').Config} */
// Colours point at the CSS custom properties in src/index.css, so one token set drives both.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        deep: 'var(--deep)',
        teal: 'var(--teal)',
        saffron: 'var(--saffron)',
        plum: 'var(--plum)',
        mint: 'var(--mint)',
        danger: 'var(--danger)',
        success: 'var(--success)',
      },
      fontFamily: {
        sans: ['"Host Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px', xl: '12px', panel: '20px' },
      maxWidth: { site: '1200px' },
    },
  },
  plugins: [],
};
