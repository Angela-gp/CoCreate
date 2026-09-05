/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05050a',
          900: '#07070c',
          850: '#0a0a11',
          800: '#0d0d16',
          750: '#11111c',
          700: '#161622',
          600: '#1e1e2c',
          500: '#2a2a3c',
        },
        sol: {
          purple: '#9945ff',
          violet: '#b583ff',
          cyan: '#00d1ff',
          teal: '#14f195',
          green: '#19fb9b',
        },
        txt: {
          hi: '#ececf5',
          mid: '#a3a3b8',
          lo: '#6f6f86',
        },
        good: '#14f195',
        warn: '#ffb228',
        bad: '#ff4d6a',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'sol-grad': 'linear-gradient(135deg, #9945ff 0%, #00d1ff 55%, #14f195 100%)',
        'sol-grad-soft': 'linear-gradient(135deg, rgba(153,69,255,.18) 0%, rgba(0,209,255,.14) 55%, rgba(20,241,149,.16) 100%)',
        'brand-text': 'linear-gradient(100deg, #00e0ff 0%, #7c6bff 45%, #c46bff 100%)',
        'panel': 'linear-gradient(180deg, rgba(255,255,255,.045) 0%, rgba(255,255,255,.012) 100%)',
        'glow-radial': 'radial-gradient(ellipse at top, rgba(153,69,255,.20), transparent 62%)',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,.045) inset, 0 18px 46px -22px rgba(0,0,0,.85)',
        glow: '0 0 0 1px rgba(153,69,255,.35), 0 12px 40px -12px rgba(153,69,255,.45)',
        'glow-teal': '0 0 0 1px rgba(20,241,149,.3), 0 12px 40px -14px rgba(20,241,149,.35)',
      },
      borderRadius: { xl2: '1.15rem', '4xl': '2rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-460px 0' }, '100%': { backgroundPosition: '460px 0' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(20,241,149,.45)' }, '70%': { boxShadow: '0 0 0 12px rgba(20,241,149,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(20,241,149,0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        'slide-in-right': { '0%': { opacity: '0', transform: 'translateX(28px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        confetti: { '0%': { transform: 'translateY(-8px) rotate(0)', opacity: '1' }, '100%': { transform: 'translateY(120px) rotate(320deg)', opacity: '0' } },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.22,.8,.3,1) both',
        'fade-in': 'fade-in .4s ease both',
        'scale-in': 'scale-in .28s cubic-bezier(.2,.9,.3,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(.2,.8,.3,1) infinite',
        float: 'float 5s ease-in-out infinite',
        'slide-in-right': 'slide-in-right .32s cubic-bezier(.2,.9,.3,1) both',
      },
    },
  },
  plugins: [],
}
