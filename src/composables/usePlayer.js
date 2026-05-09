import { reactive, ref } from 'vue'
import { loadConfig, saveConfig, baseUrl } from '../config.js'

const state = reactive({
  status: 'stopped', name: '', singer: '', albumName: '',
  duration: 0, progress: 0, volume: 50, mute: false, playbackRate: 1,
})
const coverUrl = ref('')
const connected = ref(false)
const lyrics = ref([])
const currentLyricIndex = ref(-1)
const activeLyricEl = ref(null)
const activeMobileLyricEl = ref(null)
const config = reactive(loadConfig())

let sse = null
let progressTimer = null
let pollTimer = null
let statusPollTimer = null
let lastProgressTime = 0
let prevSongKey = ''
let _lyricTimer = null

// ===== 修复 1: 连接状态机 =====
const ConnectionState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  SSE: 'sse',
  POLLING: 'polling',
  STOPPED: 'stopped'
}
let connectionState = ConnectionState.IDLE

// ===== 修复 5: 歌词缓存 =====
const lyricCache = new Map() // songKey -> parsedLyrics

function API() { return baseUrl(config) }

function parseLRC(text) {
  const clean = text.replace(/^\uFEFF/, '')
  const lines = clean.split('\n')
  const result = []
  for (const line of lines) {
    const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
    if (m) {
      const time = +m[1] * 60 + +m[2] + +m[3] / 1000
      const txt = m[4].trim()
      if (txt) result.push({ time, text: txt })
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

function checkSongChange() {
  const key = state.name + '|' + state.singer
  if (key !== prevSongKey && key !== '|') {
    prevSongKey = key
    coverUrl.value = ''
    // 修复 5: 使用缓存的歌词
    if (lyricCache.has(key)) {
      lyrics.value = lyricCache.get(key)
      currentLyricIndex.value = -1
    } else {
      lyrics.value = []
      currentLyricIndex.value = -1
    }
    clearTimeout(_lyricTimer)
    _lyricTimer = setTimeout(() => { fetchLyrics(); fetchCoverAndStatus() }, 300)
  }
}

// ===== 修复 1: 清理连接资源 =====
function cleanupConnection() {
  connectionState = ConnectionState.STOPPED
  if (sse) {
    const oldSse = sse
    sse = null
    oldSse.close()
  }
  if (statusPollTimer) {
    clearInterval(statusPollTimer)
    statusPollTimer = null
  }
}

async function fetchLyrics() {
  const songKey = state.name + '|' + state.singer
  // 修复 5: 检查缓存
  if (lyricCache.has(songKey)) {
    lyrics.value = lyricCache.get(songKey)
    return
  }
  try {
    const r = await fetch(API() + '/lyric')
    const t = await r.text()
    const parsed = parseLRC(t)
    if (parsed.length > 0) {
      // 修复 5: 存入缓存
      lyricCache.set(songKey, parsed)
      lyrics.value = parsed
      return
    }
    // 第一次获取为空，1秒后重试
    setTimeout(async () => {
      try {
        const r2 = await fetch(API() + '/lyric')
        const parsed2 = parseLRC(await r2.text())
        if (parsed2.length > 0) {
          lyricCache.set(songKey, parsed2)
          lyrics.value = parsed2
        }
      } catch {}
    }, 1000)
  } catch {}
}

async function fetchCoverAndStatus() {
  try {
    const r = await fetch(API() + '/status?filter=picUrl,volume,mute')
    const d = await r.json()
    if (d.picUrl) coverUrl.value = d.picUrl.replace('https://', 'http://')
    if (typeof d.volume === 'number') state.volume = d.volume
    if (typeof d.mute === 'boolean') state.mute = d.mute
  } catch {}
}

function updateLyric() {
  const p = state.progress
  let idx = -1
  for (let i = 0; i < lyrics.value.length; i++) {
    if (lyrics.value[i].time <= p) idx = i; else break
  }
  currentLyricIndex.value = idx
}

// Polling-based status updates
async function pollStatus() {
  try {
    const r = await fetch(API() + '/status')
    const d = await r.json()
    connected.value = true
    if (d.status) state.status = d.status
    // 修复 4: 合并 name 和 singer 更新，避免重复触发 checkSongChange
    if (d.name || d.singer) {
      if (d.name) state.name = d.name
      if (d.singer) state.singer = d.singer
      checkSongChange()
    }
    if (d.albumName) state.albumName = d.albumName
    if (typeof d.duration === 'number') state.duration = d.duration
    if (typeof d.progress === 'number') {
      state.progress = d.progress
      lastProgressTime = Date.now()
      updateLyric()
    }
    if (typeof d.playbackRate === 'number') state.playbackRate = d.playbackRate
  } catch {
    connected.value = false
  }
}

// ===== 修复 1: SSE 连接状态机实现 =====
function connectSSE() {
  // 如果已在连接中，忽略重复调用
  if (connectionState === ConnectionState.CONNECTING ||
      connectionState === ConnectionState.SSE ||
      connectionState === ConnectionState.POLLING) {
    console.warn('[usePlayer] connectSSE ignored, state:', connectionState)
    return
  }

  cleanupConnection()
  connectionState = ConnectionState.CONNECTING

  try {
    sse = new EventSource(API() + '/subscribe-player-status')

    sse.onopen = () => {
      if (connectionState === ConnectionState.STOPPED) {
        sse.close()
        return
      }
      connected.value = true
      connectionState = ConnectionState.SSE
      // SSE 成功，清理轮询
      if (statusPollTimer) {
        clearInterval(statusPollTimer)
        statusPollTimer = null
      }
    }

    sse.onerror = () => {
      // 防止重复处理或处理已停止的连接
      if (connectionState === ConnectionState.STOPPED ||
          connectionState === ConnectionState.POLLING) return

      connected.value = false
      connectionState = ConnectionState.POLLING

      if (sse) {
        const oldSse = sse
        sse = null
        oldSse.close()
      }

      // 降级到轮询，间隔改为 2 秒
      if (!statusPollTimer) {
        statusPollTimer = setInterval(pollStatus, 2000)
      }
    }

    sse.addEventListener('status', (e) => { state.status = e.data.replace(/"/g, '') })
    sse.addEventListener('name', (e) => { state.name = e.data.replace(/"/g, ''); checkSongChange() })
    sse.addEventListener('singer', (e) => { state.singer = e.data.replace(/"/g, ''); checkSongChange() })
    sse.addEventListener('albumName', (e) => { state.albumName = e.data.replace(/"/g, '') })
    sse.addEventListener('duration', (e) => { state.duration = parseFloat(e.data) || 0 })
    sse.addEventListener('progress', (e) => {
      state.progress = parseFloat(e.data) || 0
      lastProgressTime = Date.now()
      updateLyric()
    })
    sse.addEventListener('playbackRate', (e) => { state.playbackRate = parseFloat(e.data) || 1 })

    // 3秒超时后备
    setTimeout(() => {
      if (connectionState === ConnectionState.CONNECTING) {
        // SSE 未成功连接，降级到轮询
        if (sse) {
          const oldSse = sse
          sse = null
          oldSse.close()
        }
        connectionState = ConnectionState.POLLING
        if (!statusPollTimer) {
          statusPollTimer = setInterval(pollStatus, 2000)
        }
      }
    }, 3000)

  } catch {
    // EventSource 不可用，使用轮询
    connectionState = ConnectionState.POLLING
    if (!statusPollTimer) {
      statusPollTimer = setInterval(pollStatus, 2000)
    }
  }
}

// ===== 修复 3: Progress Timer 改为 500ms =====
function startTimers() {
  progressTimer = setInterval(() => {
    if (state.status === 'playing' && state.playbackRate > 0) {
      const elapsed = (Date.now() - lastProgressTime) / 1000
      // 只在 SSE 1秒没更新时才补偿
      if (elapsed > 1) {
        state.progress = Math.min(state.duration, state.progress + 0.5 * state.playbackRate)
        updateLyric()
      }
    }
  }, 500) // 从 250ms 改为 500ms
  pollTimer = setInterval(() => { fetchCoverAndStatus() }, 5000)
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m + ':' + (sec < 10 ? '0' : '') + sec
}

function ctrl(path) { fetch(API() + '/' + path).catch(() => {}) }

function start() {
  connectionState = ConnectionState.IDLE
  connectSSE()
  startTimers()
  fetchLyrics()
  fetchCoverAndStatus()
}

// ===== 修复 1: stop 使用 cleanupConnection =====
function stop() {
  cleanupConnection()
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function updateConfig(cfg) {
  Object.assign(config, cfg)
  saveConfig(config)
  stop()
  // 短暂延迟确保清理完成
  setTimeout(() => start(), 100)
}

export function usePlayer() {
  return {
    state, coverUrl, connected, lyrics, currentLyricIndex,
    activeLyricEl, activeMobileLyricEl, config,
    start, stop, updateConfig, formatTime,
    togglePlay: () => ctrl(state.status === 'playing' ? 'pause' : 'play'),
    prev: () => ctrl('skip-prev'),
    next: () => ctrl('skip-next'),
    seekBack: () => { const t = Math.max(0, Math.round(state.progress - 10)); state.progress = t; ctrl('seek?offset=' + t) },
    seekForward: () => { const t = Math.min(state.duration, Math.round(state.progress + 10)); state.progress = t; ctrl('seek?offset=' + t) },
    setVolume: (v) => { state.volume = v; ctrl('volume?volume=' + v) },
    toggleMute: () => { state.mute = !state.mute; ctrl('mute?mute=' + state.mute) },
    seekTo: (t) => { state.progress = t; ctrl('seek?offset=' + Math.round(t)) },
  }
}
