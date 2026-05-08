export const themes = [
  { name: 'purple', label: '紫', accent: '#667eea', accent2: '#a855f7', accent3: '#764ba2',
    bg1: '#0f0c29', bg2: '#302b63', bg3: '#24243e' },
  { name: 'red', label: '红', accent: '#ef4444', accent2: '#f97316', accent3: '#dc2626',
    bg1: '#1a0a0a', bg2: '#3d1515', bg3: '#2d1010' },
  { name: 'yellow', label: '黄', accent: '#f59e0b', accent2: '#eab308', accent3: '#d97706',
    bg1: '#1a1508', bg2: '#3d3010', bg3: '#2d2410' },
  { name: 'blue', label: '蓝', accent: '#3b82f6', accent2: '#06b6d4', accent3: '#2563eb',
    bg1: '#0a0f1a', bg2: '#152040', bg3: '#101830' },
  { name: 'green', label: '绿', accent: '#10b981', accent2: '#34d399', accent3: '#059669',
    bg1: '#0a1a12', bg2: '#153d28', bg3: '#102d1e' },
]

export function getTheme(index) { return themes[index] || themes[0] }

export function applyThemeVars(el, t) {
  const s = el.style
  s.setProperty('--bg1', t.bg1); s.setProperty('--bg2', t.bg2); s.setProperty('--bg3', t.bg3)
  s.setProperty('--accent', t.accent); s.setProperty('--accent2', t.accent2); s.setProperty('--accent3', t.accent3)
}
