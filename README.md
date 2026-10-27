# 零号病区 · WARD ZERO

第一人称网页探索游戏，四段记忆串起林秋与小满一起回家的约定。当前是温和测试版：明亮照明、可爱团子、柔和音效，没有贴脸惊吓或死亡画面。

双击 `开始游戏.bat` 或 `index.html`。也可以执行 `npm start`，打开 `http://127.0.0.1:4173`。运行游戏无需下载依赖，桌面端推荐支持 WebGL 的 Chrome / Edge，手机有触屏移动和观察。

## 操作

| 按键 | 功能 |
| --- | --- |
| WASD / 鼠标 | 移动 / 观察 |
| Shift / C | 冲刺 / 蹲行 |
| E | 拾取、操作、阅读、进出柜子 |
| F | 手电 |
| Tab / M | 地图，查看时暂停 |
| Esc | 暂停 |

柜内自动面向外侧，仍可用鼠标转头。团子碰到你只会击掌并送回本层入口，收集进度保留。进度和设置保存在当前浏览器中；章节选择已全部开放。

## 四个章节

1. **记忆庭院 · Dust II**：在 B 区、中路、A 大道找号码牌，送到 A 区叫号机。
2. **静水档案馆**：依次操作 ① → ② → ③ 阀门，再启动排水。
3. **云朵游乐室**：收集照片，在放映机拼回约定。
4. **归家月台**：点亮三盏路标，启动广播，和团子回家。

第一关平面轮廓根据用户提供的 820 × 805 鸟瞰图描摹，尺度从 0.065 调整到 0.14 游戏米/像素，约放大 2.15 倍。高低关系参考本地 CS2 `de_dust2.nav` v36 的 2,242 个区域。按测试需求把坡面重新设计为平整平台与实体楼梯，踏步高 0.18 米，保留 CT 下穿与上层小道。墙高、家具和材质为简化重建，不是原版 CS2 的完整模型。

## 开发与验证

```text
npm run check          # JavaScript 语法检查
npm test               # 八条通路、楼梯、分层高度和家具地基
python tests/smoke.py   # Playwright 四关流程、鼠标、柜子、移动端
npm run build          # 生成纯静态 dist/
```

浏览器测试需要 Python Playwright 与 Chrome。`test-results/` 是本地测试输出，不进入发布包。

- `core.js`：关卡、碰撞、寻路和进度。
- `terrain.js`：分层高度、楼梯与寻路。
- `world3d.js`：WebGL 实体地形、家具和团子。
- `dust2-layout.js`：平面轮廓；`dust2-scene.js`：物件和任务点。
- `dust2-architecture.js`：生成后的平台和楼梯。
- `scripts/build-architecture.cjs`：将测量数据转成建筑地形，运行后需要做路线测试。
- `scripts/inspect-source-map.py` / `read-nav.py`：只读解析本地 VPK/NAV，开发用。

导航格式参考 [ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat/tree/master/ValveResourceFormat/NavMesh)。游戏运行不需要访问 Steam 目录，没有外部材质或网络依赖。

## GitHub Pages

发布步骤见 [PUBLISHING.md](PUBLISHING.md)。工作流已准备好，仓库和线上页面尚未创建。
