<template>
  <div class="lyrics-box" ref="box">
    <div v-if="!lyrics.length" class="empty">No lyrics</div>
    <div v-for="(l, i) in lyrics" :key="i" class="line" :class="{ active: i === currentLyricIndex }"
      :style="i === currentLyricIndex ? { color: theme.accent } : {}">
      {{ l.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ lyrics: Array, currentLyricIndex: Number, theme: Object })
const box = ref(null)

watch(() => props.currentLyricIndex, (idx) => {
  if (idx < 0 || !box.value) return
  const el = box.value.children[idx + 1] // +1 for empty div
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
})
</script>

<style scoped>
.lyrics-box {
  overflow-y: auto; padding: 40px 12px; flex: 1; min-height: 120px;
  mask-image: linear-gradient(transparent, #000 15%, #000 85%, transparent);
  -webkit-mask-image: linear-gradient(transparent, #000 15%, #000 85%, transparent);
}
.empty { color: #fff3; text-align: center; padding: 30px; font-size: 14px; }
.line {
  text-align: center; padding: 6px 0; font-size: 13px; color: #fff5;
  transition: color .3s, font-size .3s;
}
.line.active { font-size: 15px; font-weight: 600; }
</style>
