# PHASE 6: Premium UI Polish (Frontend Guide)

## Overview
This phase implements the premium glassmorphism design system with Framer Motion animations, dark/light mode support, responsive layouts, and custom dashboard builder. Frontend implementation guide for React/TypeScript.

---

## 1. Glassmorphism Design System Implementation

### Theme Provider Setup

```typescript
// theme.ts
import { createTheme } from '@mui/material/styles';

const lightTheme = createTheme({
  palette: {
    background: {
      default: '#FFFFFF',
      paper: '#FAFBFC',
    },
    primary: {
      main: '#6366F1', // Indigo-500
      light: '#818CF8', // Indigo-400
      dark: '#4F46E5', // Indigo-600
    },
    secondary: {
      main: '#10B981', // Emerald-500
    },
    error: {
      main: '#EF4444', // Red-500
    },
    warning: {
      main: '#F59E0B', // Amber-500
    },
    info: {
      main: '#0EA5E9', // Sky-500
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '48px',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '28px',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    body1: {
      fontSize: '14px',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '13px',
      lineHeight: 1.5,
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0F172A', // dark-bg
      paper: '#1E293B', // dark-surface
    },
    primary: {
      main: '#818CF8', // Indigo-400 (higher contrast)
      light: '#A5B4FC', // Indigo-300
      dark: '#6366F1', // Indigo-500
    },
    // ... rest similar to light
  },
  // ... rest of theme
});
```

### Glassmorphism Components

#### Glass Card Component

```typescript
// components/GlassCard.tsx
import { memo } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

const StyledGlassCard = styled(motion.div)<{ variant?: 'primary' | 'secondary' }>`
  background: ${props => props.theme.palette.mode === 'light'
    ? 'rgba(255, 255, 255, 0.15)'
    : 'rgba(30, 41, 59, 0.4)'};
  
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  border: 1px solid ${props => props.theme.palette.mode === 'light'
    ? 'rgba(255, 255, 255, 0.2)'
    : 'rgba(148, 163, 184, 0.15)'};
  
  border-radius: 16px;
  padding: 24px;
  box-shadow: ${props => props.theme.palette.mode === 'light'
    ? '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
    : '0 8px 32px 0 rgba(0, 0, 0, 0.3)'};
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: ${props => props.theme.palette.mode === 'light'
      ? '0 12px 48px 0 rgba(31, 38, 135, 0.2)'
      : '0 12px 48px 0 rgba(0, 0, 0, 0.4)'};
    transform: translateY(-2px);
    background: ${props => props.theme.palette.mode === 'light'
      ? 'rgba(255, 255, 255, 0.2)'
      : 'rgba(30, 41, 59, 0.5)'};
  }
  
  &:focus-within {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
`;

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  className?: string;
}

export const GlassCard = memo(({ children, variant = 'primary', ...props }: GlassCardProps) => (
  <StyledGlassCard
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    viewport={{ once: true }}
    {...props}
  >
    {children}
  </StyledGlassCard>
));

GlassCard.displayName = 'GlassCard';
```

#### Glass Button Component

```typescript
// components/GlassButton.tsx
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

const StyledButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'ghost' }>`
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
          }
          
          &:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: inherit;
          border: 1px solid ${props.theme.palette.divider};
          
          &:hover {
            background: ${props.theme.palette.action.hover};
          }
        `;
      default:
        return `
          background: ${props.theme.palette.action.selected};
          color: inherit;
        `;
    }
  }}
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
  }
`;

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
}

export const GlassButton = ({ children, variant = 'primary', ...props }: GlassButtonProps) => (
  <StyledButton
    variant={variant}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    {...props}
  >
    {children}
  </StyledButton>
);
```

---

## 2. Framer Motion Animations

### Chart Reveal Animation

```typescript
// animations/chartAnimations.ts
export const chartRevealVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: 'easeIn',
    },
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};
```

### Page Transitions

```typescript
// components/PageTransition.tsx
import { motion } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  out: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

export const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
  >
    {children}
  </motion.div>
);
```

### Button Ripple Effect

```typescript
// animations/rippleEffect.ts
export const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
  const button = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
};
```

---

## 3. Dark/Light Mode Toggle

### Theme Context

```typescript
// context/ThemeContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '../theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProviderComponent = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);
  
  const toggleTheme = () => setIsDark(!isDark);
  
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Theme Toggle Component

```typescript
// components/ThemeToggle.tsx
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="theme-toggle"
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? <Moon size={20} /> : <Sun size={20} />}
      </motion.div>
    </motion.button>
  );
};
```

---

## 4. Responsive Grid Layouts

### Mobile-First Grid System

```typescript
// components/ResponsiveGrid.tsx
import styled from '@emotion/styled';

const Grid = styled.div<{ cols?: number }>`
  display: grid;
  gap: 20px;
  
  /* Mobile: 1 column */
  grid-template-columns: 1fr;
  
  /* Tablet: 2 columns */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* Desktop: 3 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(${props => props.cols || 3}, 1fr);
  }
  
  /* Large: 4 columns */
  @media (min-width: 1440px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: number;
}

export const ResponsiveGrid = ({ children, cols }: ResponsiveGridProps) => (
  <Grid cols={cols}>{children}</Grid>
);
```

### Responsive Navigation

```typescript
// components/Navigation.tsx
import styled from '@emotion/styled';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const NavMenu = styled(motion.div)<{ isOpen: boolean }>`
  display: flex;
  gap: 32px;
  
  @media (max-width: 768px) {
    position: absolute;
    top: 60px;
    right: 0;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background: ${props => props.theme.palette.background.paper};
    border-radius: 12px;
    min-width: 200px;
  }
`;

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <NavContainer>
      <h1>Databotics</h1>
      
      <motion.button
        className="hamburger"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
        style={{ display: 'none' }}
      >
        {isOpen ? <X /> : <Menu />}
      </motion.button>
      
      <NavMenu
        isOpen={isOpen}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <a href="/dashboard">Dashboard</a>
        <a href="/explore">Explore</a>
        <a href="/insights">Insights</a>
        <a href="/settings">Settings</a>
      </NavMenu>
    </NavContainer>
  );
};
```

---

## 5. Custom Dashboard Builder

### Drag-and-Drop Widget System

```typescript
// components/DashboardBuilder.tsx
import { useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import styled from '@emotion/styled';

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px;
`;

interface Widget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'insight';
  title: string;
  size: 'small' | 'medium' | 'large';
  data?: any;
}

interface DashboardBuilderProps {
  initialWidgets: Widget[];
  onSave: (widgets: Widget[]) => void;
}

export const DashboardBuilder = ({ initialWidgets, onSave }: DashboardBuilderProps) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const handleDragEnd = (event: DragEndEvent) => {
    // Reorder widgets based on drag
  };
  
  const addWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type}`,
      size: 'medium',
    };
    setWidgets([...widgets, newWidget]);
  };
  
  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };
  
  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };
  
  return (
    <div className="dashboard-builder">
      <div className="builder-header">
        <h2>Dashboard</h2>
        <button onClick={() => setIsEditMode(!isEditMode)}>
          {isEditMode ? 'Done' : 'Edit'}
        </button>
      </div>
      
      {isEditMode && (
        <div className="widget-palette">
          <button onClick={() => addWidget('chart')}>+ Chart</button>
          <button onClick={() => addWidget('table')}>+ Table</button>
          <button onClick={() => addWidget('metric')}>+ Metric</button>
          <button onClick={() => addWidget('insight')}>+ Insight</button>
        </div>
      )}
      
      <DndContext onDragEnd={handleDragEnd}>
        <DashboardGrid>
          {widgets.map((widget) => (
            <motion.div
              key={widget.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`dashboard-widget dashboard-widget-${widget.size}`}
            >
              <WidgetCard widget={widget} isEditMode={isEditMode} />
              {isEditMode && (
                <button onClick={() => removeWidget(widget.id)} className="remove-btn">
                  Remove
                </button>
              )}
            </motion.div>
          ))}
        </DashboardGrid>
      </DndContext>
      
      <button onClick={() => onSave(widgets)}>Save Dashboard</button>
    </div>
  );
};

const WidgetCard = ({ widget, isEditMode }: { widget: Widget; isEditMode: boolean }) => {
  switch (widget.type) {
    case 'chart':
      return <div className="widget-chart">{/* Chart visualization */}</div>;
    case 'table':
      return <div className="widget-table">{/* Table */}</div>;
    case 'metric':
      return <div className="widget-metric">{/* KPI metric */}</div>;
    case 'insight':
      return <div className="widget-insight">{/* Insight card */}</div>;
  }
};
```

---

## 6. Accessibility & Performance

### Accessibility Features

```typescript
// utils/accessibility.ts
export const a11yAttributes = {
  ariaLabel: 'meaningful description',
  role: 'button',
  tabIndex: 0,
  'aria-pressed': false,
  'aria-expanded': false,
};

// Keyboard navigation
export const handleKeyboardNavigation = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    // Handle action
  }
};
```

### Performance Optimization

```typescript
// utils/performance.ts
export const useDebounce = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Lazy load components
export const AnalyticsPanel = lazy(() => import('./AnalyticsPanel'));
export const InsightsPanel = lazy(() => import('./InsightsPanel'));
```

---

## Frontend Libraries Required

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.16.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@mui/material": "^5.14.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/utilities": "^3.2.0",
    "recharts": "^2.10.0",
    "plotly.js": "^2.26.0",
    "lucide-react": "^0.293.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/react": "^18.2.0",
    "tailwindcss": "^3.3.0"
  }
}
```

---

## Implementation Checklist

- [ ] Glassmorphism component library (Glass Card, Button, Input, Navbar)
- [ ] Framer Motion animations (page transitions, chart reveals, ripples)
- [ ] Theme context and provider setup
- [ ] Dark/light mode toggle with persistence
- [ ] Responsive breakpoints (375px, 768px, 1024px, 1440px)
- [ ] Mobile-first navigation and layout
- [ ] Drag-and-drop dashboard builder
- [ ] Accessibility audit (WCAG AAA)
- [ ] Performance optimization (code splitting, lazy loading)
- [ ] Browser compatibility testing

---

**Last Updated**: 2026-02-16  
**Status**: Frontend specification and component guide  
**Implementation**: React/TypeScript with Framer Motion & Emotion  
**Next**: PHASE 7 - Testing & Documentation
