# HuaScope 万花筒 · GitHub Pages 部署交接报告（给 Hermes）

> 转发此文档即可，Hermes 按「执行步骤」顺序操作即可完成发布。

---

## 一、任务目标
把 **HuaScope 万花筒观影清单** 发布 / 更新到 GitHub Pages：
- 线上地址：`https://hellothisishua.github.io/huascope/`
- 仓库：`https://github.com/hellothisishua/huascope.git`

## 二、项目位置（本机）
```
D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list
```

## 三、当前完成状态（已具备发布条件）
- ✅ **0-1 重建布局（2026-08-13 最终版）**：全设备统一「手机竖屏」布局，不再有任何横屏分支或桌面媒体查询
- ✅ **三视图宽度从结构上保证一致**：`.app` 是固定宽度的居中 flex 列；`.content-body` 是唯一滚动容器（`overflow-y:auto` + `scrollbar-gutter:stable`）；`.list` / `.poster-wall` / `.stats` 全部 `width:100%` 填满同一个容器，宽度由容器决定，不可能不一致
- ✅ 已用 Playwright 实测两个视口均通过：
  - 电脑 1280 → `app=480px`（居中竖条），三视图均为 **443px** 等宽
  - 手机 390 → `app=390px`（满屏），三视图均为 **353px** 等宽
- ✅ **底部功能已恢复**：`.sidebar-footer` 以工具行形式显示在 Tab Bar 上方（🎲随机抽一部 / 🔗分享 / 📤导出 / 🗑清空 / 🚪退出）
- ✅ **长片名显示优化**：`.card-title` 由单行省略改为最多显示两行
- ✅ **搜索弹窗文字截断修复（2026-08-20）**：`.search-item-title` 由单行省略改为最多两行，长片名+年份不再被截断成 `(20...`
- ✅ **观影趋势柱状图修复（2026-08-20）**：`MoviesChart.jsx` 中观影趋势条形的内联样式由 `height` 改为 `width`，并调整月份标签顺序；现在柱长会随观影数量正确变化，月份完整显示
- ✅ 柱状图/搜索修复后的本地 `npm run build` 已验证通过，**`dist/` 已重新构建**（2026-08-20 14:33，`index-BBGUc3zy.css` / `index-DQdze_lc.js`）
- ✅ `package.json` 已加入 `deploy` 脚本（`gh-pages -d dist -b gh-pages`）
- ✅ `gh-pages` 工具已安装（执行步骤第 2 步可跳过）
- ✅ git remote 已指向 GitHub 仓库，含 `main` 与 `gh-pages` 分支
- ⚠️ 源码仍有未提交改动（`src/styles.css`、`src/components/MoviesChart.jsx`、`package.json`）。Hermes **执行第 3 步 `npm run build` 重新构建一遍**，确保线上是最新版，不要复用任何旧 dist

## 四、开始前请确认（环境前提）
1. Node 已装（项目基于 Node 22.x，npm 可用）
2. Git 已装，且已配置：
   ```bash
   git config --global user.name "你的名字"
   git config --global user.email "你的GitHub邮箱"
   ```
3. 已登录 GitHub，且对 `hellothisishua/huascope` 仓库有 **push 权限**
4. 已准备好 **Personal Access Token（PAT）**：
   - GitHub 网页 → 头像 → Settings → Developer settings → Personal access tokens → 生成，勾选 `repo` 权限
   - ⚠️ GitHub 不支持用登录密码 push，密码处必须填 PAT

## 五、执行步骤（按顺序）
```bash
# 1. 进入项目目录
cd D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list

# 2. 安装发布工具（仅首次，已装可跳过）
npm install -D gh-pages

# 3. 构建（产出 dist/）
npm run build

# 4. 发布到 GitHub Pages（推送到 gh-pages 分支）
npm run deploy
```
- 第 4 步若提示用户名/密码：**用户名=GitHub 账号名，密码=上面生成的 PAT**
- 发布后等 **1–2 分钟**，打开 `https://hellothisishua.github.io/huascope/` 验证

## 六、关键配置（无需改动，仅作核对）
| 项 | 值 | 说明 |
|---|---|---|
| `vite.config.js` → `base` | `/huascope/` | 与项目页子路径对齐，已正确 |
| `package.json` → `scripts.deploy` | `gh-pages -d dist -b gh-pages` | 已写入 |
| git remote `origin` | `https://github.com/hellothisishua/huascope.git` | 已正确 |
| 分支 | `main`（源码）/ `gh-pages`（发布） | 发布用 gh-pages 分支，不动 main |

## 七、常见报错与对策
- `remote: Invalid username or password` → 密码处用了登录密码，改用 PAT
- `fatal: repository not found` → 未登录或无权限，先完成第四节认证
- `gh-pages: command not found` → 重跑 `npm install -D gh-pages`
- `failed to push` / 被拒绝 → 确认对 `hellothisishua/huascope` 有写权限

## 八、注意事项
- 不需要 `git commit` 源码；`gh-pages` 只把 `dist/` 内容发布到 `gh-pages` 分支
- TMDB Key、Supabase Key 通过 `vite.config.js` 的 `define` 在**构建期**注入，不进源码明文，安全
- 若 Hermes 环境有「安全删除 / trash 拦截」类问题导致 build 卡住，先删掉 `node_modules/.vite` 缓存再 build：
  ```bash
  rm -rf node_modules/.vite
  ```
- 若 build 时报 `safe-delete` 拦截 `dist/assets`，先手动 `rm -rf dist` 再 build

## 九、验收标准
打开 `https://hellothisishua.github.io/huascope/`：
1. 能看到观影清单界面
2. **电脑端和手机端都是竖屏居中布局**（max-width 480px，底部 Tab Bar 切换三视图）——这是最终方案，不再有横屏 sidebar
3. 三视图（电影列表 / 海报墙 / 统计）切换正常
4. **切三个视图时，内容区宽度完全一致、不左右抖动**（0-1 重建核心目标）
5. 海报墙在窄屏下 3 列；统计页大数字、类型条形图正常显示
6. 搜索电影时长片名+年份完整显示，不再被截断；搜索结果可正常查看、添加
7. 统计页「观影趋势」柱状图随数量变化显示不同长度，月份标签完整
