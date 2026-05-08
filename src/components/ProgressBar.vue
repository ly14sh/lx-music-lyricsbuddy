<template>
  <div class="progress-bar">
    <input type="range" :min="0" :max="state.duration || 1" :value="dragVal ?? state.progress"
      step="0.1" @input="onDrag" @change="onChange" :style="trackStyle" />
    <div class="time-row">
      <span>{{ fmtTime(dragVal ?? state.progress) }}</span>
      <span>{{ fmtTime(state.duration) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const props = defineProps({ state: Object, theme: Object, fmtTime: Function, onSeek: Function })
const dragVal = ref(null)
function onDrag(e) { dragVal.value = +e.target.value }
function onChange(e) { props.onSeek(+e.target.value); dragVal.value = null }
const trackStyle = computed(() => ({
  '--accent': props.theme.accent,
}))
</script>

<style scoped>
.progress-bar { width: 100%; }
input[type=range] {
  -webkit-appearance: none; width: 100%; height: 3px; border-radius: 2px;
  background: linear-gradient(to right, var(--accent) 0%, var(--accent) var(--pct, 0%), #ffffff1a var(--pct, 0%), #ffffff1a 100%);
  outline: none;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
  background: var(--accent); cursor: pointer;
}
.time-row { display: flex; justify-content: space-between; padding: 4px 2px; }
.time-row span { color: #fff9; font-size: 11px; }
</style>
