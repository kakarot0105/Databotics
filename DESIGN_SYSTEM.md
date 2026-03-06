# Databotics Design System

Premium data analytics platform inspired by Notion, Stripe, Linear, and Apple. Modern, clean, accessible, and delightful.

---

## 1. Color Palette

### Core Philosophy
- **Minimalist**: Whitespace and breathing room
- **Accessible**: WCAG AAA compliant contrast ratios
- **Professional**: Enterprise-grade yet approachable
- **Dynamic**: Dark/light mode support with consistent intent

### Light Mode Palette

#### Neutrals (Foundation)
```
Semantic Name     | Hex       | RGB              | Use Case
─────────────────┼───────────┼──────────────────┼─────────────────────
white             | #FFFFFF   | rgb(255, 255, 255) | Backgrounds, cards
off-white         | #FAFBFC   | rgb(250, 251, 252) | Subtle backgrounds
gray-50           | #F8F9FA   | rgb(248, 249, 250) | Hover states
gray-100          | #EAEEF2   | rgb(234, 238, 242) | Borders, dividers
gray-200          | #D5DDE5   | rgb(213, 221, 229) | Secondary borders
gray-300          | #B8C1CE   | rgb(184, 193, 206) | Disabled text
gray-400          | #8B94A5   | rgb(139, 148, 165) | Secondary text
gray-500          | #6B7684   | rgb(107, 118, 132) | Primary text muted
gray-600          | #4B5563   | rgb(75, 85, 99)    | Primary text
gray-700          | #2D3748   | rgb(45, 55, 72)    | Dark text, headings
```

#### Primary - Indigo (Action & Interaction)
```
indigo-50         | #EEF2FF   | rgb(238, 242, 255) | Light backgrounds
indigo-100        | #E0E7FF   | rgb(224, 231, 255) | Hover backgrounds
indigo-200        | #C7D2FE   | rgb(199, 210, 254) | Subtle backgrounds
indigo-300        | #A5B4FC   | rgb(165, 180, 252) | Borders
indigo-400        | #818CF8   | rgb(129, 140, 248) | Secondary buttons
indigo-500        | #6366F1   | rgb(99, 102, 241)  | **PRIMARY ACTION**
indigo-600        | #4F46E5   | rgb(79, 70, 229)   | Hover buttons
indigo-700        | #4338CA   | rgb(67, 56, 202)   | Pressed buttons
indigo-800        | #3730A3   | rgb(55, 48, 163)   | Dark focus states
```

#### Secondary - Emerald (Success & Positive)
```
emerald-50        | #F0FDF4   | rgb(240, 253, 244) | Success backgrounds
emerald-500       | #10B981   | rgb(16, 185, 129)  | **SUCCESS STATE**
emerald-600       | #059669   | rgb(5, 150, 105)   | Hover success
emerald-700       | #047857   | rgb(4, 120, 87)    | Dark success
```

#### Tertiary - Amber (Warnings)
```
amber-50          | #FFFBEB   | rgb(255, 251, 235) | Warning backgrounds
amber-500         | #F59E0B   | rgb(245, 158, 11)  | **WARNING STATE**
amber-600         | #D97706   | rgb(217, 119, 6)   | Hover warning
```

#### Danger - Red (Errors)
```
red-50            | #FEF2F2   | rgb(254, 242, 242) | Error backgrounds
red-500           | #EF4444   | rgb(239, 68, 68)   | **ERROR STATE**
red-600           | #DC2626   | rgb(220, 38, 38)   | Hover error
red-700           | #B91C1C   | rgb(185, 28, 28)   | Dark error
```

#### Info - Sky (Informational)
```
sky-50            | #F0F9FF   | rgb(240, 249, 255) | Info backgrounds
sky-500           | #0EA5E9   | rgb(14, 165, 233)  | **INFO STATE**
sky-600           | #0284C7   | rgb(2, 132, 199)   | Hover info
```

### Dark Mode Palette

#### Neutrals (Dark)
```
Semantic Name     | Hex       | RGB              | Use Case
─────────────────┼───────────┼──────────────────┼─────────────────────
dark-bg           | #0F172A   | rgb(15, 23, 42)    | Main background
dark-surface      | #1E293B   | rgb(30, 41, 59)    | Cards, panels
dark-surface-alt  | #334155   | rgb(51, 65, 85)    | Hover surfaces
dark-border       | #475569   | rgb(71, 85, 105)   | Borders
dark-text-muted   | #94A3B8   | rgb(148, 163, 184) | Secondary text
dark-text         | #CBD5E1   | rgb(203, 213, 225) | Primary text
dark-text-bright  | #F1F5F9   | rgb(241, 245, 249) | Bright text, headings
```

#### Accent Colors (Dark)
- **Primary**: indigo-400 (#818CF8) — higher contrast in dark mode
- **Success**: emerald-400 (#34D399)
- **Warning**: amber-400 (#FBBF24)
- **Error**: red-400 (#F87171)
- **Info**: sky-400 (#38BDF8)

---

## 2. Typography System

### Font Stack
```css
/* Headings: Clean, geometric, modern */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", 
             "Inter", "Oxygen", sans-serif;

/* Body: Optimized for data readability */
font-family: "Inter", "SF Pro Display", -apple-system, sans-serif;

/* Monospace: For code, numbers, values */
font-family: "Monaco", "Menlo", "Ubuntu Mono", "Courier New", monospace;
```

### Type Scale
```
Hierarchy      | Size  | Weight | Line-height | Letter-spacing | Use Case
───────────────┼───────┼────────┼─────────────┼────────────────┼──────────────────
Display        | 48px  | 700    | 1.2         | -0.02em        | Page titles
H1             | 36px  | 700    | 1.2         | -0.01em        | Section headers
H2             | 28px  | 600    | 1.3         | 0              | Subsections
H3             | 22px  | 600    | 1.4         | 0              | Card titles
H4             | 18px  | 600    | 1.5         | 0              | Smaller titles
Body Large     | 16px  | 400    | 1.6         | 0              | Primary text
Body           | 14px  | 400    | 1.6         | 0              | Default text
Body Small     | 13px  | 400    | 1.5         | 0              | Secondary text
Label          | 12px  | 500    | 1.4         | 0.05em         | Form labels
Caption        | 11px  | 400    | 1.4         | 0              | Hints, metadata
Code           | 13px  | 400    | 1.5         | 0              | Code blocks
```

---

## 3. Spacing System

Consistent 4px base unit (Tailwind-compatible):

```
Level   | px  | Use Case
────────┼─────┼──────────────────────────────────────
xs      | 4   | Icon margins, tight groups
sm      | 8   | Small component padding
md      | 12  | Component internal spacing
lg      | 16  | Card padding, medium sections
xl      | 24  | Large sections, columns
2xl     | 32  | Major layout sections
3xl     | 48  | Page-level spacing
```

---

## 4. Glassmorphism Components

Premium frosted glass aesthetic with blur, backdrop effects, and subtle shadows.

### Design Principles
1. **Translucency**: 10-15% opacity with strong background blur
2. **Layering**: Depth through shadows, not just opacity
3. **Micro-interactions**: Smooth 200-300ms transitions
4. **Mobile-first**: Touch-friendly hit targets (min 48px)
5. **Accessibility**: Sufficient contrast even with blur effect

### Glassmorphism Base Layer

```css
/* Glassmorphism Mixin */
.glass {
  background: rgba(255, 255, 255, 0.15);        /* Light mode */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;                          /* Smooth curves */
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

.glass.dark {
  background: rgba(30, 41, 59, 0.4);            /* Dark mode */
  border: 1px solid rgba(148, 163, 184, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

### Component Specifications

#### 1. Glass Card
```css
.glass-card {
  @extend .glass;
  padding: 24px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Hover state */
  &:hover {
    box-shadow: 0 12px 48px 0 rgba(31, 38, 135, 0.2);
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.2);
  }
  
  /* Active/focus state */
  &:focus-within {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }
}
```

#### 2. Glass Button (Primary Action)
```css
.btn-glass-primary {
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 14px;
  color: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  
  /* Hover: Lift effect */
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }
  
  /* Pressed: Squeeze effect */
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }
  
  /* Focus ring */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15), 
                0 4px 15px rgba(99, 102, 241, 0.3);
  }
}
```

#### 3. Glass Input Field
```css
.input-glass {
  @extend .glass;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  
  &::placeholder {
    color: rgba(107, 118, 132, 0.6);
  }
  
  /* Focus state */
  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1), 
                inset 0 0 0 2px rgba(99, 102, 241, 0.05);
    background: rgba(255, 255, 255, 0.12);
  }
}
```

#### 4. Glass Navbar/Header
```css
.navbar-glass {
  @extend .glass;
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  /* Strong blur for layering */
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  
  /* Subtle gradient underlay */
  background: linear-gradient(
    180deg, 
    rgba(255, 255, 255, 0.2) 0%, 
    rgba(255, 255, 255, 0.1) 100%
  );
}

.navbar-glass.dark {
  background: linear-gradient(
    180deg, 
    rgba(30, 41, 59, 0.5) 0%, 
    rgba(30, 41, 59, 0.3) 100%
  );
}
```

#### 5. Glass Dropdown Menu
```css
.dropdown-glass {
  @extend .glass;
  position: absolute;
  min-width: 200px;
  padding: 8px;
  border-radius: 12px;
  margin-top: 8px;
  
  /* Animation: Fade + Scale */
  animation: dropdownSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
  
  &.open {
    animation: dropdownSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dropdownSlide {
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

#### 6. Glass Modal/Dialog
```css
.modal-glass {
  @extend .glass;
  position: fixed;
  inset: 50%;
  transform: translate(-50%, -50%) scale(0.95);
  z-index: 50;
  max-width: 600px;
  padding: 32px;
  
  /* Stronger blur for emphasis */
  backdrop-filter: blur(40px);
  
  /* Animation */
  animation: modalSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  /* Backdrop */
  &::before {
    content: '';
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: -1;
    animation: fadeIn 0.3s ease;
  }
}

@keyframes modalSlide {
  to {
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
```

---

## 5. Micro-Interactions & Animations

### Easing Functions
```css
/* Entrance animations */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);    /* Smooth decelerate */
--ease-in: cubic-bezier(0.4, 0, 1, 1);       /* Sharp accelerate */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* Balanced */

/* Spring-like for playful interactions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Animation Durations
```css
--duration-fast: 150ms;    /* Quick feedback (clicks, hovers)*/
--duration-base: 200ms;    /* Standard transitions */
--duration-slow: 300ms;    /* Page transitions, modals */
--duration-slowest: 500ms; /* Entrance animations */
```

### Key Animations

#### 1. Button Ripple Effect (Material-inspired)
```css
@keyframes buttonRipple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.btn:active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: buttonRipple 0.6s ease-out;
}
```

#### 2. Chart Reveal (Framer Motion compatible)
```css
@keyframes chartReveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chart-container {
  animation: chartReveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

#### 3. Skeleton Loading Pulse
```css
@keyframes skeleton-loading {
  0%, 100% {
    background-color: rgba(255, 255, 255, 0.08);
  }
  50% {
    background-color: rgba(255, 255, 255, 0.12);
  }
}

.skeleton {
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 8px;
}
```

#### 4. Toast Notification Slide-In
```css
@keyframes toastSlide {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast {
  animation: toastSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(0);
}
```

---

## 6. Shadow System

Elevation-based shadows for depth:

```css
/* Subtle - Cards, inputs */
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1);

/* Default - Floating elements, buttons */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
             0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Medium - Dropdowns, small modals */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
             0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Large - Modals, elevated surfaces */
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
             0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Extra Large - Glassmorphism */
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

---

## 7. Responsive Design

### Breakpoints (Mobile-First)
```
Mobile:     360px - 767px    (default)
Tablet:     768px - 1023px   
Desktop:    1024px - 1439px  
Large:      1440px+          (4K)
```

### Layout Strategy
- **Mobile**: Single column, stacked components
- **Tablet**: 2-column grid, optimized for touch
- **Desktop**: Multi-column dashboard, dense information
- **Large**: Full-width layouts with spacious margins

---

## 8. Component Library Map

### Atoms
- Button (primary, secondary, ghost, danger)
- Input (text, number, email, password)
- Checkbox, Radio, Toggle
- Badge, Pill
- Icon

### Molecules
- Search Bar
- Form Group (label + input + error)
- Breadcrumbs
- Pagination
- Progress Bar
- Loading Spinner

### Organisms
- Navigation Header
- Sidebar
- Data Table
- Card Grid
- Filter Panel
- Modal/Dialog
- Toast Notification

### Templates
- Dashboard Layout
- Analytics Page
- Data Upload Flow
- Settings Panel

---

## 9. Accessibility (a11y)

- **Contrast Ratio**: Minimum WCAG AAA (7:1 for body text)
- **Focus States**: Visible 4px ring with 2px offset
- **Motion**: `prefers-reduced-motion` support
- **Color**: Never rely on color alone for information
- **Touch**: Minimum 48px hit target
- **Keyboard**: Full keyboard navigation support

---

## Implementation Notes

- Use Tailwind CSS for rapid prototyping
- Use Framer Motion for React animations
- Test dark mode with `prefers-color-scheme: dark`
- Ensure 60fps animations (GPU acceleration)
- Lazy-load heavy components (charts, images)
- Use CSS custom properties for consistent theming

---

**Last Updated**: 2026-02-16  
**Version**: 1.0 (Premium Design System)
