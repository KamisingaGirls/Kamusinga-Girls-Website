/* One Tailwind config for every page — change brand colours/fonts here, once. */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1D4ED8',         /* Royal blue (school colour) */
          blueHover: '#1E40AF',
          navyDark: '#0A1538',
          navyLight: '#0F2557',
          purple: '#7C3AED',       /* Prefect-tie purple accent */
          purpleHover: '#6D28D9',
          lightBg: '#F8FAFC',
          cardBg: '#F1F5F9',
          sky: '#EEF2F6'   /* used by the CMS portal's filter bar — was missing, elements using it had no background */
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        corporate: '0 20px 40px -18px rgba(15, 37, 87, 0.14)',
        'corporate-hover': '0 30px 60px -18px rgba(29, 78, 216, 0.22)',
        'purple-glow': '0 10px 30px -8px rgba(124, 58, 237, 0.40)',
        'blue-glow': '0 10px 30px -8px rgba(29, 78, 216, 0.40)'
      }
    }
  }
};
