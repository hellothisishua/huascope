# HuaScope 万花筒 — 项目交接文档

## 项目概述
HuaScope 万花筒 — 个人观影记录管理 Web 应用。
功能：搜索电影 → 添加观影记录（状态/评分/影评/观看时间/地点）→ 海报墙展示 → 数据统计（类型偏好、导演/演员榜、观影趋势）。

## 仓库与部署
- **GitHub 仓库**: https://github.com/hellothisishua/huascope
- **部署地址**: https://hellothisishua.github.io/huascope/
- **托管平台**: GitHub Pages（gh-pages 分支）
- **构建命令**: `npm run build` → `npx gh-pages -d dist -b gh-pages`
- **Vite base**: `/huascope/`

## 技术栈
- **框架**: React 18 + Vite 5
- **样式**: 纯 CSS（莫兰迪色系 + 粘土风圆角阴影）
- **数据库**: Supabase（PostgreSQL + Auth）
- **API**: TMDB（电影海报/详情/搜索）
- **字体**: Ma Shan Zheng（瘦金体）、Playfair Display、Noto Serif SC

## 外部服务配置

### Supabase
- **URL**: `https://oulchvefqobqoikpnowc.supabase.co`
- **Publishable Key**: `sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK`
- **RLS**: 已关闭（`relrowsecurity = false`）
- **登录方式**: 邮箱密码（无邮箱确认）

### TMDB
- **API Key**: `02c952df054afb8ca11440a0f84b080a`（硬编码在 vite.config.js 的 define 中）
- **海报地址**: `https://image.tmdb.org/t/p/w342/{poster_path}`（手机可直接访问）
- **API 地址**: `https://api.themoviedb.org/3`（需 VPN）

### 数据库 movies 表结构
```sql
CREATE TABLE movies (
  id bigint PRIMARY KEY,              -- TMDB 电影 ID
  user_id uuid NOT NULL,              -- 用户 ID（多用户隔离）
  status text DEFAULT 'want',         -- want / watching / watched
  rating integer DEFAULT 0,           -- 1-5 星
  review text DEFAULT '',             -- 影评
  added_at timestamp DEFAULT now(),   -- 添加时间
  watched_date text DEFAULT '',       -- 观看时间（YYYY-MM 格式）
  location text DEFAULT '',           -- 观看地点
  movie_data jsonb NOT NULL           -- TMDB 电影详情 JSON
);
```

### 地点选项
家里、电影院、飞机上、高铁上、酒店、度假、通勤路上、出租屋、视频拉片

## 项目文件结构
```
cine-list/
├── index.html              # 入口 HTML（含 splash 加载界面样式）
├── vite.config.js          # Vite 配置（base、TMDB key）
├── src/
│   ├── main.jsx            # React 入口
│   ├── App.jsx             # 主组件（认证、视图切换、数据处理）
│   ├── styles.css          # 全局样式（莫兰迪色系）
│   ├── lib/
│   │   ├── store.jsx       # Supabase 数据层 + AuthProvider
│   │   └── tmdb.js         # TMDB API（搜索/详情/类似电影）
│   └── components/
│       ├── AuthScreen.jsx      # 登录/注册
│       ├── SearchModal.jsx     # 搜索弹窗（状态选择 + 添加按钮）
│       ├── MovieCard.jsx       # 卡片组件 + 详情弹窗
│       ├── PosterWall.jsx      # 海报墙（3列网格）
│       ├── MoviesChart.jsx     # 统计页（饼图/柱状图/排行榜）
│       ├── RandomPick.jsx      # 随机抽一部
│       ├── ShareModal.jsx      # 分享码生成
│       ├── FilterBar.jsx       # 筛选栏
│       └── YearSummary.jsx     # 年度总结
└── api/                    # API 路由（Cloudflare Workers，已弃用）
```

## 核心代码逻辑

### 数据流（App.jsx）
1. `AuthProvider` 监听 Supabase auth 状态
2. 登录后 `loadMovies(user.id)` 加载 movies 表
3. 状态: `movies`（原始数据）、`filtered`（筛选后）、`view`（当前视图）
4. 三个视图: `VIEWS.list` / `VIEWS.poster` / `VIEWS.stats`

### 数据存储格式（movie_data jsonb）
```json
{
  "id": 550,
  "title": "Fight Club",
  "titleCn": "搏击俱乐部",
  "year": "1999",
  "poster": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "backdrop": null,
  "overview": "简介...",
  "rating": 8.4,
  "runtime": 139,
  "genres": ["剧情", "悬疑"],
  "director": "大卫·芬奇",
  "cast": ["布拉德·皮特", "爱德华·诺顿"]
}
```

### 分享码格式
Base64(URIencode(`id:status:rating,id:status:rating,...`))

## 已知问题与教训

### CSS
- ⚠️ CSS 中不能出现 `text:` 这种不完整的属性名（必须是 `text-align`、`text-decoration` 等），否则浏览器会跳过整个CSS规则块
- ⚠️ 选择器不能省略 `.` 前缀（如 `auth-switch` 应为 `.auth-switch`），否则无效

### 网络
- ⚠️ `api.themoviedb.org` 在中国大陆被墙，需 VPN 才能搜索
- ⚠️ `image.tmdb.org` 在中国大陆可正常访问（海报图）
- ⚠️ `workers.dev` 域名在中国大陆被墙，不要用 Cloudflare Workers 代理

### 部署
- ⚠️ GitHub Pages base 必须是 `/huascope/`（与仓库名一致）
- ⚠️ 部署后需强制刷新（Ctrl+Shift+R）才能看到最新内容
- ⚠️ gh-pages 分支是发布分支，main 分支是源码分支

### React
- ⚠️ hooks 不能在条件 return 之后声明，否则会报错
- ⚠️ write_file 重写 React 组件时必须保留所有模块级常量（如 STATUS_MAP），否则会导致 ReferenceError 白屏

### 数据库
- ⚠️ movies 表的 `id` 是 bigint（TMDB ID），不是自增
- ⚠️ `watched_date` 字段是 text 类型，存储 `YYYY-MM` 格式
- ⚠️ RLS 已关闭，任何用户都可以读写所有数据（通过 user_id 逻辑隔离）

## 用户账号
- **主力账号**: 2295655628@qq.com
- 另有备用邮箱一个

## 当前 UI 状态
- **布局**: 统一手机竖屏布局（max-width: 500px，居中）
- **配色**: 莫兰迪色系（米白 #F8F5F2 + 暖粉 #D4A5A5 + 青绿 #95B595）
- **字体**: 标题用瘦金体 Ma Shan Zheng，正文用 Noto Serif SC
- **阴影**: 柔和多层粘土风阴影

## 待修复 / 待优化
1. 统计页"按年份"柱状图已修复 CSS（.year-bar 系列），需验证显示效果
2. 电脑端打开也是竖屏居中，非横屏布局
3. TMDB 搜索需 VPN，可考虑添加代理或提示
4. 统计页"更新所有电影信息"按钮会刷新页面，体验可优化

## 常用命令
```bash
npm install          # 安装依赖
npm run dev          # 本地开发
npm run build        # 构建生产包
npx gh-pages -d dist -b gh-pages   # 部署到 GitHub Pages
```
