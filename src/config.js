const KEY = 'lx_music_config'
const DEFAULT = { host: '127.0.0.1', port: 23330, themeIndex: 0 }
export function loadConfig() {
  // URL 参数优先（方便 ESA/CDN 部署时预配置）
  const u = new URLSearchParams(location.search)
  const urlHost = u.get('host') || u.get('api')
  const urlPort = u.get('port')
  const urlTheme = u.get('theme')
  if (urlHost || urlPort) {
    const c = { ...DEFAULT, host: urlHost || DEFAULT.host, port: +(urlPort || DEFAULT.port), themeIndex: +(urlTheme || 0) }
    saveConfig(c) // 持久化到 localStorage
    // 清除 URL 参数避免重复覆盖
    history.replaceState(null, '', location.pathname)
    return c
  }
  try { const r = localStorage.getItem(KEY); if (r) return { ...DEFAULT, ...JSON.parse(r) } } catch {}
  return { ...DEFAULT }
}
export function saveConfig(c) { localStorage.setItem(KEY, JSON.stringify(c)) }
export function baseUrl(c) { return `http://${c.host}:${c.port}` }
