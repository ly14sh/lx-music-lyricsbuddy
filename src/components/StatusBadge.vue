<template>
  <div class="badge" :style="badgeStyle">
    <span class="dot" :style="{ background: connected ? theme.accent : '#ef4444' }"></span>
    <span class="text">{{ connected ? (state.isPlaying ? 'PLAYING' : 'PAUSED') : 'OFFLINE' }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ connected: Boolean, state: Object, theme: Object })
const badgeStyle = computed(() => ({
  background: (props.connected ? props.theme.accent : '#ef4444') + '18',
  border: `1px solid ${(props.connected ? props.theme.accent : '#ef4444')}30`,
}))
</script>

<style scoped>
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; border-radius: 12px;
}
.dot { width: 6px; height: 6px; border-radius: 50%; }
.text { font-size: 10px; font-weight: 600; letter-spacing: .5px; color: #fff9; }
</style>
