/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Status colors
        'status-inbox': '#6B7280',
        'status-qualifying': '#F59E0B',
        'status-watch': '#3B82F6',
        'status-inspect': '#8B5CF6',
        'status-bid': '#10B981',
        'status-won': '#22C55E',
        'status-lost': '#EF4444',
        'status-rejected': '#DC2626',
        'status-archived': '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
