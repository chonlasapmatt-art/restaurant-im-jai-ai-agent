// Shared Tailwind CDN config — design tokens from the ImJai design system (Stitch export).
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        secondary: '#605e58',
        'on-tertiary-fixed-variant': '#713700',
        'surface-container-highest': '#e3e2e0',
        'tertiary-fixed-dim': '#ffb783',
        'inverse-primary': '#e5beb5',
        'surface-variant': '#e3e2e0',
        'tertiary-container': '#5e2d00',
        'on-primary': '#ffffff',
        'on-tertiary': '#ffffff',
        'surface-bright': '#faf9f6',
        'on-surface': '#1a1c1a',
        background: '#faf9f6',
        'on-surface-variant': '#504442',
        'surface-container-lowest': '#ffffff',
        'primary-container': '#4e342e',
        outline: '#827471',
        'on-secondary-container': '#66645e',
        'inverse-on-surface': '#f2f1ee',
        'inverse-surface': '#2f312f',
        'secondary-fixed': '#e6e2da',
        'surface-container-low': '#f4f3f1',
        'secondary-container': '#e6e2da',
        'primary-fixed-dim': '#e5beb5',
        'error-container': '#ffdad6',
        'surface-container': '#efeeeb',
        'on-tertiary-fixed': '#301400',
        'on-secondary-fixed': '#1c1c17',
        error: '#ba1a1a',
        'on-primary-fixed-variant': '#5c403a',
        'on-background': '#1a1c1a',
        tertiary: '#3e1b00',
        'on-error': '#ffffff',
        primary: '#361f1a',
        'outline-variant': '#d4c3bf',
        'on-error-container': '#93000a',
        'on-secondary-fixed-variant': '#484741',
        'on-secondary': '#ffffff',
        'primary-fixed': '#ffdad2',
        'secondary-fixed-dim': '#c9c6bf',
        'on-primary-fixed': '#2b1611',
        'surface-container-high': '#e9e8e5',
        'on-primary-container': '#c19c94',
        'surface-tint': '#755750',
        'tertiary-fixed': '#ffdcc5',
        'on-tertiary-container': '#f4892d',
        surface: '#faf9f6',
        'surface-dim': '#dbdad7'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        xl: '40px',
        unit: '4px',
        lg: '24px',
        'container-max': '1280px',
        xs: '4px',
        gutter: '20px',
        sm: '8px',
        md: '16px'
      },
      fontFamily: {
        'body-lg': ['Plus Jakarta Sans'],
        'display-lg': ['Literata'],
        'headline-lg-mobile': ['Literata'],
        'headline-md': ['Literata'],
        'body-md': ['Plus Jakarta Sans'],
        'headline-lg': ['Literata'],
        'label-sm': ['Plus Jakarta Sans'],
        'label-md': ['Plus Jakarta Sans']
      },
      fontSize: {
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.03em', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }]
      }
    }
  }
};
