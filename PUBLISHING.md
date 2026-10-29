# 发布到 GitHub Pages

源码仓库：https://github.com/TRANICI/infinitygame
游戏地址：https://tranici.github.io/infinitygame/

推送 main 会触发 .github/workflows/pages.yml。工作流依次执行 npm run check、npm test、npm run build，将 dist/ 发布至 GitHub Pages。也可在仓库 Actions 中手动运行「Publish game to GitHub Pages」。

dist/ 采用白名单打包，只包含 12 个运行文件及 .nojekyll，不携带源 NAV 数据、截图、测试脚本或旧医院资源。所有脚本与样式使用相对路径，适用于 /infinitygame/ 子目录，也支持直接打开本地 index.html。

发布前执行 python tests/fps-ui.py 检查构建产物。发布后检查页面的 build 元信息、实际载入版本，以及玩家加九名 AI 的开局。浏览器缓存旧版时刷新页面。

本机 Git 凭据由系统凭据管理器处理，不写入源码或静态包。
