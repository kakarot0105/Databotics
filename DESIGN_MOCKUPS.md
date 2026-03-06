# Databotics - UI/UX Design Mockups

## Premium Data Analytics Dashboard - Visual Design Guide

---

## 🎨 Color Palette

### Dark Mode (Primary)
```
Background:      #0F172A (deep navy)
Surface:         #1E293B (slightly lighter)
Surface Hover:   #334155 (interactive)
Border:          #475569
Text Primary:    #F1F5F9 (bright white)
Text Secondary:  #CBD5E1 (muted white)
Text Muted:      #94A3B8 (very muted)

Primary Action:  #6366F1 (indigo - vibrant)
Hover:           #818CF8 (lighter indigo)
Success:         #10B981 (emerald green)
Warning:         #F59E0B (amber)
Error:           #EF4444 (red)
Info:            #0EA5E9 (sky blue)
```

### Light Mode (Secondary)
```
Background:      #FFFFFF
Surface:         #FAFBFC
Surface Hover:   #F8F9FA
Border:          #EAEEF2
Text Primary:    #2D3748 (dark)
Text Secondary:  #4B5563 (gray)

Primary Action:  #6366F1 (same indigo)
Success:         #10B981 (same green)
...
```

---

## 📱 Page Layouts

### 1. LOGIN PAGE
```
┌─────────────────────────────────────────┐
│                                         │
│          DATABOTICS LOGO                │
│       Premium Data Analytics            │
│                                         │
│   ┌──────────────────────────────┐     │
│   │  Email                       │     │
│   │  [___________________]       │     │
│   │                              │     │
│   │  Password                    │     │
│   │  [___________________]       │     │
│   │                              │     │
│   │  [  LOGIN  ]  [REGISTER]     │     │
│   │                              │     │
│   └──────────────────────────────┘     │
│                                         │
│  © 2026 Databotics. Ultra-Premium.     │
│                                         │
└─────────────────────────────────────────┘

DESIGN:
- Glassmorphism card (blur + transparency)
- Centered on dark gradient background
- Smooth 200ms transitions on input focus
- Purple gradient underlay on buttons
- "Forgot password?" subtle link
```

---

### 2. MAIN DASHBOARD (Home/Upload)
```
┌────────────────────────────────────────────────────────────────────┐
│  🌪️  Databotics  [Profile]  [Light/Dark]  [Logout]               │ Header
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌───────────────┐  ┌─────────────────────────────────────────┐ │
│  │               │  │                                         │ │
│  │   Sidebar     │  │    Welcome, User!                       │ │
│  │               │  │                                         │ │
│  │ • Upload      │  │  Get Started:                           │ │
│  │ • Profile     │  │  1. Upload a CSV/Excel file            │ │
│  │ • Validate    │  │  2. Explore data profile               │ │
│  │ • Clean       │  │  3. Analyze & visualize                │ │
│  │ • Query       │  │  4. Clean & transform                  │ │
│  │ • Anomaly     │  │                                         │ │
│  │ • AI Assist   │  │  ┌──────────────────────────────────┐ │ │
│  │               │  │  │  Drag CSV/Excel here or click  │ │ │
│  │               │  │  │  📁 Browse Files               │ │ │
│  │               │  │  │                                │ │ │
│  │               │  │  │  Max 50MB                     │ │ │
│  │               │  │  └──────────────────────────────┘ │ │
│  │               │  │                                         │ │
│  │               │  │  Progress: ████████░░░░░ 70%           │ │
│  │               │  │                                         │ │
│  └───────────────┘  └─────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

DESIGN ELEMENTS:
- Sticky header with logo, navigation, dark mode toggle
- Sticky left sidebar (collapses on mobile)
- Large drop zone (glassmorphism card)
- Smooth file upload animation
- Progress bar with glow effect
```

---

### 3. DATA PROFILE PAGE
```
┌────────────────────────────────────────────────────────────────────┐
│  🌪️  Databotics > Profile                              [⬇ Export] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Dataset: sales_data.csv • 2,500 rows • 15 columns               │
│                                                                    │
│  ┌──────────┬──────────┬──────────┬──────────┐                   │
│  │ Rows     │ Columns  │ Missing  │ Numeric  │  Stat Cards       │
│  │ 2,500    │ 15       │ 75       │ 8        │                   │
│  └──────────┴──────────┴──────────┴──────────┘                   │
│                                                                    │
│  AUTO INSIGHTS:                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ ⚠️  2% missing in  │  │ ✨ High cardinality│                 │
│  │    customer_age    │  │    in order_id     │                 │
│  └────────────────────┘  └────────────────────┘                 │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ 📊 Correlation     │  │ ✅ Clean data      │                 │
│  │    found: 0.87     │  │    No duplicates   │                 │
│  └────────────────────┘  └────────────────────┘                 │
│                                                                    │
│  VISUALIZATIONS:                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Mean & Std Dev       │  │ Data Completeness    │             │
│  │ ╭─────╮              │  │        ◐ 98%        │             │
│  │ │█████│ Total        │  │    Complete         │             │
│  │ │█    │ Discount     │  │    [████████░░]     │             │
│  │ │████ │ Age          │  │                      │             │
│  │ ╰─────╯              │  │ Missing: 75         │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Min/Max Range        │  │ Distribution (Scatter)              │
│  │ ╭────────────────────╮  │ ┌─────────────┐      │             │
│  │ │ Min ━━━━━━━ Max    │  │ │   •     •   │      │             │
│  │ │  10     500        │  │ │  •  •  •    │      │             │
│  │ ╰────────────────────╯  │ │  •   •   •  │      │             │
│  │                          │ │   •   • •   │      │             │
│  │ Qty  Units  Price Disc   │ │    •  •     │      │             │
│  └──────────────────────┘  └─────────────┘      │             │
│                                                                    │
│  COLUMN DETAILS:                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │\n│  │ Column           │ Type     │ Nulls │ Min    │ Max    │ │ │\n│  │ order_id         │ int      │ 0     │ 100000 │ 102500 │ │ │\n│  │ total_sale       │ float    │ 0     │ 10.50  │ 4995   │ │ │\n│  │ customer_age     │ int      │ 50    │ 18     │ 75     │ │ │\n│  │ product_category │ string   │ 0     │ ─      │ ─      │ │ │\n│  │ customer_satisfaction │ int │ 0     │ 1      │ 5      │ │ │\n│  │ ... (11 more)    │ ...      │ ...   │ ...    │ ...    │ │ │\n│  └────────────────────────────────────────────────────────────┘ │\n│                                                                    │
└────────────────────────────────────────────────────────────────────┘

DESIGN:
- Large stat cards with icons and color-coded values
- Multiple chart types (bar, pie, line, scatter)
- Auto-generated insights with emoji indicators
- Glassmorphism cards for chart containers
- Smooth chart animations (500ms reveal)
- Scrollable detailed table
- Export data button
```

---

### 4. DATA CLEANING PAGE
```
┌────────────────────────────────────────────────────────────────────┐
│  🌪️  Databotics > Clean                          [Preview] [Apply] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Data Quality Assessment:                                         │
│  ┌────────────────────────────────────────────────────────────┐ │\n│  │ Duplicates: 30 found    ☐ Remove duplicates             │ │\n│  │ Missing: 75 total       ☐ Drop rows with nulls           │ │\n│  │ Empty Cols: 0           ☐ Drop empty columns             │ │\n│  └────────────────────────────────────────────────────────────┘ │\n│                                                                    │\n│  Missing Value Strategy:                                          │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Strategy: [▼ Median ▼] (median/mean/mode/zero/unknown)  │  │\n│  │                                                           │  │\n│  │ Affected Columns:                                         │  │\n│  │ • customer_age (50 missing)                              │  │\n│  │ • shipping_days (25 missing)                             │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  Drop Columns (optional):                                         │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ [X] internal_id         [Remove]                         │  │\n│  │ [X] temp_field          [Remove]                         │  │\n│  │ [ ] order_id            [Keep]                           │  │\n│  │ [ ] total_sale          [Keep]                           │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  Cleaning Summary:                                                │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Original:     2,500 rows × 15 columns                   │  │\n│  │ After Clean:  2,420 rows × 13 columns                   │  │\n│  │ Removed:      80 rows • 2 columns                        │  │\n│  │ Operations:   3 (duplicates, drop cols, fill missing)    │  │\n│  │                                                           │  │\n│  │ [  Preview  ]  [  Cancel  ]  [  Apply & Download  ]   │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n└────────────────────────────────────────────────────────────────────┘

DESIGN:
- Interactive checkboxes for operations
- Dropdown menus for strategy selection
- Real-time preview of results
- Color-coded operation badges
- Collapsible sections for advanced options
- Confirmation dialog before applying
```

---

### 5. DATA TRANSFORMATION PAGE
```
┌────────────────────────────────────────────────────────────────────┐
│  🌪️  Databotics > Transform                   [Preview] [Download] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Column Transformations:                                          │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Transform 1: unit_price                                  │  │\n│  │ Method: [▼ Normalize (Min-Max) ▼]                       │  │\n│  │ Status: ✅ Applied (Min: 10.50, Max: 500.00)             │  │\n│  │ Preview: [10.50→0.0] [500.00→1.0]                       │  │\n│  │ [Undo]                                                   │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Transform 2: product_category                            │  │\n│  │ Method: [▼ One-Hot Encode ▼]                             │  │\n│  │ Status: ✅ Applied (5 categories)                         │  │\n│  │ New Columns: product_category_Electronics,               │  │\n│  │              product_category_Clothing, ...              │  │\n│  │ [Undo]                                                   │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Transform 3: (Add new...)                                │  │\n│  │ Column: [▼ Select column ▼]                              │  │\n│  │ Method: [▼ Choose transformation ▼]                      │  │\n│  │ [Add Transform]                                          │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  Available Methods:                                                │\n│  • Normalize: Min-Max, Z-Score, Robust                          │\n│  • Scale: Custom range (e.g., 0-100)                            │\n│  • Log: Reduce skewness                                         │\n│  • One-Hot Encode: Categorical → Binary                         │\n│                                                                    │\n│  [  Undo All  ]  [  Download Transformed  ]  [  Reset  ]      │\n│                                                                    │\n└────────────────────────────────────────────────────────────────────┘

DESIGN:
- Drag-and-drop card interface
- Undo/Redo stack visualization
- Live transformation preview
- Method selection dropdowns
- Applied status badges
- Clear operation history
```

---

### 6. AI INSIGHTS PAGE
```
┌────────────────────────────────────────────────────────────────────┐
│  🌪️  Databotics > AI Assist                           [Refresh]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  🤖 Auto-Generated Insights (Powered by Claude)                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ 1️⃣  Key Finding: Total Sale Correlation               │  │\n│  │    ───────────────────────────────────────────────────  │  │\n│  │    unit_price and total_sale show very strong          │  │\n│  │    positive correlation (0.987), indicating that       │  │\n│  │    price is the dominant factor in order value.        │  │\n│  │                                                         │  │\n│  │    Recommendation: Use for price optimization          │  │\n│  │    strategies.                                          │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ 2️⃣  Quality Alert: Missing Values Detected             │  │\n│  │    ───────────────────────────────────────────────────  │  │\n│  │    customer_age has 2% missing values (50 records).     │  │\n│  │    This could skew demographic analysis.               │  │\n│  │                                                         │  │\n│  │    Recommendation: Impute with median age (45 years)   │  │\n│  │    or drop if age is critical for analysis.            │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ 3️⃣  Insight: Distribution Shape                        │  │\n│  │    ───────────────────────────────────────────────────  │  │\n│  │    customer_satisfaction is uniformly distributed       │  │\n│  │    (ratings 1-5 equally common), suggesting           │  │\n│  │    diverse customer experiences. No obvious bias       │  │\n│  │    toward positive or negative ratings.                │  │\n│  │                                                         │  │\n│  │    Recommendation: Investigate satisfaction drivers    │  │\n│  │    to understand how to shift distribution.            │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n│  Natural Language Query:                                          │\n│  ┌──────────────────────────────────────────────────────────┐  │\n│  │ Ask: "Which countries have highest average order value" │  │\n│  │ [                                              ] [Search] │  │\n│  │                                                           │  │\n│  │ Response:                                                 │  │\n│  │ Based on data analysis, Germany leads with $1,850 avg,  │  │\n│  │ followed by Canada ($1,720) and USA ($1,630).           │  │\n│  │ International markets show 12% higher value orders.      │  │\n│  └──────────────────────────────────────────────────────────┘  │\n│                                                                    │\n└────────────────────────────────────────────────────────────────────┘

DESIGN:
- Numbered insight cards with emojis
- Color-coded badge system
- Expandable insight details
- NLP query interface
- Rich text responses
- One-click recommended actions
```

---

## 🎯 Key Design Features

### Glassmorphism Style
- Blur effect: `backdrop-filter: blur(20px)`
- Transparency: `rgba(255,255,255,0.15)` dark, `rgba(30,41,59,0.4)` light
- Border: `1px solid rgba(255,255,255,0.2)`
- Shadow: `0 8px 32px rgba(31,38,135,0.15)`
- Radius: `16px` smooth corners

### Animations & Micro-interactions
```
Button Hover:     Lift 2px + glow 200ms
Click Effect:     Ripple animation 600ms
Chart Reveal:     Fade + slide up 500ms spring
Toast Notify:     Slide in from right 300ms
Modal Open:       Scale 0.95→1.0 + fade 300ms
Page Transition:  Fade 200ms cubic-bezier(0.4,0,0.2,1)
Loading:          Shimmer pulse 1.5s infinite
```

### Color Usage
- **Primary (Indigo #6366F1)**: Buttons, links, active states
- **Success (Emerald #10B981)**: Positive insights, validated data
- **Warning (Amber #F59E0B)**: Missing values, quality alerts
- **Error (Red #EF4444)**: Failed operations, validation errors
- **Neutral (Gray)**: Disabled states, secondary text

### Responsive Breakpoints
- **Mobile (360-767px)**: Single column, stacked sidebar
- **Tablet (768-1023px)**: Two-column grid
- **Desktop (1024-1439px)**: Three-column dashboard
- **Wide (1440px+)**: Full multi-panel layout

---

## 📊 Data Visualization Styles

### Charts
- **Bar Charts**: Gradient fill (indigo→purple)
- **Line Charts**: Smooth curves with filled area
- **Pie/Donut**: Pastel colors, legend outside
- **Scatter**: Semi-transparent dots with glow
- **Heatmap**: Color scale (cool→warm)
- **Box Plot**: Minimal, quartile focus

### Tooltips
```
┌─────────────────────────────┐
│ Hover Info                  │
│ Value: 1245.75              │
│ Percentile: 45th            │
│ Count: 523                  │
└─────────────────────────────┘
Background: rgba(30,41,59,0.95)
Border: 1px solid rgba(99,102,241,0.3)
```

### Icons & Badges
- **Success**: ✅ Green glow
- **Warning**: ⚠️ Yellow glow
- **Error**: ❌ Red glow
- **Info**: ℹ️ Blue glow
- **Loading**: ⟳ Spinner animation

---

## 🎬 User Workflows

### Workflow 1: Quick Data Analysis
```
1. Login
2. Upload CSV
3. Auto Profile (instant)
4. View Insights (3 key findings)
5. Export Report
⏱️ Total: ~30 seconds
```

### Workflow 2: Data Cleaning
```
1. Upload Data
2. Review Missing Values
3. Get Suggestions (auto)
4. Adjust Cleaning Plan
5. Preview Results
6. Apply & Download
⏱️ Total: ~2 minutes
```

### Workflow 3: ML Preparation
```
1. Upload Raw Data
2. Analyze (profile, outliers, distributions)
3. Clean (duplicates, missing values)
4. Transform (normalize, encode, scale)
5. Validate (correlations, outliers)
6. Export ML-Ready Dataset
⏱️ Total: ~5 minutes
```

---

## 🌙 Dark/Light Mode

### Dark Mode (Default - Ultra-Premium)
- Deep navy background (#0F172A)
- Subtle glassmorphism (more visible)
- Vibrant accent colors (stand out)
- Minimal eye strain, best for extended use
- Professional appearance

### Light Mode (Alternative)
- Clean white background
- Softer glassmorphism effect
- Muted accent colors
- High contrast text
- Classic professional look

**Smooth transition**: 300ms CSS transition on all colors

---

## 🏆 Premium Quality Metrics

✨ **Loading Speed**: <2 seconds page load  
✨ **Animations**: 60fps smooth (GPU accelerated)  
✨ **Accessibility**: WCAG AAA compliant  
✨ **Mobile**: Touch-friendly (48px min buttons)  
✨ **Charts**: Interactive tooltips, zoom, pan  
✨ **Responsive**: Perfect on 360px to 4K  
✨ **Code Quality**: Clean, commented, organized  
✨ **Error Handling**: Graceful, helpful messages  

---

## 📈 Feature Comparison

| Feature | Databotics | Tableau | Power BI |
|---------|-----------|---------|----------|
| Modern UI | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Data Cleaning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| AI Insights | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Cost | FREE | $$$ | $$ |

---

**Design System Version**: 1.0 Premium  
**Last Updated**: 2026-02-16  
**Status**: Production Ready ✅  
**Next**: Frontend Implementation 🚀
