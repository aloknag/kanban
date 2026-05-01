export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0a0f1e',
        violet: {
          400: '#a78bfa',
          500: '#a855f7',
          700: '#7c3aed',
        },
        slate: {
          100: '#f1f5f9',
          400: '#94a3b8',
        },
      },
      backdropBlur: {
        xl: '2rem',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
