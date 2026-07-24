/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: 'rgb(var(--color-brand-gold) / <alpha-value>)',
          'gold-light': 'rgb(var(--color-brand-gold-light) / <alpha-value>)',
          'gold-deep': 'rgb(var(--color-brand-gold-deep) / <alpha-value>)',
          'gold-pale': 'rgb(var(--color-brand-gold-pale) / <alpha-value>)',
          'gold-shine': 'rgb(var(--color-brand-gold-shine) / <alpha-value>)',
          teal: 'rgb(var(--color-brand-teal) / <alpha-value>)',
          'teal-mid': 'rgb(var(--color-brand-teal-mid) / <alpha-value>)',
          'teal-pale': 'rgb(var(--color-brand-teal-pale) / <alpha-value>)',
          cream: 'rgb(var(--color-brand-cream) / <alpha-value>)',
          ink: 'rgb(var(--color-brand-ink) / <alpha-value>)',
          'ink-2': 'rgb(var(--color-brand-ink-2) / <alpha-value>)',
          'ink-3': 'rgb(var(--color-brand-ink-3) / <alpha-value>)',
        },
        libro: 'rgb(var(--color-brand-teal) / <alpha-value>)',
        ensenanza: 'rgb(var(--color-brand-gold) / <alpha-value>)',
        devocional: 'rgb(var(--color-brand-devocional) / <alpha-value>)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}


