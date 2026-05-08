# 阿里云 ESA Pages 部署指南

## 前提条件
1. 阿里云账号，已开通 ESA 服务
2. 域名已接入 ESA
3. LX Music 桌面端已开启开放 API 服务

## 步骤一：暴露本地 API 到公网

ESA Pages 部署后，页面在阿里云边缘节点运行，无法访问 localhost。
需要将本机 LX Music API 暴露到公网。

### 方案 A：FRP 内网穿透（推荐）
1. 在有公网 IP 的服务器上部署 frps
2. 本机运行 frpc，配置：
   ```toml
   [lx-api]
   type = tcp
   local_ip = 127.0.0.1
   local_port = 23330
   remote_port = 23330
   ```
3. 记下公网地址，如 `your-server.com:23330`

### 方案 B：Cloudflare Tunnel（免费）
1. 安装 cloudflared
2. 运行：`cloudflared tunnel --url http://localhost:23330`
3. 获得类似 `https://xxx.trycloudflare.com` 的地址

## 步骤二：部署到 ESA Pages

### 方法 1：ESA 控制台上传
1. 登录阿里云 ESA 控制台
2. 进入「边缘函数」→「Pages」
3. 创建项目，上传 `dist/` 目录中的所有文件
4. 绑定域名

### 方法 2：CLI 部署
```bash
# 安装 ESA CLI（如果有）
npm install -g @alicloud/esa-cli

# 部署 dist 目录
esa-cli pages deploy ./dist --project lx-music
```

## 步骤三：访问播放器

### 方式 1：URL 参数预配置（推荐分享）
```
https://your-pages.example.com/?api=your-server.com&port=23330
```
首次访问后会自动保存到 localStorage，后续无需重复配置。

### 方式 2：手动配置
1. 访问 `https://your-pages.example.com/`
2. 点击右上角齿轮 ⚙️
3. 填入 API 地址和端口
4. 保存

## URL 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `host` 或 `api` | LX Music API 地址 | `?api=frp.example.com` |
| `port` | API 端口 | `?port=23330` |
| `theme` | 主题索引(0-4) | `?theme=2` |

组合示例：
```
https://lx.example.com/?api=frp.example.com&port=23330&theme=0
```

## 注意事项
- LX Music 桌面端必须保持运行
- API 地址必须公网可达
- 建议在 FRP/隧道上加密码保护
- ESA Pages 不支持 WebSocket，SSE 基于 HTTP 长连接可正常工作
