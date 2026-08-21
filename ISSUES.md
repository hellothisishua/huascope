# HuaScope — 问题报告（交给 WorkBuddy）

> **当前版本**: v5.0 桌面横屏版  
> **部署地址**: https://hellothisishua.github.io/huascope/  
> **项目目录**: `D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list`  
> **用户反馈**: 搜索弹窗行间距太窄、电影信息显示不完全、三视图边框对不齐

---

## 问题清单

### 问题 1：搜索弹窗行间距太窄
**现象**: 搜索电影时，每行结果挤在一起，文字被截断  
**位置**: `SearchModal.jsx` + `styles.css` 中 `.search-item` 相关样式  
**根因**: padding 太小（12px），行间距 gap 太小（8px），电影标题和简介显示空间不足

### 问题 2：电影信息显示不完全
**现象**: 搜索列表中电影标题、年份、简介显示不全  
**位置**: `.search-item-title`、`.search-item-overview`  
**根因**: 文字容器的 `min-width: 0` 配合 `text-overflow: ellipsis` 导致长文本被截断，但容器高度不够显示多行

### 问题 3：三视图边框对不齐（核心问题）
**现象**: 列表、海报墙、统计三个视图的左右边距不一致，视觉上边框没对齐  
**位置**: `.content-body` 与三个视图容器（`.list`、`.poster-wall`、`.stats`）  
**根因**: 
- `.content-body` 有 `padding: 24px 32px`
- 但 `.poster-wall` 的网格计算方式与 `.list` 的 flex 列宽度不一致
- `.stats` 内部卡片又有额外的 padding，导致有效内容区宽度不同

---

## 修复方案（给 WorkBuddy）

### 修复 1：搜索弹窗行间距
```css
/* 搜索项加大内边距和间距 */
.search-item {
  padding: 16px;        /* 从 12px 增加到 16px */
  gap: 14px;            /* 从 12px 增加到 14px */
}

.search-results {
  gap: 12px;            /* 从 8px 增加到 12px */
}

.search-item-img,
.search-item-placeholder {
  width: 54px;          /* 从 48px 增加到 54px */
  height: 80px;         /* 从 70px 增加到 80px */
}

.search-item-title {
  font-size: 15px;      /* 从 14px 增加到 15px */
  margin-bottom: 4px;
}

.search-item-overview {
  font-size: 12px;      /* 从 11px 增加到 12px */
  -webkit-line-clamp: 3; /* 从 2 行增加到 3 行 */
}
```

### 修复 2：三视图边框对齐
**核心原则**: 三个视图必须共享完全相同的可视宽度

```css
/* 1. 统一内容区 padding */
.content-body {
  padding: 20px 24px;  /* 固定值，三个视图共用 */
}

/* 2. 列表视图 — 不要额外 margin */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* 不要加 margin 或 padding，让它继承 content-body */
}

/* 3. 海报墙 — 网格对齐 */
.poster-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  /* 不要加额外 padding */
}

/* 4. 统计视图 — 卡片宽度 100% */
.stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;          /* 明确宽度 100% */
}

.stats-card {
  width: 100%;          /* 明确宽度 100% */
  box-sizing: border-box;
}
```

### 修复 3：验证方法
在浏览器 DevTools 中执行：
```javascript
// 检查三个视图的宽度是否一致
const list = document.querySelector('.list');
const poster = document.querySelector('.poster-wall');
const stats = document.querySelector('.stats');

if (list) console.log('list width:', list.offsetWidth);
if (poster) console.log('poster width:', poster.offsetWidth);
if (stats) console.log('stats width:', stats.offsetWidth);

// 三个值应该完全相同
```

---

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/styles.css` | 搜索弹窗 padding/gap 加大；三视图 padding 统一 |
| `src/components/SearchModal.jsx` | 无需改 CSS 即可，纯样式问题 |

---

## 部署命令
```bash
cd "D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list"
npm run build
git add -A
git commit -m "Fix: search spacing, view alignment"
git push
npx gh-pages -d dist -b gh-pages
```

---

**结束**
