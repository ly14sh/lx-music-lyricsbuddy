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
    lyrics.value = []
    currentLyricIndex.value = -1
    clearTimeout(_lyricTimer)
    _lyricTimer = setTimeout(() => { fetchLyrics(); fetchCoverAndStatus() }, 300)
  }
}

async function fetchLyrics() {
  try {
    const r = await fetch(API() + '/lyric')
    const t = await r.text()
    const parsed = parseLRC(t)
    if (parsed.length > 0) { lyrics.value = parsed; return }
    setTimeout(async () => {
      try { const r2 = await fetch(API() + '/lyric'); lyrics.value = parseLRC(await r2.text()) } catch {}
    }, 1000)
  } catch {}
}

async function fetchCoverAndStatus() {
  try {
    const r = await fetch(API() + '/status?filter=picUrl,volume,mute')
    const d = await r.json()
    if (d.picUrl) coverUrl.value = d.picUrl
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

// Polling-based status updates (replaces SSE for Capacitor compatibility)
async function pollStatus() {
  try {
    const r = await fetch(API() + '/status')
    const d = await r.json()
    connected.value = true
    if (d.status) state.status = d.status
    if (d.name) { state.name = d.name; checkSongChange() }
    if (d.singer) { state.singer = d.singer; checkSongChange() }
    if (d.albumName) state.albumName = d.albumName
    if (typeof d.duration === 'number') state.duration = d.duration
    if (typeof d.progress === 'number') { state.progress = d.progress; lastProgressTime = Date.now(); updateLyric() }
    if (typeof d.playbackRate === 'number') state.playbackRate = d.playbackRate
  } catch {
    connected.value = false
  }
}

function connectSSE() {
  // Try native EventSource first (works in browsers, fails in Capacitor with mixed content)
  try {
    sse = new EventSource(API() + '/subscribe-player-status')
    sse.onopen = () => { connected.value = true; clearInterval(statusPollTimer); statusPollTimer = null }
    sse.onerror = () => {
      connected.value = false
      sse.close(); sse = null
      // Fallback to polling
      if (!statusPollTimer) statusPollTimer = setInterval(pollStatus, 1000)
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
    // If SSE doesn't connect within 3s, fallback to polling
    setTimeout(() => {
      if (!connected.value && !statusPollTimer) {
        sse.close(); sse = null
        statusPollTimer = setInterval(pollStatus, 1000)
      }
    }, 3000)
  } catch {
    // EventSource not available, use polling
    statusPollTimer = setInterval(pollStatus, 1000)
  }
}

function startTimers() {
  progressTimer = setInterval(() => {
    if (state.status === 'playing' && state.playbackRate > 0) {
      const elapsed = (Date.now() - lastProgressTime) / 1000
      if (elapsed > 0.5) {
        state.progress = Math.min(state.duration, state.progress + 0.25 * state.playbackRate)
        updateLyric()
      }
    }
  }, 250)
  pollTimer = setInterval(() => { fetchCoverAndStatus() }, 5000)
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m + ':' + (sec < 10 ? '0' : '') + sec
}

function ctrl(path) { fetch(API() + '/' + path).catch(() => {}) }

function start() { connectSSE(); startTimers(); fetchLyrics(); fetchCoverAndStatus() }
function stop() {
  if (sse) { sse.close(); sse = null }
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (statusPollTimer) { clearInterval(statusPollTimer); statusPollTimer = null }
}

function updateConfig(cfg) {
  Object.assign(config, cfg)
  saveConfig(config)
  stop(); start()
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
