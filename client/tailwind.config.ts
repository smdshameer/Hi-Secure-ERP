import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a3480',
          light: '#2563eb',
          dark: '#0f2060',
        },
        primary: { DEFAULT: '#1565C0', foreground: '#ffffff' },
        secondary: { DEFAULT: '#1a237e', foreground: '#ffffff' },
        accent: { DEFAULT: '#FF6F00', foreground: '#ffffff' },
        success: { DEFAULT: '#1B5E20', foreground: '#ffffff' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};

export default config;
