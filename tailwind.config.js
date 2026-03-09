/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3655b3',
        'primary-dark': '#2c448e',
        'primary-light': '#eef2ff',
        background: '#f3f3f3',
        surface: '#ffffff',
        'text-primary': '#1e293b',
        'text-secondary': '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }
  },
  plugins: []
};
