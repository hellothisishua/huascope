# Responsive Layout Patterns (Desktop + Mobile)

## Overview
For projects that need to work on both desktop (horizontal sidebar + content) and mobile (vertical stack), use **CSS media queries** to toggle between the two. Write mobile styles as the default, then override with `@media (min-width: 900px)` for desktop.

## Pattern: CSS Media Query Approach

### Core Principle
- **Mobile-first CSS** — Base styles are for mobile
- **Desktop override** — `@media (min-width: 900px)` overrides for desktop
- **Single DOM tree** — Same HTML structure, different CSS rules
- **No JS layout switching** — Let CSS handle which styles apply

### CSS Structure

```css
/* Mobile-first (default) - hidden sidebar */
.sidebar { display: none; }

/* Desktop breakpoint - show sidebar */
@media (min-width: 900px) {
  .sidebar {
    display: flex;
    width: 260px;
    flex-shrink: 0;
  }
  
  .app {
    display: flex;
    height: 100vh;
    padding: 20px;
    gap: 20px;
  }
  
  .main {
    flex: 1;
    height: calc(100vh - 40px);
  }
}
```

### 🔴 CRITICAL: Desktop Content Area Full Width

**Problem:** Poster wall and stats pages don't fill the full content area on desktop, appearing narrow or only 2/3 width.

**Root Cause:** Missing `width: 100%` and `box-sizing: border-box` on desktop sections.

**Fix:** Every desktop section MUST explicitly set these properties:

```css
@media (min-width: 900px) {
  /* Content body */
  .content-body {
    padding: 24px 32px;
    flex: 1;
    width: 100%;
    box-sizing: border-box;
  }
  
  /* Poster wall */
  .poster-wall {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
    gap: 24px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  
  /* Stats */
  .stats-page {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    box-sizing: border-box !important;
  }
  
  .stats-hero, .stats-section {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
}
```

### 🔴 CRITICAL: Mobile Overflow Prevention (WorkBuddy Fix)

**Problem:** On mobile, some views (list/poster wall/stats) appear wider than others, causing horizontal scroll.

**Root Cause:** Flex children with long content (movie titles, genre names, year labels) expand beyond viewport because they lack `overflow: hidden` and `min-width: 0`.

**Fix:** Add these global rules:

```css
/* Global overflow prevention */
html, body {
  overflow-x: hidden;
  max-width: 100%;
}
body {
  -webkit-text-size-adjust: 100%;
}
.app {
  overflow-x: hidden;
  width: 100%;
}
.main {
  overflow-x: hidden;
  width: 100%;
}

/* Flex children must allow shrinking */
.movie-card-body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.search-item-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* Grid items must respect container width */
.poster-wall {
  width: 100%;
  max-width: 100%;
}
.poster-wall-item {
  min-width: 0;
}

/* Stats page containers */
.stats-page {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
.stats-hero, .stats-section {
  max-width: 100%;
}
.stats-section {
  overflow: hidden;
}

/* Charts: scrollable if too many bars */
.chart-container {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  max-width: 100%;
}
.chart-bar {
  min-width: 32px;
}

/* Pie chart responsive */
.pie-chart {
  max-width: 100%;
}
.pie-chart-container, .pie-legend {
  max-width: 100%;
}

/* Long labels: ellipsis */
.genre-bar-label, .year-bar-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.genre-bar-track, .year-bar-track {
  min-width: 0;
}
.genre-bars, .genre-bar, .year-bars, .year-bar {
  max-width: 100%;
}

/* Similar movies grid */
.similar-movies {
  max-width: 100%;
}
```

### 🔴 CRITICAL: Movie Poster Resolution & Cutoff

**Problem:** Movie posters appear blurry or get cut off at the top/bottom on desktop grid.

**Fix:** Use higher TMDB image size and fixed aspect ratio containers:

```jsx
// In MovieCard.jsx — use w342 instead of w154 for higher resolution
<img src={posterUrl(movie.poster, 'w342')} alt="" className="movie-card-poster" />
```

```css
@media (min-width: 900px) {
  .movie-list--grid .movie-card-poster {
    width: 100% !important;
    height: 260px !important;      /* Fixed height prevents overlap */
    border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
    object-fit: cover !important;  /* Prevents distortion */
  }
}
```

## Desktop Sidebar Design

```css
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  border-radius: var(--radius-xl);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-clay);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius);
  cursor: pointer;
}

.sidebar-nav-item.active {
  background: linear-gradient(135deg, var(--clay-rose) 0%, var(--clay-rose-deep) 100%);
  color: #fff;
}
```

## Desktop Content Area

```css
.main {
  flex: 1;
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  border-radius: var(--radius-xl);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.content-header {
  padding: 20px 28px;
  border-bottom: 1px solid var(--clay-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.content-body {
  padding: 24px 28px;
  flex: 1;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}
```

## Desktop Movie Grid (vs Mobile List)

```css
/* Mobile: vertical list */
.movie-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Desktop: grid cards */
@media (min-width: 900px) {
  .movie-list--grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
    gap: 20px !important;
  }

  .movie-list--grid .movie-card {
    flex-direction: column !important;
    gap: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    height: 100%;
  }

  .movie-list--grid .movie-card-poster {
    width: 100% !important;
    height: 260px !important;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
    object-fit: cover !important;
  }

  .movie-list--grid .movie-card-poster--empty {
    height: 260px !important;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
  }
}
```

## Mobile-First Container Pattern (Hermes/WorkBuddy Unified)

When user wants **same layout on desktop and mobile** (single column, centered):

```css
.app {
  max-width: 500px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 100px;
  overflow-x: hidden;
  width: 100%;
  position: relative;
}

/* All views inherit same width */
.movie-list,
.poster-wall,
.stats-page {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
```

**Key difference from dual-layout:**
- No sidebar toggle
- No `@media (min-width: 900px)` for layout changes
- Desktop shows the same centered column
- Much fewer width bugs

## Small Screen Adjustments (≤380px)

```css
@media (max-width: 380px) {
  .header { padding: 12px 16px; }
  .header h1 { font-size: 18px; }
  .header-logo { width: 32px; height: 32px; }
  .header-sub { font-size: 11px; }
  .icon-btn { width: 36px; height: 36px; font-size: 16px; }

  .view-tabs { padding: 10px 16px; gap: 6px; }
  .view-tab { padding: 8px 6px; font-size: 12px; }

  .filter-bar { padding: 8px 16px; }
  .filter-select { padding: 8px 12px; font-size: 12px; }

  .main { padding: 8px 16px; }
  .movie-card { padding: 10px; gap: 8px; }
  .movie-card-poster { width: 48px; height: 70px; }
  .movie-card-title { font-size: 13px; }
  .movie-card-meta { font-size: 10px; }

  .poster-wall { gap: 8px; }

  .stats-hero { padding: 24px 16px; border-radius: 20px; }
  .stats-hero-num { font-size: 48px; }
  .stats-section { padding: 16px; border-radius: 20px; }
  .genre-bar-label, .year-bar-label { width: 44px; font-size: 12px; }
  .pie-chart { width: 160px; height: 160px; }

  .fab { right: 16px; bottom: 72px; width: 52px; height: 52px; font-size: 24px; }
  .settings-bar { padding: 16px; gap: 8px; }
  .btn-text { padding: 8px 14px; font-size: 11px; }
}
```

## Splash Screen (Inline HTML)

For instant render before React loads, put splash styles and markup directly in `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .splash-screen {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #F5EEF5 0%, #F8F5F2 50%, #FAF7F4 100%);
    }
    .splash-title {
      font-family: "Ma Shan Zheng", serif;
      font-size: 36px;
      color: #5A504A;
      letter-spacing: 0.15em;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="splash-screen">
      <!-- Splash content renders instantly -->
    </div>
  </div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

## Key Principles

1. **Mobile-first CSS** - Write mobile styles as default, enhance with `@media (min-width: Npx)` for desktop
2. **Single DOM tree** - Same HTML structure for both, CSS handles layout differences
3. **Desktop breakpoint** - 900px is a good threshold (tablet landscape and above)
4. **Explicit width/box-sizing** - Every desktop section MUST set `width: 100%`, `max-width: 100%`, `box-sizing: border-box`
5. **Higher-res images** - Use TMDB `w342` instead of `w154` for desktop cards
6. **Fixed poster height** - Set explicit `height: 260px` and `object-fit: cover` to prevent cutoff/overlap
7. **Sidebar navigation** - Desktop uses sidebar; mobile uses horizontal tabs (hide with `display: none` on mobile)
8. **Splash screen** - Inline HTML/CSS in index.html for instant brand render before JS loads
9. **All views same width** - Movie list, poster wall, and stats MUST share identical width rules
10. **Flex children need overflow:hidden** - Any `flex: 1` element without `overflow: hidden` will expand with long content and break mobile width
11. **Global overflow-x:hidden** - `html, body { overflow-x: hidden }` is the safety net
12. **Charts scrollable** - If bars exceed container width, use `overflow-x: auto` not clipping
