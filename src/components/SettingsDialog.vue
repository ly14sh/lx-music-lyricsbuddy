<template>
  <div class="overlay" @click.self="$emit('close')">
    <div class="dialog" :style="dialogStyle">
      <div class="head">
        <span class="icon">&#9881;</span> Settings
        <button class="close" @click="$emit('close')">&times;</button>
      </div>
      <label>IP / Domain</label>
      <input v-model="host" placeholder="192.168.1.x" />
      <label>Port</label>
      <input v-model.number="port" type="number" placeholder="23330" />
      <label>Color Theme</label>
      <div class="colors">
        <div v-for="(t, i) in themes" :key="i" class="color-item" @click="themeIndex = i">
          <div class="circle" :class="{ sel: i === themeIndex }"
            :style="{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent3})` }">
            <span v-if="i === themeIndex">&#10003;</span>
          </div>
          <span>{{ t.label }}</span>
        </div>
      </div>
      <button class="save" :style="saveStyle" @click="onSave">Save</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { themes } from '../themes.js'

const props = defineProps({ config: Object, theme: Object })
const emit = defineEmits(['close', 'save'])

const host = ref(props.config.host)
const port = ref(props.config.port)
const themeIndex = ref(props.config.themeIndex)

const dialogStyle = computed(() => ({ borderColor: props.theme.accent + '33' }))
const saveStyle = computed(() => ({ background: props.theme.accent }))

function onSave() {
  if (!host.value.trim()) return
  emit('save', { host: host.value.trim(), port: port.value, themeIndex: themeIndex.value })
  emit('close')
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: #000a; display: flex;
  align-items: center; justify-content: center; z-index: 100;
}
.dialog {
  background: #1e1e2e; border-radius: 20px; padding: 24px;
  width: 320px; max-width: 90vw; border: 1px solid #fff1;
}
.head { display: flex; align-items: center; gap: 8px; color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 20px; }
.head .icon { font-size: 20px; }
.close { margin-left: auto; background: none; border: none; color: #fff6; font-size: 20px; cursor: pointer; }
label { display: block; color: #fff7; font-size: 12px; margin: 14px 0 6px; }
input {
  width: 100%; background: #2a2a3e; border: 1px solid #fff1; border-radius: 10px;
  padding: 10px 14px; color: #fff; font-size: 14px; outline: none;
}
input:focus { border-color: #fff3; }
.colors { display: flex; justify-content: space-around; margin-top: 8px; }
.color-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; gap: 4px; }
.color-item span { font-size: 11px; color: #fff7; }
.circle {
  width: 34px; height: 34px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff; font-size: 14px;
}
.circle.sel { box-shadow: 0 0 0 2.5px #fff; }
.save {
  margin-top: 24px; width: 100%; padding: 12px; border: none; border-radius: 12px;
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
}
.save:hover { filter: brightness(1.1); }
</style>
