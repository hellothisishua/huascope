# HuaScope 万花筒 — 界面布局设计思路

> 文档用途：记录 HuaScope 观影清单在「适配」这件事上的设计决策脉络，方便交接 / 复盘。
> 最后更新：2026-08-13（0-1 重建版）
> 结论先行：**所有设备统一使用「手机竖屏」布局**（max-width 480px 居中 + 底部 Tab Bar），电脑端打开也是中间一条竖的。

---

## 一、需求与目标

用户的真实诉求只有一个：**在手机和电脑上打开，三个视图（电影列表 / 海报墙 / 统计）看起来都"一样大、不抖动"**。

衍生约束：
- 莫兰迪色系 + 五瓣花 ❀ 装饰（品牌基调，不动）
- 三视图切来切去，宽度必须恒定一致
- 只改 `src/styles.css`，不碰 JS 逻辑
- 搜片依赖 TMDB（国内需 VPN），但不影响布局

---

## 二、走过的弯路（重要，避免再踩）

### 弯路 1：桌面横屏 Sidebar + 内容区
最开始按"电脑网站"思路做：
- 电脑端：左侧 248px 竖导航 + 右侧宽内容区（flex row）
- 手机端：底部 Tab Bar

**失败原因（反复出现、每个模型都说"修好了"但没修好）：**

| 根因 | 现象 | 为什么难发现 |
|------|------|------|
| 统计页被单独收窄 `.stats{max-width:880px}` | 统计页比列表/海报墙窄 120px 且左右偏移 | 肉眼看"差不多" |
| 滚动条占位抖动 `.content{overflow-y:auto}` | 列表长→有滚动条吃掉右边 ~15px；统计短→无滚动条宽 15px，切视图宽度来回跳 | 绝大多数模型漏掉"滚动条会占宽度"这点 |

> 关键教训：**"三个视图一样大"不能只靠设宽度，必须同时处理滚动条占位**。否则哪怕宽度写死，滚动条一进一出，视觉上还是"大小不一样"。

### 弯路 2：Hermes 改成桌面横屏后手机完全不可用
被改成了 flex row 横屏布局，手机窄屏下 Sidebar 挤占空间、内容被压成一条，实际不可用。

---

## 三、最终方案（已实测通过）

**直接砍掉桌面横屏，全设备统一手机竖屏布局。**

### 核心规则（0-1 重建后）
```css
/* 1. 把滚动收口到「唯一」容器，并预留滚动条占位 */
.app {
  width: min(480px, 100vw);
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;   /* 滚动全部交给 .content-body */
}
.content-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;           /* 唯一滚动容器 */
  overflow-x: hidden;
  scrollbar-gutter: stable;   /* 预留滚动条位 → 切视图宽度恒定 */
  padding: 12px 16px;
}

/* 2. 三个视图全部是 .content-body 的 100% 宽度 */
.list, .poster-wall, .stats {
  width: 100%;
  max-width: 100%;
}

/* 3. 底部 Tab Bar（手机+电脑共用同一个） */
.sidebar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(480px, 100vw);
  display: flex; flex-direction: row;
  height: 64px;
}

/* 4. 海报墙：3 列 */
.poster-wall { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
```

### 为什么这个方案稳
- **没有"桌面分支"**：删除全部 `@media (min-width:768px)` 横屏代码，从根上消灭"两个布局不一致"的可能
- **宽度从结构上保证**：`.app` 固定宽度，`content-body` 固定 flex 子区域，三个视图都 `width:100%` 填满同一个盒子，宽度由盒子决定，与每个视图自身内容无关
- **滚动条不抖**：`scrollbar-gutter: stable` 加在真正的滚动容器 `.content-body` 上，无论视图长不长，滚动条位一直预留，切视图时内容宽度不横向跳
- **手机优先即唯一布局**：电脑只是"更宽的屏幕里放一条竖的"，无需任何条件判断

---

## 四、实测验证（用 Playwright 真量像素，不靠嘴说）

| 视口 | app 宽 | 列表 | 海报墙 | 统计 |
|------|--------|------|--------|------|
| 电脑 1280 | 480px（居中） | 443px | 443px | 443px ✅ |
| 手机 390 | 390px（满屏） | 353px | 353px | 353px ✅ |

验证方法（可复现）：
1. 使用构建产物 CSS（`dist/assets/index-*.css`），构造一个同时包含 `.list` / `.poster-wall` / `.stats` 的验证页
2. 用 Playwright 分别在 1280×800 和 390×800 视口打开
3. 读取 `#v-list`、`#v-poster`、`#v-stats` 的 `getBoundingClientRect().width`
4. 三个数字必须完全一致

> 自查小技巧：本地 `npm run dev` 后按 F12，切三个视图，选中容器看 Box Model 的 width，三个数字必须一模一样。

---

## 五、与历史的对照（一句话总结踩坑）

| 方案 | 结果 |
|------|------|
| 桌面横屏 Sidebar | ❌ 三视图大小不一致（滚动条抖动根因） |
| Hermes 横屏改造 | ❌ 手机完全不可用 |
| 全设备手机竖屏（当前） | ✅ 三视图恒等宽、不抖、手机电脑一致 |

---

## 六、部署（交给 Hermes）

详见 `DEPLOY_REPORT_FOR_HERMES.md`。Hermes 执行：
```
cd D:\app\workbuddy\storage\2026-08-05-14-13-56\cine-list
npm run build
npm run deploy
```
上线地址：`https://hellothisishua.github.io/huascope/`

---

## 七、如果将来要再做"真·桌面横屏"

**不要直接写媒体查询**，务必同时做这两点，否则必重复踩坑：
1. `.content { scrollbar-gutter: stable; }` —— 预留滚动条位
2. 三个视图容器 `width: 100%; max-width: 100%;` —— 强制同宽，禁止任何视图单独设 max-width

最稳的做法仍是：**桌面端也不要横屏，保持竖屏居中**，这样根本不存在"两个布局要对齐"的问题。
