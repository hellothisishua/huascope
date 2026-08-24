# HuaScope 万花筒 · 转接文档

## 项目概览
- **仓库**: https://github.com/hellothisishua/huascope
- **部署**: https://hellothisishua.github.io/huascope/ (GitHub Pages, branch `gh-pages`)
- **本地目录**: `D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list`
- **技术栈**: React 18 + Vite + Supabase (PostgreSQL + Auth) + TMDB API
- **用户**: 2295655628@qq.com（主账号，功能正常）

## 当前状态：基本可用，分享功能有缺陷

### ✅ 正常工作
- 登录/注册（Supabase Auth，邮箱+密码）
- 电影搜索（需 VPN，TMDB API 被墙）
- 添加电影（想看/在看/看过）
- 详情弹窗：状态切换、评分、观看时间（年+月）、短评、删除
- 统计图表：趋势/类型/导演/演员/年份/一键刷新
- 导出 JSON
- 随机抽一部
- 侧边栏桌面布局

### ❌ 分享功能 — 核心问题
**现象**: 生成分享码（如"约翰内斯堡的季风"），换账号粘贴后提示"无效的分享码"。

**根因**: `handleImport` 函数在 `modals` 组件内部定义，但 `importOpen` 弹窗被放在了 `modals` 之外（在 `return` 的 JSX 里单独渲染），导致 `handleImport` 闭包里的 `importCode` 是空值，永远导入失败。

**修复方向**: 把导入弹窗移回 `modals` 组件内，或把 `handleImport` 的依赖改为从 `modals` 外部传入。

**相关文件**:
- `src/App.jsx` — 第 199-246 行是 `modals`，第 223+ 行是独立的 import 弹窗
- `src/lib/store.jsx` — `encodeShare`/`decodeShare` 已改为存 Supabase `share_code` 表，存完整电影数据（不再需要 TMDB）
- `src/components/ShareModal.jsx` — 分享 UI，城市+天气中文短语

## Supabase
- URL: `https://oulchvefqobqoikpnowc.supabase.co`
- Key: `sb_publishable_vKytZ6B9BYKnWDe2X3vZtw_LUqDxMFK`
- `share_code` 表已建（code text PK, data jsonb, created_at timestamptz），RLS 已关
- `movies` 表有 `watched_date` 字段，RLS 已关

## TMDB
- API Key: `02c952df054afb8ca11440a0f84b080a`（硬编码在 `vite.config.js`）
- `api.themoviedb.org` 在中国需 VPN
- `image.tmdb.org` 可直接访问（海报用这个）

## 已知限制
- TMDB 搜索需 VPN
- 分享码接收端需要对方也有 HuaScope 账号（目前没有公开导入入口）
- Cloudflare Pages 在中国不稳定（已放弃）

## 关键文件
| 文件 | 说明 |
|------|------|
| `src/App.jsx` | 主组件，含 auth gate、view 切换、所有 modal |
| `src/lib/store.jsx` | Supabase 数据层 + AuthProvider + 分享码 |
| `src/lib/tmdb.js` | TMDB API 封装 |
| `src/components/SearchModal.jsx` | 搜索弹窗（含状态选择） |
| `src/components/MovieCard.jsx` | 详情弹窗（状态/评分/时间/短评/删除） |
| `src/components/MoviesChart.jsx` | 统计图表 |
| `src/components/ShareModal.jsx` | 分享弹窗 |
| `src/components/AuthScreen.jsx` | 登录/注册 |
| `src/styles.css` | 莫兰迪色系 + 瘦金体 |
| `vite.config.js` | `base: '/huascope/'`，TMDB key define |

## 构建部署
```bash
cd cine-list
npm run build
npx gh-pages -d dist -b gh-pages
git add -A && git commit -m "..." && git push
```

## 用户沟通偏好
- 中文，大白话，直接给方案
- 不要解释"为什么"，直接做
- 做不到就说做不到
- UI 改动不能删已有功能
- 用户愤怒时给解决方案，不解释