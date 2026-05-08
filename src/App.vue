<template>
  <div class="app" ref="appRef" :style="appStyle">
    <button class="gear" @click="showSettings = true" title="Settings">&#9881;</button>

    <div class="player">
      <!-- Mobile flip -->
      <div class="mobile-flip" @touchstart="flipStart" @touchmove="flipMove" @touchend="flipEnd" ref="flipArea">
        <div class="flip-track" :style="flipTrackStyle">
          <div class="flip-page album-page">
            <div class="album-wrap">
              <div class="album-art">
                <img v-if="coverUrl" :src="coverUrl" @error="coverUrl = ''" alt="">
                <div v-else class="placeholder">&#9835;</div>
                <div class="vinyl-overlay"></div>
              </div>
              <div v-if="state.status === 'playing'" class="playing-badge">
                <span class="pulse-dot"></span>PLAYING
              </div>
            </div>
          </div>
          <div class="flip-page lyrics-page">
            <div class="lyrics-box" ref="mobileLyricsBox" @touchstart="lyricsTouchStart">
              <div v-if="lyrics.length === 0" class="lyric-line">&#9835; No lyrics</div>
              <div v-for="(l, idx) in lyrics" :key="idx"
                   :class="['lyric-line', { active: idx === currentLyricIndex, past: idx < currentLyricIndex }]"
                   :ref="el => { if (idx === currentLyricIndex) activeMobileLyricEl = el }">
                {{ l.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="flip-dots">
        <span :class="['flip-dot', { active: flipPage === 0 }]" @click="flipTo(0)"></span>
        <span :class="['flip-dot', { active: flipPage === 1 }]" @click="flipTo(1)"></span>
      </div>

      <!-- Desktop album -->
      <div class="album-panel">
        <div class="album-wrap">
          <div class="album-art">
            <img v-if="coverUrl" :src="coverUrl" @error="coverUrl = ''" alt="">
            <div v-else class="placeholder">&#9835;</div>
            <div class="vinyl-overlay"></div>
          </div>
          <div v-if="state.status === 'playing'" class="playing-badge">
            <span class="pulse-dot"></span>PLAYING
          </div>
        </div>
      </div>

      <!-- Card -->
      <div class="card">
        <div class="song-info">
          <div class="song-title">{{ state.name || 'Unknown Track' }}</div>
          <div class="song-artist">{{ state.singer || 'Unknown Artist' }}</div>
          <div class="song-album" v-if="state.albumName">Album: {{ state.albumName }}</div>
        </div>

        <div class="progress-section">
          <div class="progress-bar" @mousedown="startDrag" @touchstart.prevent="startDrag" ref="progressBar">
            <div class="progress-fill" :style="{ width: displayPercent + '%' }">
              <div class="progress-thumb"></div>
            </div>
          </div>
          <div class="time-row">
            <span>{{ formatTime(dragging ? dragTarget : state.progress) }}</span>
            <span>{{ formatTime(state.duration) }}</span>
          </div>
        </div>

        <div class="controls">
          <button class="ctrl-btn" @click="prev" title="Previous">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button class="ctrl-btn" @click="seekBack" title="-10s">
            <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
          </button>
          <button class="play-btn" @click="togglePlay">
            <svg v-if="state.status === 'playing'" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="ctrl-btn" @click="seekForward" title="+10s">
            <svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg>
          </button>
          <button class="ctrl-btn" @click="next" title="Next">
            <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <div class="volume-row">
          <span class="vol-icon" @click="toggleMute">
            <svg v-if="state.mute || state.volume === 0" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            <svg v-else-if="state.volume < 50" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
            <svg v-else viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          </span>
          <input type="range" class="vol-slider" min="0" max="100" :value="state.mute ? 0 : state.volume" @input="e => setVolume(+e.target.value)">
          <span class="vol-val">{{ state.mute ? '0' : state.volume }}%</span>
        </div>

        <div class="lyrics-box" ref="lyricsBox">
          <div v-if="lyrics.length === 0" class="lyric-line">&#9835; No lyrics</div>
          <div v-for="(l, idx) in lyrics" :key="idx"
               :class="['lyric-line', { active: idx === currentLyricIndex, past: idx < currentLyricIndex }]"
               :ref="el => { if (idx === currentLyricIndex) activeLyricEl = el }">
            {{ l.text }}
          </div>
        </div>

        <div class="meta-row">
          <div class="meta-item">
            <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>
            {{ state.mute ? 'Mute' : state.volume + '%' }}
          </div>
          <div class="meta-item">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
            {{ formatTime(state.duration || 0) }}
          </div>
          <div class="meta-item">
            <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            {{ state.playbackRate || 1 }}x
          </div>
        </div>

        <div :class="['status-badge', { disconnected: !connected }]">
          <span class="pulse-dot" :style="connected ? '' : 'background:#ef4444'"></span>
          {{ connected ? (state.status === 'playing' ? 'PLAYING' : state.status === 'paused' ? 'PAUSED' : 'STOPPED') : 'DISCONNECTED' }}
        </div>
      </div>
    </div>

    <!-- Settings Dialog -->
    <div v-if="showSettings" class="overlay" @click.self="showSettings = false">
      <div class="dialog">
        <div class="dialog-head">
          <span class="icon">&#9881;</span> Settings
          <button class="close" @click="showSettings = false">&times;</button>
        </div>
        <label>IP / Domain</label>
        <input v-model="editHost" placeholder="192.168.1.x" />
        <label>Port</label>
        <input v-model.number="editPort" type="number" placeholder="23330" />
        <label>Color Theme</label>
        <div class="colors">
          <div v-for="(t, i) in themes" :key="i" class="color-item" @click="editTheme = i">
            <div v-if="t.name !== 'cycle'" class="circle" :class="{ sel: i === editTheme }"
              :style="{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent3})` }">
              <span v-if="i === editTheme">&#10003;</span>
            </div>
            <div v-else class="circle rainbow-circle" :class="{ sel: i === editTheme }">
              <span v-if="i === editTheme">&#10003;</span>
            </div>
            <span>{{ t.label }}</span>
          </div>
        </div>
        <button class="save" @click="onSave">Save</button>
        <div class="keep-screen-row">
          <span class="keep-label">💡 阻止熄屏</span>
          <label class="switch">
            <input type="checkbox" v-model="editKeepScreenOn" />
            <span class="slider"></span>
          </label>
        </div>
        <div class="version">v1.0.2</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { usePlayer } from './composables/usePlayer.js'
import { themes, applyThemeVars } from './themes.js'

const player = usePlayer()
const { state, coverUrl, connected, lyrics, currentLyricIndex, activeLyricEl, activeMobileLyricEl, config, start, stop, updateConfig, formatTime, togglePlay, prev, next, seekBack, seekForward, setVolume, toggleMute, seekTo } = player

const showSettings = ref(false)
const editHost = ref(config.host)
const editPort = ref(config.port)
const editTheme = ref(config.themeIndex)
const editKeepScreenOn = ref(localStorage.getItem('keepScreenOn') === 'true')

const appRef = ref(null)
const progressBar = ref(null)
const lyricsBox = ref(null)
const mobileLyricsBox = ref(null)
const flipArea = ref(null)

const dragging = ref(false)
const dragPercent = ref(0)
const flipPage = ref(0)
const flipStartX = ref(0)
const flipDeltaX = ref(0)
const flipAreaWidth = ref(300)
const lyricsTouchStartY = ref(0)
const lyricsTouchStartX = ref(0)

const cycleColors = ref(null)
const theme = computed(() => {
  const base = themes[config.themeIndex] || themes[0]
  if (base.name === 'cycle' && cycleColors.value) return { ...base, ...cycleColors.value }
  return base
})

const appStyle = computed(() => ({
  '--bg1': theme.value.bg1, '--bg2': theme.value.bg2, '--bg3': theme.value.bg3,
  '--accent': theme.value.accent, '--accent2': theme.value.accent2, '--accent3': theme.value.accent3,
}))

const progressPercent = computed(() => {
  if (!state.duration) return 0
  return Math.min(100, (state.progress / state.duration) * 100)
})
const displayPercent = computed(() => dragging.value ? dragPercent.value : progressPercent.value)
const dragTarget = computed(() => {
  if (!state.duration) return 0
  return (dragPercent.value / 100) * state.duration
})

const flipTrackStyle = computed(() => {
  let offset = -flipPage.value * 50
  if (flipDeltaX.value !== 0) {
    offset += (flipDeltaX.value / (flipAreaWidth.value || 1)) * 50
  }
  return { transform: `translateX(${offset}%)` }
})

watch(currentLyricIndex, () => {
  nextTick(() => {
    const pairs = [
      { box: lyricsBox.value, el: activeLyricEl.value },
      { box: mobileLyricsBox.value, el: activeMobileLyricEl.value },
    ]
    for (const { box, el } of pairs) {
      if (box && el) {
        const boxRect = box.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const offset = elRect.top - boxRect.top - boxRect.height / 2 + elRect.height / 2
        box.scrollBy({ top: offset, behavior: 'smooth' })
      }
    }
  })
})

// 6色循环：每首歌随机切换主题色
const CYCLE_COLORS = [
  { accent: '#667eea', accent2: '#a855f7', accent3: '#764ba2', bg1: '#0f0c29', bg2: '#302b63', bg3: '#24243e' },
  { accent: '#ef4444', accent2: '#f97316', accent3: '#dc2626', bg1: '#1a0a0a', bg2: '#3d1515', bg3: '#2d1010' },
  { accent: '#f59e0b', accent2: '#eab308', accent3: '#d97706', bg1: '#1a1508', bg2: '#3d3010', bg3: '#2d2410' },
  { accent: '#10b981', accent2: '#34d399', accent3: '#059669', bg1: '#0a1a12', bg2: '#153d28', bg3: '#102d1e' },
  { accent: '#3b82f6', accent2: '#06b6d4', accent3: '#2563eb', bg1: '#0a0f1a', bg2: '#152040', bg3: '#101830' },
  { accent: '#ec4899', accent2: '#f472b6', accent3: '#db2777', bg1: '#1a0a15', bg2: '#3d1530', bg3: '#2d1025' },
]
function pickCycleColor() {
  cycleColors.value = CYCLE_COLORS[Math.floor(Math.random() * CYCLE_COLORS.length)]
}
watch(() => state.name, (newName, oldName) => {
  if (newName && newName !== oldName && themes[config.themeIndex]?.name === 'cycle') {
    pickCycleColor()
  }
})

function startDrag(e) {
  dragging.value = true
  updateDragPosition(e)
  const onMove = (ev) => { ev.preventDefault(); updateDragPosition(ev) }
  const onEnd = () => {
    dragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
    commitSeek()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onEnd)
}

function updateDragPosition(e) {
  const bar = progressBar.value
  if (!bar) return
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const rect = bar.getBoundingClientRect()
  dragPercent.value = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
}

function commitSeek() {
  if (!state.duration) return
  const target = Math.round((dragPercent.value / 100) * state.duration)
  seekTo(target)
}

function flipTo(page) { flipPage.value = page; flipDeltaX.value = 0 }
function isLyricsVerticalSwipe(e) {
  const dx = Math.abs(e.touches[0].clientX - lyricsTouchStartX.value)
  const dy = Math.abs(e.touches[0].clientY - lyricsTouchStartY.value)
  return dy > dx * 1.5
}
function flipStart(e) {
  flipStartX.value = e.touches[0].clientX
  flipDeltaX.value = 0
  flipAreaWidth.value = flipArea.value ? flipArea.value.offsetWidth : 300
}
function flipMove(e) {
  if (lyricsTouchStartY.value && isLyricsVerticalSwipe(e)) return
  flipDeltaX.value = e.touches[0].clientX - flipStartX.value
}
function flipEnd() {
  lyricsTouchStartY.value = 0
  lyricsTouchStartX.value = 0
  const threshold = flipAreaWidth.value * 0.2
  if (flipDeltaX.value < -threshold && flipPage.value < 1) flipPage.value = 1
  else if (flipDeltaX.value > threshold && flipPage.value > 0) flipPage.value = 0
  flipDeltaX.value = 0
}

function lyricsTouchStart(e) {
  lyricsTouchStartY.value = e.touches[0].clientY
  lyricsTouchStartX.value = e.touches[0].clientX
}

function setKeepScreenOn(on) {
  localStorage.setItem('keepScreenOn', on ? 'true' : 'false')
  if (window.Android && window.Android.setKeepScreenOn) {
    window.Android.setKeepScreenOn(on)
  }
}

function onSave() {
  if (!editHost.value.trim()) return
  updateConfig({ host: editHost.value.trim(), port: editPort.value, themeIndex: editTheme.value })
  // 选择循环主题时立即随机一个颜色
  if (themes[editTheme.value]?.name === 'cycle') {
    pickCycleColor()
  } else {
    cycleColors.value = null
  }
  setKeepScreenOn(editKeepScreenOn.value)
  showSettings.value = false
}

onMounted(() => {
  start()
  // Restore keepScreenOn on app start
  if (localStorage.getItem('keepScreenOn') === 'true' && window.Android && window.Android.setKeepScreenOn) {
    window.Android.setKeepScreenOn(true)
  }
  // 强制旋转后刷新 CSS 媒体查询（configChanges 不重建 Activity 时 WebView 不会自动更新）
  const mql = window.matchMedia('(orientation: portrait)')
  const refreshViewport = () => {
    const meta = document.querySelector('meta[name=viewport]')
    if (meta) {
      const content = meta.getAttribute('content')
      meta.setAttribute('content', '')
      requestAnimationFrame(() => meta.setAttribute('content', content))
    }
  }
  mql.addEventListener('change', refreshViewport)
  window.addEventListener('orientationchange', () => setTimeout(refreshViewport, 100))
})
onUnmounted(() => { stop() })
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box }
html, body, #app { height: 100%; overflow: hidden }
</style>

<style scoped>
.app {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--bg1), var(--bg2), var(--bg3));
  font-family: 'Inter', 'Microsoft YaHei', system-ui, sans-serif;
  color: #fff; overflow: hidden; position: relative;
}

.gear {
  position: fixed; top: 16px; left: 16px; z-index: 50;
  background: rgba(255,255,255,0.08); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.65); font-size: 20px; cursor: pointer;
  transition: all 0.2s;
}
.gear:hover { color: #fff; background: rgba(255,255,255,0.15); }

.player { display: flex; flex-direction: row; gap: 32px; align-items: center; max-width: 780px; width: 100%; padding: 20px; }

.card {
  background: rgba(255,255,255,0.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border-radius: 24px; padding: 32px; flex: 1; min-width: 0;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
  position: relative; overflow: hidden; animation: fadeIn 0.5s ease;
}
.card::before {
  content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle at 30% 20%, rgba(102,126,234,0.08) 0%, transparent 50%);
  pointer-events: none;
}

.album-panel { flex-shrink: 0; animation: fadeIn 0.5s ease; }
.album-wrap { position: relative; width: 320px; height: 320px; }
.album-art {
  width: 100%; height: 100%; border-radius: 20px; overflow: hidden; position: relative;
  box-shadow: 0 16px 48px rgba(102,126,234,0.25), 0 4px 16px rgba(0,0,0,0.3);
  transition: transform 0.4s cubic-bezier(.4,0,.2,1);
}
.album-art:hover { transform: scale(1.02); }
.album-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
.album-art .placeholder {
  width: 100%; height: 100%; background: linear-gradient(135deg, var(--accent), var(--accent3));
  display: flex; align-items: center; justify-content: center; font-size: 100px;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
}
.vinyl-overlay { position: absolute; inset: 0; background: radial-gradient(circle, transparent 30%, rgba(0,0,0,0.1) 100%); pointer-events: none; }

.playing-badge {
  position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px); border-radius: 20px; padding: 6px 14px;
  display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600;
  letter-spacing: 1.5px; color: var(--accent); border: 1px solid rgba(102,126,234,0.3);
}
.pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.4; transform: scale(0.8) } }

.song-info { margin-bottom: 20px; }
.song-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; line-height: 1.3; letter-spacing: -0.3px; }
.song-artist { font-size: 15px; color: rgba(255,255,255,0.6); margin-bottom: 2px; }
.song-album { font-size: 12px; color: rgba(255,255,255,0.35); }

.progress-section { margin-bottom: 20px; position: relative; }
.progress-bar {
  width: 100%; height: 6px; background: rgba(255,255,255,0.12); border-radius: 3px;
  cursor: pointer; position: relative; overflow: visible;
}
.progress-bar:hover .progress-fill { height: 8px; margin-top: -1px; }
.progress-bar:hover .progress-thumb { opacity: 1; transform: translate(-50%, -50%) scale(1); }
.progress-fill {
  height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2));
  border-radius: 3px; transition: height 0.15s, margin-top 0.15s; position: relative;
}
.progress-thumb {
  position: absolute; top: 50%; right: -7px; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; transform: translate(-50%, -50%) scale(0); opacity: 0;
  transition: opacity 0.15s, transform 0.15s; box-shadow: 0 0 12px rgba(102,126,234,0.6); z-index: 2;
}
.time-row { display: flex; justify-content: space-between; font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 8px; font-variant-numeric: tabular-nums; }

.controls { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 16px; }
.ctrl-btn {
  background: none; border: none; color: rgba(255,255,255,0.65); cursor: pointer;
  transition: all 0.2s; padding: 12px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.ctrl-btn:hover { color: #fff; background: rgba(255,255,255,0.08); transform: scale(1.1); }
.ctrl-btn:active { transform: scale(0.95); }
.ctrl-btn svg { width: 28px; height: 28px; fill: currentColor; }
.play-btn {
  width: 68px; height: 68px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent3));
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 28px rgba(102,126,234,0.4); transition: all 0.25s;
}
.play-btn:hover { transform: scale(1.08); box-shadow: 0 12px 36px rgba(102,126,234,0.55); }
.play-btn:active { transform: scale(0.95); }
.play-btn svg { width: 28px; height: 28px; fill: currentColor; margin-left: 2px; }

.volume-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; }
.vol-icon { color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; }
.vol-icon:hover { color: #fff; }
.vol-icon svg { width: 16px; height: 16px; fill: currentColor; }
.vol-slider {
  -webkit-appearance: none; appearance: none; width: 180px; height: 3px;
  background: rgba(255,255,255,0.15); border-radius: 1.5px; outline: none; cursor: pointer;
}
.vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%;
  background: #fff; cursor: pointer; box-shadow: 0 0 8px rgba(102,126,234,0.5);
}
.vol-slider::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: #fff; cursor: pointer; border: none; box-shadow: 0 0 8px rgba(102,126,234,0.5); }
.vol-val { font-size: 12px; color: rgba(255,255,255,0.35); min-width: 32px; text-align: right; font-variant-numeric: tabular-nums; }

.lyrics-box {
  background: rgba(255,255,255,0.04); border-radius: 14px; padding: 14px 16px;
  margin-bottom: 16px; max-height: 280px; overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
}
.lyrics-box::-webkit-scrollbar { width: 4px; }
.lyrics-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
.lyric-line { font-size: 13px; line-height: 1.9; color: rgba(255,255,255,0.35); text-align: center; transition: all 0.3s; padding: 0 8px; }
.lyric-line.active { color: #fff; font-weight: 600; font-size: 15px; text-shadow: 0 0 20px rgba(102,126,234,0.5); }
.lyric-line.past { color: rgba(255,255,255,0.35); opacity: 0.5; }

.meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-size: 12px; color: rgba(255,255,255,0.35); }
.meta-item { display: flex; align-items: center; gap: 5px; }
.meta-item svg { width: 13px; height: 13px; fill: currentColor; opacity: 0.6; }

.status-badge {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(102,126,234,0.15); border: 1px solid rgba(102,126,234,0.2);
  border-radius: 20px; padding: 7px 18px; font-size: 11px; font-weight: 600;
  letter-spacing: 1.5px; color: var(--accent);
}
.status-badge.disconnected { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.2); color: #ef4444; }

.mobile-flip { display: none; }
.flip-dots { display: none; }

/* Settings overlay */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex;
  align-items: center; justify-content: center; z-index: 100;
}
.dialog {
  background: #1e1e2e; border-radius: 20px; padding: 24px;
  width: 320px; max-width: 90vw; border: 1px solid rgba(255,255,255,0.1);
  animation: fadeIn 0.3s ease;
}
.dialog-head { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.dialog-head .icon { font-size: 20px; }
.close { margin-left: auto; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 20px; cursor: pointer; }
.close:hover { color: #fff; }
label { display: block; color: rgba(255,255,255,0.5); font-size: 12px; margin: 14px 0 6px; }
input {
  width: 100%; background: #2a2a3e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
  padding: 10px 14px; color: #fff; font-size: 14px; outline: none;
}
input:focus { border-color: rgba(255,255,255,0.25); }
.colors { display: flex; justify-content: space-around; margin-top: 8px; }
.color-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; gap: 4px; }
.color-item span { font-size: 11px; color: rgba(255,255,255,0.5); }
.circle {
  width: 34px; height: 34px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff; font-size: 14px;
}
.circle.sel { box-shadow: 0 0 0 2.5px #fff; }
.rainbow-circle {
  background: conic-gradient(from var(--rainbow-angle, 0deg), #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ec4899, #ef4444);
  animation: rainbow-spin 3s linear infinite;
}
@keyframes rainbow-spin { to { --rainbow-angle: 360deg; } }
@property --rainbow-angle {
  syntax: '<angle>'; initial-value: 0deg; inherits: false;
}
.save {
  margin-top: 24px; width: 100%; padding: 12px; border: none; border-radius: 12px;
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent3));
  transition: filter 0.2s;
}
.save:hover { filter: brightness(1.1); }
.version { text-align: right; color: rgba(255,255,255,0.25); font-size: 11px; margin-top: 10px; }

/* Keep screen on toggle */
.keep-screen-row { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; padding: 0 2px; }
.keep-label { font-size: 13px; color: rgba(255,255,255,0.7); }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: rgba(255,255,255,0.15); border-radius: 24px; transition: 0.3s; }
.slider::before { content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.3s; }
.switch input:checked + .slider { background: linear-gradient(135deg, var(--accent), var(--accent3)); }
.switch input:checked + .slider::before { transform: translateX(20px); }

/* Phone landscape — compact side-by-side */
@media (orientation: landscape) and (max-height: 600px) {
  .app { padding: 0; }
  .player { flex-direction: row; gap: 16px; max-width: 100vw; width: 100%; padding: 10px 14px; align-items: center; }
  .album-wrap { width: 140px; height: 140px; }
  .album-art .placeholder { font-size: 60px; }
  .card { padding: 12px 16px; flex: 1; min-width: 0; }
  .song-title { font-size: 15px; }
  .song-artist { font-size: 11px; }
  .song-album { font-size: 10px; display: none; }
  .song-info { margin-bottom: 10px; }
  .lyrics-box { max-height: 100px; padding: 6px 8px; margin-bottom: 6px; }
  .lyric-line { font-size: 11px; line-height: 1.6; }
  .lyric-line.active { font-size: 12px; }
  .controls { gap: 12px; margin-bottom: 6px; }
  .play-btn { width: 46px; height: 46px; }
  .play-btn svg { width: 20px; height: 20px; }
  .ctrl-btn { padding: 6px; }
  .ctrl-btn svg { width: 20px; height: 20px; }
  .vol-slider { width: 200px; height: 2px; }
  .vol-slider::-webkit-slider-thumb { width: 8px; height: 8px; }
  .vol-slider::-moz-range-thumb { width: 8px; height: 8px; }
  .vol-val { display: none; }
  .progress-section { margin-bottom: 8px; }
  .progress-bar { height: 5px; }
  .time-row { font-size: 10px; margin-top: 4px; }
  .meta-row { margin-bottom: 6px; font-size: 10px; }
  .status-badge { padding: 4px 12px; font-size: 9px; }
  .album-panel { flex-shrink: 0; display: flex; align-items: center; }
  .gear { top: 8px; left: 8px; width: 36px; height: 36px; font-size: 16px; }
}

/* Pad landscape — keep side-by-side layout */
@media (min-width: 701px) and (max-width: 1200px) and (orientation: landscape) and (min-height: 601px) {
  .player { flex-direction: row; gap: 24px; max-width: 100vw; padding: 16px; }
  .album-wrap { width: 240px; height: 240px; }
  .card { padding: 24px; }
  .song-title { font-size: 18px; }
  .song-artist { font-size: 13px; }
  .lyrics-box { max-height: 200px; padding: 10px 12px; margin-bottom: 10px; }
  .controls { gap: 16px; margin-bottom: 12px; }
  .play-btn { width: 60px; height: 60px; }
  .play-btn svg { width: 26px; height: 26px; }
  .ctrl-btn svg { width: 26px; height: 26px; }
  .vol-slider { width: 160px; }
}

/* Pad portrait — vertical stack */
@media (min-width: 701px) and (max-width: 1200px) and (orientation: portrait) {
  .player { flex-direction: column; gap: 16px; max-width: 520px; padding: 16px; }
  .album-panel { flex-shrink: 0; }
  .album-wrap { width: 220px; height: 220px; }
  .card { padding: 20px; }
  .song-title { font-size: 18px; }
  .song-artist { font-size: 13px; }
  .lyrics-box { max-height: 200px; padding: 10px 12px; margin-bottom: 10px; }
  .controls { gap: 16px; margin-bottom: 12px; }
  .play-btn { width: 60px; height: 60px; }
  .play-btn svg { width: 26px; height: 26px; }
  .ctrl-btn svg { width: 26px; height: 26px; }
  .vol-slider { width: 160px; }
}

/* Mobile */
@media (max-width: 700px) {
  .player { flex-direction: column; gap: 0; background: rgba(255,255,255,0.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border-radius: 18px; padding: 20px 16px; box-shadow: 0 24px 80px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden;
    max-width: 90vw; margin: 0 auto;
  }
  .player::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle at 30% 20%, rgba(102,126,234,0.08) 0%, transparent 50%); pointer-events: none;
  }
  .card { background: none; backdrop-filter: none; -webkit-backdrop-filter: none; border-radius: 0; padding: 0; box-shadow: none; border: none; overflow: visible; }
  .card::before { display: none; }
  .song-title { font-size: 16px; }
  .play-btn { width: 48px; height: 48px; }
  .play-btn svg { width: 20px; height: 20px; }
  .ctrl-btn { padding: 8px; }
  .ctrl-btn svg { width: 22px; height: 22px; }

  .mobile-flip { display: block; position: relative; width: 100%; overflow: hidden; touch-action: pan-y; }
  .flip-track { display: flex; transition: transform 0.35s cubic-bezier(.4,0,.2,1); width: 200%; }
  .flip-page { width: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .flip-page.album-page { padding: 10px 0; }
  .flip-page.lyrics-page { padding: 0; }
  .flip-page .album-wrap { width: 200px; height: 200px; margin: 0 auto; }
  .flip-page .album-art .placeholder { font-size: 70px; }
  .flip-page .lyrics-box { max-height: 240px; width: 100%; margin: 0; }
  .flip-dots { display: flex; justify-content: center; gap: 8px; padding: 10px 0 2px; }
  .flip-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); transition: all 0.3s; }
  .flip-dot.active { background: var(--accent); width: 20px; border-radius: 4px; }

  .album-panel { display: none; }
  .card > .lyrics-box { display: none; }
}

@media (min-width: 701px) and (max-width: 1000px) {
  .album-wrap { width: 260px; height: 260px; }
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
::-webkit-scrollbar { width: 0; height: 0; }
</style>
