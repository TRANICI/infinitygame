# 发布到 GitHub Pages

仓库：`TRANICI/infinitygame`。Pages 地址：`https://tranici.github.io/infinitygame/`。部署状态以仓库 Actions 中的 **Publish game to GitHub Pages** 为准。

1. 在 GitHub 创建公开仓库 `TRANICI/infinitygame`。
2. 上传项目源码，包含 `.github/workflows/pages.yml`，不要上传 `test-results/` 或 Steam 文件。
3. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
4. 将代码推送到 `main`，或在 Actions 手动运行 **Publish game to GitHub Pages**。
5. 工作流成功后，把部署页面显示的地址发给朋友。

项目没有后端。`npm run build` 生成的 `dist/` 只包含静态运行文件，使用相对路径，支持 GitHub 项目子目录。

本地上传使用 Git Credential Manager 的浏览器授权。凭据保存在 Windows 凭据管理器中，不写入项目或发布包。

参考：[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。
