<template>
  <div class="controls">
    <button class="ctrl-btn" @click="skipPrev">&#9198;</button>
    <button class="ctrl-btn" @click="seek(-10)">&#9194;10</button>
    <button class="play-btn" @click="togglePlay" :style="playStyle">
      {{ state.isPlaying ? '\u275A\u275A' : '\u25B6' }}
    </button>
    <button class="ctrl-btn" @click="seek(10)">10&#9197;</button>
    <button class="ctrl-btn" @click="skipNext">&#9197;</button>
  </div>
</template>

<script setup>
const props = defineProps({
  state: Object, theme: Object,
  togglePlay: Function, skipPrev: Function, skipNext: Function, seek: Function,
})
const playStyle = { background: `linear-gradient(135deg, ${props.theme.accent}, ${props.theme.accent3})` }
</script>

<style scoped>
.controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
.ctrl-btn {
  background: none; border: none; color: #fffc; font-size: 22px; cursor: pointer;
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
}
.ctrl-btn:hover { color: #fff; background: #ffffff0d; }
.play-btn {
  border: none; color: #fff; font-size: 20px; cursor: pointer;
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.play-btn:hover { filter: brightness(1.1); }
</style>
