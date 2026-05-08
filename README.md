# LX Music Web Player

Vue 3 + Vite 构建的 LX Music 网页播放器，支持 PWA 安装。

## 功能
- 实时 SSE 连接 LX Music 桌面端
- 播放控制（播放/暂停/上一首/下一首/快进快退）
- 进度条拖拽
- 音量控制
- 歌词同步显示
- 5 色主题切换（紫/红/黄/蓝/绿）
- 响应式布局（桌面横屏 / 手机竖屏+翻页）
- PWA 支持（可添加到主屏幕）

## 开发
```bash
npm install
npm run dev
```

## 构建
```bash
npm run build
```

## 部署
`dist/` 目录即为静态站点，可部署到任何 Web 服务器。
