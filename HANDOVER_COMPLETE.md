# HuaScope 万花筒 — 项目交接文档（完整版）

> **最后更新**: 2026-08-12  
> **文档用途**: 全新 WorkBuddy / Hermes 模型交接  
> **项目状态**: 已部署，可正常使用

---

## 1. 项目概述

**HuaScope 万花筒** 是一个个人观影记录管理 Web 应用，帮助用户追踪看过的电影、管理想看清单、生成数据统计。

### 核心功能
- 搜索电影（通过 TMDB API）
- 添加观影记录（状态：想看/在看/看过）
- 为电影评分（1-5 星）、写影评、记录观看时间和地点
- 海报墙展示（3 列网格）
- 数据统计分析（类型偏好饼图、导演/演员榜、观影趋势）
- 随机抽一部电影（从已看过的电影中随机推荐）
- 分享观影清单（生成分享码）
- 导出/导入数据（JSON 格式）

### 技术栈
| 类别 | 技术 |
|------|------|
| 框架 | React 18 + Vite 5 |
| 样式 | 纯 CSS（莫兰迪色系，粘土风圆角阴影） |
| 数据库 | Supabase（PostgreSQL + Auth） |
| 外部 API | TMDB（电影数据、海报、搜索） |
| 字体 | Ma Shan Zheng（瘦金体）、Playfair Display、Noto Serif SC |
| 部署 | GitHub Pages（gh-pages 分支） |

---

## 2. 仓库与部署

| 项目 | 地址 |
|------|------|
| GitHub 仓库 | https://github.com/hellothisishua/huascope |
| 部署地址 | https://hellothisishua.github.io/huascope/ |
| 托管平台 | GitHub Pages |
| Vite base | `/huascope/` |

### 常用命令
```bash
# 安装依赖
npm install

# 本地开发（http://localhost:5173）
npm run dev

# 构建生产包
npm run build

# 部署到 GitHub Pages
npx gh-pages -d dist -b gh-pages
```

---

## 3. 外部服务配置

### 3.1 Supabase
| 配置项 | 值 |
|--------|-----|
| URL | `https://oulchvefqobqoikpnowc.supabase.co` |
| Publishable Key | `sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK` |
| 认证方式 | 邮箱密码（无邮箱确认） |
| RLS | **已关闭**（`relrowsecurity = false`） |

### 3.2 TMDB (The Movie Database)
| 配置项 | 值 |
|--------|-----|
| API Key | `02c952df054afb8ca11440a0f84b080a` |
| API 地址 | `https://api.themoviedb.org/3` |
| 海报地址 | `https://image.tmdb.org/t/p/w342/{poster_path}` |
| 网络限制 | **API 需 VPN**，**海报可直接访问** |

### 3.3 数据库表结构

#### `movies` 表
```sql
CREATE TABLE movies (
  id bigint PRIMARY KEY,              -- TMDB 电影 ID（非自增）
  user_id uuid NOT NULL,              -- 用户 ID（多用户隔离）
  status text DEFAULT 'want',         -- 状态: want / watching / watched
  rating integer DEFAULT 0,           -- 评分: 1-5
  review text DEFAULT '',             -- 影评内容
  added_at timestamp DEFAULT now(),   -- 添加时间
  watched_date text DEFAULT '',       -- 观看时间（YYYY-MM 格式）
  location text DEFAULT '',           -- 观看地点
  movie_data jsonb NOT NULL           -- TMDB 电影详情 JSON
);
```

#### `movie_data` JSON 结构示例
```json
{
  "id": 550,
  "title": "Fight Club",
  "titleCn": "搏击俱乐部",
  "originalTitle": "Fight Club",
  "year": "1999",
  "poster": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "backdrop": null,
  "overview": "一个失眠症碰到了一个卖肥皂的商人...",
  "rating": 8.4,
  "runtime": 139,
  "genres": ["剧情", "悬疑"],
  "director": "大卫·芬奇",
  "cast": ["布拉德·皮特", "爱德华·诺顿", "海伦娜·伯翰·卡特"]
}
```

### 3.4 地点选项
家里、电影院、飞机上、高铁上、酒店、度假、通勤路上、出租屋、视频拉片

### 3.5 用户账号
- **主力账号**: 2295655628@qq.com
- 另有备用邮箱一个

---

## 4. 文件结构

```
cine-list/
├── index.html                  # 入口 HTML（含 splash 加载界面）
├── vite.config.js              # Vite 配置（base、TMDB key）
├── package.json                # 依赖配置
├── src/
│   ├── main.jsx                # React 入口
│   ├── App.jsx                 # 主组件（认证、视图切换、数据管理）
│   ├── styles.css              # 全局样式（莫兰迪色系）
│   ├── lib/
│   │   ├── store.jsx           # Supabase 数据层 + AuthProvider
│   │   └── tmdb.js             # TMDB API（搜索/详情/类似电影）
│   └── components/
│       ├── AuthScreen.jsx      # 登录/注册界面
│       ├── FilterBar.jsx       # 筛选栏（状态/年份/类型/排序）
│       ├── MovieCard.jsx       # 电影卡片 + 详情弹窗
│       ├── PosterWall.jsx      # 海报墙（3列网格）
│       ├── MoviesChart.jsx     # 统计页（饼图/柱状图/排行榜）
│       ├── RandomPick.jsx      # 随机抽一部
│       ├── SearchModal.jsx     # 搜索弹窗
│       ├── ShareModal.jsx      # 分享码生成
│       └── YearSummary.jsx     # 年度总结（未使用）
└── api/                        # Cloudflare Workers（已弃用）
```

---

## 5. 核心代码逻辑

### 5.1 数据流（App.jsx）

```
用户登录 → AuthProvider 监听 Supabase auth 状态
    ↓
登录成功 → loadMovies(user.id) 从 movies 表加载数据
    ↓
数据存入 movies state → 用户操作（添加/编辑/删除）
    ↓
更新 Supabase → 同步更新本地 state → 重新渲染
```

### 5.2 视图切换
```javascript
const VIEWS = { list: 'list', poster: 'poster', stats: 'stats' };
const [view, setView] = useState(VIEWS.list);

// 视图渲染
{view === VIEWS.list && <div className="movie-list">...</div>}
{view === VIEWS.poster && <PosterWall movies={filtered} />}
{view === VIEWS.stats && <MoviesChart movies={movies} />}
```

### 5.3 数据加载（store.jsx）
```javascript
export async function loadMovies(userId) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  return data.map(rowToEntry).filter(Boolean);
}

// DB 行 → 前端 entry 格式
function rowToEntry(row) {
  const movie = row.movie_data || {};
  return {
    id: row.id,
    status: row.status,
    rating: row.rating,
    review: row.review,
    addedAt: row.added_at,
    watchedDate: row.watched_date,
    location: row.location,
    movie: {
      id: movie.id,
      title: movie.title || '未知电影',
      year: movie.year || '—',
      poster: movie.poster,
      overview: movie.overview,
      director: movie.director,
      cast: movie.cast,
      genres: movie.genres,
      runtime: movie.runtime,
    },
  };
}
```

### 5.4 分享码格式
```javascript
// 编码: Base64(URIencode("id:status:rating,id:status:rating,..."))
export function encodeShare(movies) {
  const ids = movies.map(m => `${m.id}:${m.status}:${m.rating}`).join(',');
  return btoa(encodeURIComponent(ids));
}

// 解码
export function decodeShare(encoded) {
  const ids = decodeURIComponent(atob(encoded));
  return ids.split(',').map(s => {
    const [id, status, rating] = s.split(':');
    return { id: Number(id), status, rating: Number(rating) };
  }).filter(e => e.id > 0);
}
```

### 5.5 TMDB API（tmdb.js）
```javascript
const BASE = 'https://api.themoviedb.org/3';
const KEY = import.meta.env.VITE_TMDB_KEY;

// 搜索电影
export async function searchMovies(query) {
  return tmdb('/search/movie', { query, language: 'zh-CN' });
}

// 获取电影详情（含 credits）
export async function getMovie(id) {
  return tmdb(`/movie/${id}`, { append_to_response: 'credits', language: 'zh-CN' });
}

// 获取类似电影
export async function getSimilarMovies(id) {
  return tmdb(`/movie/${id}/similar`, { language: 'zh-CN' });
}

// 格式化原始数据
export function formatMovie(raw) {
  const directors = (raw.credits?.crew?.filter(c => c.job === 'Director') || []).map(c => c.name);
  const cast = (raw.credits?.cast?.slice(0, 10) || []).map(c => c.name);
  return {
    id: raw.id,
    title: raw.title,
    titleCn: raw.title,
    originalTitle: raw.original_title,
    year: raw.release_date?.slice(0, 4),
    poster: raw.poster_path,
    backdrop: raw.backdrop_path,
    overview: raw.overview || '暂无简介',
    rating: raw.vote_average,
    runtime: raw.runtime,
    genres: (raw.genres || []).map(g => g.name),
    director: directors.join('、'),
    cast,
  };
}

// 海报 URL
export function posterUrl(path, size = 'w342') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
```

---

## 6. UI 设计规范

### 6.1 CSS 颜色变量
```css
:root {
  --clay-rose: #E8C5C5;        /* 主色 - 暖粉 */
  --clay-rose-deep: #D4A5A5;   /* 深粉 */
  --clay-sage: #B5C5B5;        /* 青绿 */
  --clay-sage-deep: #95B595;   /* 深绿 */
  --clay-blue: #B5B5D6;        /* 蓝灰 */
  --clay-lavender: #C5B5D6;    /* 薰衣草 */
  --clay-cream: #E8DCC8;       /* 奶油色 */
  --clay-warm: #D4B595;        /* 暖棕 */
  --clay-surface: #F8F5F2;     /* 表面色（卡片背景） */
  --clay-surface-2: #F0EBE6;   /* 次级表面 */
  --clay-surface-3: #E5DDD5;   /* 三级表面 */
  --clay-border: #E0D8D0;      /* 边框 */
}
```

### 6.2 文字颜色
```css
--text: #5A504A;        /* 主文字 */
--text-dim: #8A8078;    /* 次要文字 */
--text-faint: #B5AFA8;  /* 弱化文字 */
```

### 6.3 圆角
```css
--radius: 18px;      /* 小元素（按钮、输入框） */
--radius-lg: 24px;   /* 卡片 */
--radius-xl: 32px;   /* 弹窗 */
--radius-pill: 999px; /* 胶囊形 */
```

### 6.4 阴影
```css
--shadow-clay: 0 2px 4px rgba(150,130,120,0.08), 0 8px 24px rgba(150,130,120,0.06);
--shadow-clay-hover: 0 4px 8px rgba(150,130,120,0.1), 0 16px 32px rgba(150,130,120,0.08);
--shadow-puffy: 0 2px 0 rgba(150,130,120,0.05), 0 8px 20px rgba(150,130,120,0.08);
```

### 6.5 布局规范
- **最大宽度**: 500px（居中）
- **内边距**: 20px
- **卡片间距**: 12px
- **圆角**: 24px（卡片）、18px（按钮）、999px（胶囊）

### 6.6 字体
```css
/* 标题（中文） */
font-family: "Ma Shan Zheng", "Noto Serif SC", serif;

/* 标题（英文） */
font-family: "Playfair Display", "Ma Shan Zheng", serif;

/* 正文 */
font-family: "Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif;
```

---

## 7. 已知问题与解决方案

### 7.1 CSS 拼写错误导致白屏 ⚠️
**问题**: `text: center`（应为 `text-align: center`）导致浏览器跳过整个 CSS 规则。
**解决**: 构建后用 `grep -n "text:" dist/assets/*.css | grep -v "text-align"` 检查。

### 7.2 iOS Safari 横向溢出
**问题**: iOS Safari 对 `overflow-x: hidden` 支持有 bug。
**解决**: 
- `html, body { overflow-x: hidden }`
- `.app { overflow: hidden }`（不要只写 `overflow-x`）
- 所有 flex 子元素加 `min-width: 0`
- 所有容器加 `max-width: 100%`

### 7.3 TMDB API 被墙
**问题**: `api.themoviedb.org` 在中国大陆被墙。
**解决**: 搜索功能需 VPN，但海报图片 `image.tmdb.org` 可直接访问。

### 7.4 Supabase RLS
**问题**: RLS 未关闭时，INSERT/UPDATE/DELETE 返回 400。
**解决**: 已通过 Supabase 控制台关闭 RLS（`relrowsecurity = false`）。

### 7.5 GitHub Pages base 路径
**问题**: 设置 `base: '/'` 导致资源 404。
**解决**: `vite.config.js` 中 `base` 必须设为 `/huascope/`。

### 7.6 浏览器缓存
**问题**: 部署后用户仍看到旧版本。
**解决**: 强制刷新（Ctrl+Shift+R）。

### 7.7 海报墙 hover 覆盖层
**问题**: PosterWall.jsx 引用了 `.poster-wall-overlay` 但 CSS 缺失。
**解决**: 在 styles.css 中添加 `.poster-wall-overlay` 相关样式。

### 7.8 统计页"按年份"柱状图缺失 CSS
**问题**: `.year-bar` 系列样式缺失，只显示文字。
**解决**: 添加 `.year-bar`、`.year-bar-label`、`.year-bar-track`、`.year-bar-fill`、`.year-bar-num` 样式。

---

## 8. 组件说明

| 组件 | 功能 | 关键 Props |
|------|------|------------|
| `AuthScreen` | 登录/注册 | - |
| `FilterBar` | 筛选栏 | `status`, `year`, `genre`, `sort`, 回调函数 |
| `MovieCard` | 电影卡片 + 详情弹窗 | `entry`, `onClick`, `onStatusChange`, `isDetail`, `onClose`, `onUpdate`, `onRemove` |
| `PosterWall` | 海报墙 | `movies`, `onClick` |
| `MoviesChart` | 统计页 | `movies` |
| `RandomPick` | 随机抽一部 | `movies`, `onClose` |
| `SearchModal` | 搜索弹窗 | `onClose`, `onSelect`, `existingIds`, `searchFn` |
| `ShareModal` | 分享码 | `movies`, `onClose` |

---

## 9. 环境变量

在 `vite.config.js` 中硬编码：
```javascript
define: {
  'import.meta.env.VITE_TMDB_KEY': JSON.stringify('02c952df054afb8ca11440a0f84b080a'),
}
```

在 `src/lib/store.jsx` 中硬编码：
```javascript
const URL = 'https://oulchvefqobqoikpnowc.supabase.co';
const KEY = 'sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK';
```

---

## 10. 开发指南

### 10.1 本地开发
```bash
cd cine-list
npm install
npm run dev
# 打开 http://localhost:5173
```

### 10.2 构建
```bash
npm run build
# 输出到 dist/
```

### 10.3 部署
```bash
npx gh-pages -d dist -b gh-pages
```

### 10.4 检查 CSS 错误
```bash
npm run build
grep -n "text:" dist/assets/*.css | grep -v "text-align"
```

### 10.5 检查 JS 错误
```bash
npm run build
node -e "try { new Function(require('fs').readFileSync('dist/assets/index-*.js', 'utf8')); console.log('JS OK'); } catch(e) { console.log('JS Error:', e.message); }"
```

---

## 11. 测试清单

- [ ] 登录/注册功能正常
- [ ] 搜索电影（需 VPN）
- [ ] 添加电影到想看/在看/看过
- [ ] 编辑电影（评分、影评、观看时间、地点）
- [ ] 删除电影
- [ ] 海报墙显示正常
- [ ] 统计页图表正常
- [ ] 随机抽一部功能正常
- [ ] 分享码生成/导入正常
- [ ] 导出 JSON 正常
- [ ] 手机端无横向滚动
- [ ] 三个视图宽度一致
- [ ] 强制刷新后显示最新内容

---

## 12. 未来优化建议

1. **TMDB 搜索代理**: 添加后端代理解决 VPN 问题
2. **电影封面缓存**: 本地缓存封面图片
3. **离线模式**: 支持离线查看已添加的电影
4. **多语言**: 支持英文界面
5. **深色模式**: 添加深色主题切换
6. **数据迁移**: 支持从其他平台导入数据

---

## 13. 联系方式

- **GitHub**: https://github.com/hellothisishua
- **项目 Issues**: https://github.com/hellothisishua/huascope/issues

---

**文档结束** 🌸
