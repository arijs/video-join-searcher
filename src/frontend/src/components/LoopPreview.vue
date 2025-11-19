<template>
  <!-- Modal flutuante -->
  <div
    v-if="result"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-opacity"
    @click.self="close"
  >
    <div class="bg-gray-900 rounded-3xl shadow-2xl max-w-7xl w-full max-h-screen overflow-hidden border border-gray-700">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-700">
        <div>
          <h3 class="text-3xl font-bold text-white">
            Loop Perfeito Detectado!
          </h3>
          <p class="text-xl text-emerald-400 font-mono mt-2">
            {{ result.match.toFixed(3) }}% de similaridade
          </p>
        </div>
        <button
          @click="close"
          class="text-4xl text-gray-400 hover:text-white transition"
        >
          ×
        </button>
      </div>

      <!-- Informações dos vídeos -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-800/50">
        <div class="space-y-3">
          <p class="text-sm text-gray-400">Vídeo de origem (final →)</p>
          <p class="text-lg font-medium text-cyan-400 truncate">{{ result.from.name }}</p>
          <p class="text-sm text-gray-500">Resolução: {{ result.resolution }}</p>
        </div>
        <div class="space-y-3">
          <p class="text-sm text-gray-400">Vídeo de destino (→ início)</p>
          <p class="text-lg font-medium text-pink-400 truncate">{{ result.to.name }}</p>
          <p class="text-sm text-gray-500">Loop infinito garantido</p>
        </div>
      </div>

      <!-- Preview com dois players sincronizados -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 bg-black">
        <!-- Player A (origem) -->
        <div class="space-y-4">
          <h4 class="text-center text-lg font-semibold text-cyan-400">Vídeo A (final do loop)</h4>
          <video
            ref="videoA"
            :src="videoASrc"
            controls
            class="w-full rounded-xl shadow-2xl border-4 border-cyan-500/50"
            @ended="startVideoB"
          ></video>
          <div class="flex justify-center gap-4">
            <button @click="playFromEnd" class="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold transition">
              ▶ Reproduzir final (10s)
            </button>
          </div>
        </div>

        <!-- Player B (destino) -->
        <div class="space-y-4">
          <h4 class="text-center text-lg font-semibold text-pink-400">Vídeo B (início do loop)</h4>
          <video
            ref="videoB"
            :src="videoBSrc"
            controls
            loop
            class="w-full rounded-xl shadow-2xl border-4 border-pink-500/50"
          ></video>
          <div class="flex justify-center gap-4">
            <button @click="playSeamlessLoop" class="px-8 py-4 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 rounded-xl font-bold text-xl transition shadow-lg">
              ▶▶ LOOP INFINITO PERFEITO
            </button>
          </div>
        </div>
      </div>

      <!-- Miniaturas dos frames comparados -->
      <div class="flex justify-center gap-10 p-8 bg-gray-800/50 border-t border-gray-700">
        <div class="text-center">
          <p class="text-sm text-gray-400 mb-3">Último frame do Vídeo A</p>
          <img :src="result.fromThumb" class="w-48 h-48 object-cover rounded-xl shadow-2xl border-4 border-cyan-500/50" />
        </div>
        <div class="flex items-center">
          <div class="text-6xl text-emerald-400 font-bold animate-pulse">↔</div>
        </div>
        <div class="text-center">
          <p class="text-sm text-gray-400 mb-3">Primeiro frame do Vídeo B</p>
          <img :src="result.toThumb" class="w-48 h-48 object-cover rounded-xl shadow-2xl border-4 border-pink-500/50" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  result: any
}>()

const emit = defineEmits(['close'])

const videoA = ref<HTMLVideoElement | null>(null)
const videoB = ref<HTMLVideoElement | null>(null)

const videoASrc = computed(() => props.result ? `/file${props.result.from.path}` : '')
const videoBSrc = computed(() => props.result ? `/file${props.result.to.path}` : '')

watch(() => props.result, async (newVal) => {
  if (newVal) {
    await nextTick()
    if (videoA.value) videoA.value.src = videoASrc.value
    if (videoB.value) videoB.value.src = videoBSrc.value
  }
})

const close = () => {
  if (videoA.value) videoA.value.pause()
  if (videoB.value) videoB.value.pause()
  emit('close')
}

const playFromEnd = () => {
  if (!videoA.value) return
  const duration = videoA.value.duration || 0
  videoA.value.currentTime = Math.max(0, duration - 10)
  videoA.value.play()
}

const startVideoB = () => {
  if (videoB.value) {
    videoB.value.currentTime = 0
    videoB.value.play()
  }
}

const playSeamlessLoop = () => {
  playFromEnd()
}
</script>

<style scoped>
video {
  max-height: 60vh;
  background: #000;
}
</style>