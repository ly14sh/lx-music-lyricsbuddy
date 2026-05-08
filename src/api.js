import { baseUrl } from './config.js'

export async function fetchStatus(cfg) {
  const r = await fetch(`${baseUrl(cfg)}/status`)
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
}

export async function fetchLyric(cfg) {
  const r = await fetch(`${baseUrl(cfg)}/lyric`)
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
}

export function controlUrl(cfg, path) {
  return `${baseUrl(cfg)}/${path}`
}

export function subscribeSSE(cfg, onMessage) {
  const url = `${baseUrl(cfg)}/subscribe-player-status`
  const es = new EventSource(url)
  es.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch (_) {}
  }
  es.onerror = () => es.close()
  return es
}
