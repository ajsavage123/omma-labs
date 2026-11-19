/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // CRM design system tokens (scoped via CSS vars on .crm-root)
        background: 'var(--background, #0F172A)',
        foreground: 'var(--foreground, #F1F5F9)',
        card: {
          DEFAULT: 'var(--card, #1E293B)',
          foreground: 'var(--card-foreground, #F1F5F9)',
        },
        popover: {
          DEFAULT: 'var(--popover, #1E293B)',
          foreground: 'var(--popover-foreground, #F1F5F9)',
        },
        primary: {
          DEFAULT: 'var(--primary, #7C3AED)',
          foreground: 'var(--primary-foreground, #F1F5F9)',
        },
        secondary: {
          DEFAULT: 'var(--secondary, #334155)',
          foreground: 'var(--secondary-foreground, #F1F5F9)',
        },
        muted: {
          DEFAULT: 'var(--muted, #475569)',
          foreground: 'var(--muted-foreground, #CBD5E1)',
        },
        accent: {
          DEFAULT: 'var(--accent, #7C3AED)',
          foreground: 'var(--accent-foreground, #F1F5F9)',
        },
        destructive: {
          DEFAULT: 'var(--destructive, #EF4444)',
          foreground: 'var(--destructive-foreground, #F1F5F9)',
        },
        border: 'var(--border, #334155)',
        input: 'var(--input, #334155)',
        ring: 'var(--ring, #7C3AED)',
        sidebar: {
          DEFAULT: 'var(--sidebar, #1E293B)',
          foreground: 'var(--sidebar-foreground, #F1F5F9)',
          primary: 'var(--sidebar-primary, #7C3AED)',
          'primary-foreground': 'var(--sidebar-primary-foreground, #F1F5F9)',
          accent: 'var(--sidebar-accent, #7C3AED)',
          'accent-foreground': 'var(--sidebar-accent-foreground, #F1F5F9)',
          border: 'var(--sidebar-border, #334155)',
          ring: 'var(--sidebar-ring, #7C3AED)',
        },
      },
      borderRadius: {
        lg: 'var(--radius, 0.65rem)',
        md: 'calc(var(--radius, 0.65rem) - 2px)',
        sm: 'calc(var(--radius, 0.65rem) - 4px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
