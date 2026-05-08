<template>
  <div class="album-panel" :style="panelStyle">
    <img v-if="state.picUrl" :src="state.picUrl" @error="fallback = true" />
    <div v-else class="placeholder">
      <span class="icon">&#9835;</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ state: Object, theme: Object, size: { type: Number, default: 240 } })
const fallback = ref(false)
const panelStyle = computed(() => ({
  width: props.size + 'px', height: props.size + 'px',
  background: `linear-gradient(135deg, ${props.theme.accent}44, ${props.theme.accent2}22)`,
  border: `1px solid ${props.theme.accent}1f`,
}))
</script>

<style scoped>
.album-panel {
  border-radius: 16px; overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.album-panel img { width: 100%; height: 100%; object-fit: cover; }
.placeholder .icon { font-size: 80px; opacity: .3; color: #fff; }
</style>
