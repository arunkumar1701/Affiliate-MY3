/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#dfe7f7',
          200: '#b7cbe5',
          300: '#7f9fc4',
          400: '#36ada3',
          500: '#2f578a',
          600: '#232f72',
          700: '#121358',
          800: '#0d0e42',
          900: '#08092c',
        },
      },
      perspective: {
        '800': '800px',
        '1000': '1000px',
        '1200': '1200px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translate3d(0,14px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'float-y': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.015)', opacity: '0.96' },
        },
        glow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.35)' },
          '50%': { boxShadow: '0 0 24px 4px rgba(59,130,246,0.28)' },
        },
        'shake-x': {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-4px)' },
          '40%,80%': { transform: 'translateX(4px)' },
        },
        'shrink-in': {
          '0%': { transform: 'scale(1.05)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'draw-check': {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translate3d(12px,0,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'slide-in-top': {
          '0%': { opacity: '0', transform: 'translate3d(0,-10px,0)' },
          '100%': { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'depth-pop': {
          '0%': { transform: 'scale(.6) rotateX(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.08) rotateX(3deg)' },
          '100%': { transform: 'scale(1) rotateX(0)', opacity: '1' },
        },
        'reverse-x': {
          '0%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '50%': { transform: 'translateX(2px)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .6s cubic-bezier(.2,.8,.2,1) both',
        'fade-in': 'fade-in .35s ease both',
        sweep: 'sweep 2.4s ease-in-out infinite',
        'float-y': 'float-y 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft .6s ease-out 1',
        glow: 'glow 3s ease-in-out infinite',
        'shake-x': 'shake-x .35s ease 1',
        'shrink-in': 'shrink-in .3s ease both',
        'draw-check': 'draw-check .6s cubic-bezier(.65,0,.45,1) forwards',
        'slide-in-right': 'slide-in-right .35s ease both',
        'slide-in-top': 'slide-in-top .35s ease both',
        'depth-pop': 'depth-pop .45s cubic-bezier(.2,.8,.2,1) both',
        'reverse-x': 'reverse-x .5s ease-out 1',
      },
    },
  },
  plugins: [],
};
