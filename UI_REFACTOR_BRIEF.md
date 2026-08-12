# HuaScope 万花筒 — UI 重构需求文档

> **优先级**: 🔴 最高  
> **状态**: 待执行  
> **提交人**: 用户  
> **目标模型**: WorkBuddy Agent

---

## 1. 项目背景

HuaScope 万花筒是一个电影追踪应用，有三个视图：
- 列表视图（电影卡片列表）
- 海报墙（3 列海报网格）
- 统计（图表和数据）

**当前问题**: 手机端（iOS Safari / Android Chrome）列表视图仍然出现横向溢出（页面可以被左右滑动），而海报墙和统计页正常。

**已尝试但失败的修复**:
- 给 body / app 加 `overflow-x: hidden` → iOS Safari 不生效
- 缩小卡片尺寸 → 三个视图不协调
- 给 flex 子元素加 `min-width: 0` → 已加但问题仍在

**本次要求**: 彻底重构 CSS，重新构建全新的、统一的 UI 布局系统，从根本上解决溢出问题。

---

## 2. 目标状态

### 手机端（≤480px）
- ✅ 三个视图（列表/海报墙/统计）宽度完全一致
- ✅ 无任何横向溢出（不能左右滑动）
- ✅ 视觉协调，不会某个视图明显更窄
- ✅ 卡片、文字、图片都不超出屏幕

### 桌面端（≥480px）
- ✅ 竖屏居中显示（不需要横屏布局）
- ✅ 最大宽度 500px，居中

---

## 3. 技术约束

### 3.1 必须遵守的 CSS 规则

```css
/* 1. 全局防溢出（iOS Safari 兼容） */
html, body {
  overflow-x: hidden;
  max-width: 100%;
  -webkit-text-size-adjust: 100%;
}

/* 2. 主容器 */
.app {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  overflow: hidden;  /* 不是 overflow-x: hidden */
  position: relative;
}

/* 3. 所有 flex 容器 */
display: flex;

/* 4. 所有 flex 子元素（必须！） */
flex-child {
  min-width: 0;        /* 防止撑宽 */
  overflow: hidden;    /* 防止溢出 */
}

/* 5. 所有文本元素 */
text-element {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 6. 所有容器 */
container {
  max-width: 100%;
  box-sizing: border-box;
}

/* 7. 固定宽度元素（不缩小） */
fixed-element {
  flex-shrink: 0;
}
```

### 3.2 禁止事项

```css
/* ❌ 不要用 overflow-x: hidden（iOS Safari 不生效） */
/* ❌ 不要省略 flex 子元素的 min-width: 0 */
/* ❌ 不要用 position: absolute 做布局 */
/* ❌ 不要用负 margin 做溢出隐藏 */
/* ❌ 不要给卡片设置固定宽度（如 width: 300px） */
/* ❌ 不要用 display: grid 做卡片列表（用 flex column） */
```

### 3.3 文件修改范围

| 文件 | 是否修改 | 说明 |
|------|----------|------|
| `src/styles.css` | ✅ 重写 | 全部 CSS 样式 |
| `src/App.jsx` | ❌ 不动 | 保持现有逻辑 |
| `src/components/*.jsx` | ❌ 不动 | 保持现有组件 |
| `src/lib/*.jsx` | ❌ 不动 | 保持现有逻辑 |
| `index.html` | ❌ 不动 | 保持现有结构 |
| `vite.config.js` | ❌ 不动 | 保持现有配置 |

---

## 4. 设计规范

### 4.1 颜色系统
```css
:root {
  --clay-rose: #E8C5C5;
  --clay-rose-deep: #D4A5A5;
  --clay-sage: #B5C5B5;
  --clay-sage-deep: #95B595;
  --clay-blue: #B5B5D6;
  --clay-lavender: #C5B5D6;
  --clay-cream: #E8D8C8;
  --clay-warm: #D4B595;
  --clay-surface: #F8F5F2;
  --clay-surface-2: #F0EBE6;
  --clay-surface-3: #E5DDD5;
  --clay-border: #E0D8D0;
  --text: #5A504A;
  --text-dim: #8A8078;
  --text-faint: #B5AFA8;
}
```

### 4.2 圆角
```css
--radius-sm: 12px;    /* 小元素 */
--radius-md: 18px;    /* 按钮、输入框 */
--radius-lg: 24px;    /* 卡片 */
--radius-xl: 32px;    /* 弹窗 */
--radius-pill: 999px; /* 胶囊 */
```

### 4.3 间距系统
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 12px;
--space-lg: 16px;
--space-xl: 20px;
--space-2xl: 24px;
```

### 4.4 阴影
```css
--shadow-sm: 0 2px 4px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.06);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
```

---

## 5. 组件样式规范

### 5.1 头部 (Header)
```css
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 245, 242, 0.92);
  backdrop-filter: blur(20px);
  padding: var(--space-md) var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--clay-border);
  overflow: hidden;
  max-width: 100%;
}
```

### 5.2 视图标签栏 (View Tabs)
```css
.view-tabs {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  overflow: hidden;
  max-width: 100%;
}
.view-tab {
  flex: 1;
  padding: var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 5.3 筛选栏 (Filter Bar)
```css
.filter-bar {
  padding: var(--space-sm) var(--space-xl);
  overflow: hidden;
  max-width: 100%;
}
.filter-row {
  display: flex;
  gap: var(--space-sm);
  max-width: 100%;
  overflow: hidden;
}
.filter-select {
  flex: 1;
  min-width: 0;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
}
```

### 5.4 主内容区 (Main)
```css
.main {
  padding: var(--space-sm) var(--space-xl);
  overflow: hidden;
  width: 100%;
  max-width: 100%;
}
```

### 5.5 电影卡片 (Movie Card)
```css
.movie-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 100%;
  overflow: hidden;
}
.movie-card {
  display: flex;
  gap: var(--space-md);
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  max-width: 100%;
  overflow: hidden;
}
.movie-card-left {
  flex-shrink: 0;
}
.movie-card-poster {
  width: 68px;
  height: 100px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--clay-surface-2);
}
.movie-card-body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.movie-card-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 5.6 海报墙 (Poster Wall)
```css
.poster-wall {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
  width: 100%;
  max-width: 100%;
}
.poster-wall-item {
  aspect-ratio: 2/3;
  border-radius: var(--radius-md);
  overflow: hidden;
  min-width: 0;
  position: relative;
}
```

### 5.7 统计 (Stats)
```css
.stats-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
.stats-hero {
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl) var(--space-xl);
  text-align: center;
  max-width: 100%;
}
.stats-section {
  background: var(--clay-surface);
  border: 1px solid var(--clay-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  max-width: 100%;
  overflow: hidden;
}
```

---

## 6. 验证标准

### 6.1 功能验证
- [ ] 手机端（375px 宽）打开无横向滚动
- [ ] 手机端（414px 宽）打开无横向滚动
- [ ] 手机端（480px 宽）打开无横向滚动
- [ ] 三个视图切换后宽度一致
- [ ] 列表卡片文字过长时显示省略号
- [ ] 海报墙 3 列网格正常
- [ ] 统计页图表不溢出

### 6.2 CSS 验证
```bash
# 构建后检查
npm run build

# 检查是否有 text: 拼写错误
grep -n "text:" dist/assets/*.css | grep -v "text-align\|text-decoration\|text-transform\|text-shadow\|text-indent\|text-overflow\|text-rendering\|text-size-adjust"

# 检查是否有 overflow-x: hidden（不应该出现）
grep -n "overflow-x: hidden" dist/assets/*.css

# 检查是否有 min-width: 0（应该有多个）
grep -c "min-width: 0" dist/assets/*.css
```

### 6.3 浏览器验证
- [ ] iOS Safari (iPhone)
- [ ] Android Chrome
- [ ] Chrome DevTools 手机模拟

---

## 7. 交付物

1. 修改后的 `src/styles.css`（完整重写）
2. 确保 `npm run build` 成功
3. 确保 CSS 验证通过（无 `text:` 错误，无 `overflow-x: hidden`）
4. 部署到 GitHub Pages

---

## 8. 注意事项

1. **不要修改任何 JS 文件**，只改 CSS
2. **不要添加桌面端布局**，保持竖屏居中
3. **不要删除现有颜色变量**，保持莫兰迪色系
4. **不要改变组件结构**，只改样式
5. **构建后必须验证 CSS**，确保无拼写错误

---

## 9. 如果仍然溢出的排查清单

如果部署后仍然溢出，请按以下顺序排查：

1. **检查是否有 `text:` 拼写错误** → `grep -n "text:" dist/assets/*.css`
2. **检查是否有 `overflow-x: hidden`** → 改为 `overflow: hidden`
3. **检查 flex 子元素是否有 `min-width: 0`** → 所有 flex 子元素必须加
4. **检查是否有固定宽度** → 所有宽度用百分比或 `max-width`
5. **检查是否有 `white-space: nowrap` 缺失** → 文本元素必须加
6. **检查是否有 `overflow: hidden` 缺失** → 容器必须加

---

**文档结束**
