# LX Music Web App - 工作计划

## 技术栈
- Vue 3 + Vite（极速开发+热更新）
- 纯 CSS（无 UI 框架，保持轻量）
- PWA（可安装到手机主屏幕）

## 项目路径
`E:\Qclaw\lx_music_web\`

## 文件规划

```
lx_music_web/
├── index.html              # 入口 + PWA meta
├── vite.config.js          # Vite 配置
├── package.json            # 依赖
├── public/
│   └── manifest.json       # PWA manifest
├── src/
│   ├── main.js             # Vue 入口
│   ├── App.vue             # 根组件（主题+布局切换）
│   ├── config.js           # API 地址/主题持久化 (localStorage)
│   ├── themes.js           # 5 色主题定义
│   ├── api.js              # HTTP + SSE 通信
│   ├── components/
│   │   ├── AlbumPanel.vue      # 封面
│   │   ├── ProgressBar.vue     # 进度条
│   │   ├── ControlButtons.vue  # 播放控制
│   │   ├── VolumeRow.vue       # 音量
│   │   ├── LyricsBox.vue       # 歌词
│   │   ├── StatusBadge.vue     # 状态指示
│   │   └── SettingsDialog.vue  # 设置弹窗
│   └── composables/
│       └── usePlayer.js        # 播放状态管理 (reactive)
```

## 设计要点
- 扁平化 + 毛玻璃风格（参考原 HTML 播放器）
- CSS media query: 横屏 pad / 竖屏 phone 自动切换
- 右上角齿轮 → 设置弹窗（IP/端口/5色圆点选择）
- SSE 实时推送播放状态
- localStorage 持久化配置

## 执行步骤
1. 初始化项目 (npm create vite)
2. 写核心文件 (config/themes/api/composable)
3. 写 7 个组件
4. 写 App.vue 主布局
5. 测试运行
