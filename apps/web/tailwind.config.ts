import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Το ένα και μοναδικό σκούρο φόντο του marketing site. Πριν υπήρχαν
        // τρία διαφορετικά (navy hero, gray-900 trust bar, gray-950 marquee),
        // που έκαναν τη σελίδα να μοιάζει ραμμένη από κομμάτια.
        ink: '#060B1F',
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
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        // Η σκιά των καρτών: μία μεγάλη απαλή + μία κοντινή για «πάτημα».
        card: '0 24px 60px -18px rgba(2,8,23,.26), 0 8px 20px -8px rgba(2,8,23,.12)',
      },
    },
  },
  plugins: [],
};

export default config;