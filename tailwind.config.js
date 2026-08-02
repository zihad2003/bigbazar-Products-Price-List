/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ce112d', // Primary Brand Red (#ce112d)
          hover: '#b00e26',
          light: '#fff1f2',
          dark: '#991b1b',
        },
        primary: {
          DEFAULT: '#ce112d',
          dark: '#b00e26',
        },
        surface: {
          base: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          input: 'var(--bg-input)',
        },
        content: {
          primary: 'var(--text-primary)',   /* WCAG AAA compliant */
          secondary: 'var(--text-secondary)', /* WCAG AAA compliant */
          tertiary: 'var(--text-tertiary)',   /* WCAG AA compliant */
          muted: 'var(--text-muted)',       /* WCAG AA compliant */
          faint: 'var(--text-faint)',
        }
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'raised': 'var(--shadow-raised)',
        'focus': 'var(--shadow-focus)',
        'danger': 'var(--shadow-danger)',
        'overlay': 'var(--shadow-overlay)',
      },
      fontSize: {
        'base': ['0.9375rem', { lineHeight: '1.65', letterSpacing: '-0.01em' }], // 15px base (14-16px range)
      },
      minHeight: {
        'touch': '44px', // WCAG 2.2 AA SC 2.5.8 Touch Target Size
      },
      minWidth: {
        'touch': '44px', // WCAG 2.2 AA SC 2.5.8 Touch Target Size
      }
    },
  },
  plugins: [],
}