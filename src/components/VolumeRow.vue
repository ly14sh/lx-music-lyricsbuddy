<template>
  <div class="volume-row">
    <button class="mute-btn" @click="toggleMute">{{ state.mute ? '\uD83D\uDD07' : state.volume < 30 ? '\uD83D\uDD09' : '\uD83D\uDD0A' }}</button>
    <input type="range" min="0" max="100" :value="state.mute ? 0 : state.volume"
      @input="e => setVolume(+e.target.value)" :style="trackStyle" />
    <span class="vol-num">{{ state.mute ? 0 : state.volume }}%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ state: Object, theme: Object, setVolume: Function, toggleMute: Function })
const trackStyle = computed(() => ({ '--accent': props.theme.accent }))
</script>

<style scoped>
.volume-row { display: flex; align-items: center; gap: 8px; }
.mute-btn { background: none; border: none; font-size: 18px; cursor: pointer; }
input[type=range] {
  -webkit-appearance: none; flex: 1; height: 2px; border-radius: 1px;
  background: #ffffff1a; outline: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); cursor: pointer;
}
.vol-num { color: #fff8; font-size: 11px; width: 32px; text-align: right; }
</style>
