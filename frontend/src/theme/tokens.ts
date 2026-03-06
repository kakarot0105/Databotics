/**
 * Design Tokens - Ultra-Premium Design System
 * Inspired by: Figma, Notion, Linear, Stripe, Apple
 */

export const TOKENS = {
  // ============================================================================
  // COLORS - Dark Mode (Primary)
  // ============================================================================
  colors: {
    dark: {
      base: '#0f0f0f',           // Ultra dark background
      surface: '#1a1a1a',        // Card/surface background
      surface_hover: '#242424',  // Surface hover state
      surface_active: '#2f2f2f', // Surface active state
      border: '#333333',         // Subtle borders
      border_light: '#454545',   // Lighter borders for contrast
      text_primary: '#ffffff',   // Main text
      text_secondary: '#a0a0a0', // Secondary text
      text_muted: '#686868',     // Muted/hint text
      
      // Gradients
      gradient_primary: 'linear-gradient(135deg, #00d9ff 0%, #9d4edd 50%, #ff006e 100%)',
      gradient_accent: 'linear-gradient(135deg, #00d9ff 0%, #9d4edd 100%)',
      gradient_warm: 'linear-gradient(135deg, #ff006e 0%, #ffbe0b 100%)',
    },
    
    // ============================================================================
    // COLORS - Light Mode
    // ============================================================================
    light: {
      base: '#ffffff',           // Pure white background
      surface: '#f5f5f5',        // Card/surface background
      surface_hover: '#eeeeee',  // Surface hover state
      surface_active: '#e8e8e8', // Surface active state
      border: '#e0e0e0',         // Subtle borders
      border_light: '#f0f0f0',   // Lighter borders
      text_primary: '#1a1a1a',   // Main text
      text_secondary: '#666666', // Secondary text
      text_muted: '#999999',     // Muted/hint text
      
      // Gradients (soft pastels)
      gradient_primary: 'linear-gradient(135deg, #e0f2fe 0%, #f3e8ff 50%, #fce7f3 100%)',
      gradient_accent: 'linear-gradient(135deg, #cffafe 0%, #e9d5ff 100%)',
      gradient_warm: 'linear-gradient(135deg, #fecaca 0%, #fde047 100%)',
    },
    
    // ============================================================================
    // SEMANTIC COLORS
    // ============================================================================
    semantic: {
      accent: '#00d9ff',         // Electric blue
      accent_secondary: '#9d4edd', // Vibrant purple
      accent_tertiary: '#ff006e',  // Hot pink
      
      success: '#10b981',        // Green
      warning: '#f59e0b',        // Amber
      error: '#ef4444',          // Red
      info: '#3b82f6',           // Blue
      
      success_light: '#d1fae5',
      warning_light: '#fef3c7',
      error_light: '#fee2e2',
      info_light: '#dbeafe',
    },
  },

  // ============================================================================
  // TYPOGRAPHY
  // ============================================================================
  typography: {
    fontFamily: {
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      mono: '"JetBrains Mono", "Monaco", "Courier New", monospace',
    },
    
    // Font sizes
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '28px',
      '5xl': '32px',
      '6xl': '36px',
      '7xl': '48px',
    },
    
    // Font weights
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    
    // Letter spacing
    letterSpacing: {
      tight: '-0.02em',
      normal: '0em',
      wide: '0.02em',
      wider: '0.04em',
      widest: '0.1em',
    },
  },

  // ============================================================================
  // SPACING (8px base grid)
  // ============================================================================
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px',
  },

  // ============================================================================
  // SHADOWS - Subtle but premium
  // ============================================================================
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    
    // Dark mode shadows
    dark_xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    dark_sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    dark_md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    dark_lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.25)',
  },

  // ============================================================================
  // BORDER RADIUS
  // ============================================================================
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
  },

  // ============================================================================
  // TRANSITIONS & ANIMATIONS
  // ============================================================================
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slowest: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // ============================================================================
  // Z-INDEX SCALE
  // ============================================================================
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modal_backdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    notification: 1700,
  },

  // ============================================================================
  // BREAKPOINTS
  // ============================================================================
  breakpoints: {
    xs: '375px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================================================
  // GRADIENTS - Reusable
  // ============================================================================
  gradients: {
    primary_dark: 'linear-gradient(135deg, #00d9ff 0%, #9d4edd 50%, #ff006e 100%)',
    primary_light: 'linear-gradient(135deg, #cffafe 0%, #e9d5ff 50%, #fbcfe8 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
};

// ============================================================================
// RESPONSIVE HELPERS
// ============================================================================
export const media = {
  mobile: `@media (max-width: ${TOKENS.breakpoints.md})`,
  tablet: `@media (min-width: ${TOKENS.breakpoints.md}) and (max-width: ${TOKENS.breakpoints.lg})`,
  desktop: `@media (min-width: ${TOKENS.breakpoints.lg})`,
  lg: `@media (min-width: ${TOKENS.breakpoints.lg})`,
  xl: `@media (min-width: ${TOKENS.breakpoints.xl})`,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
export type ColorMode = 'light' | 'dark';
export type Semantic = keyof typeof TOKENS.colors.semantic;
