<template>
  <div class="bg-gray-800/90 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-white flex items-center gap-4">
        <span class="text-cyan-400">Vídeos Analisados</span>
        <span class="text-2xl font-mono text-emerald-400">
          {{ store.filteredVideos.length }} 
          <span class="text-gray-500">de {{ store.allVideos.length }}</span>
        </span>
      </h2>
      <div class="text-sm text-gray-400">
        Duração total: {{ formatDuration(totalDuration) }}
      </div>
    </div>

    <!-- Tabela -->
    <div class="overflow-x-auto rounded-xl border border-gray-700">
      <table class="w-full text-left">
        <thead class="bg-gray-900/80">
          <tr>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300">#</th>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300">Nome do Arquivo</th>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300 text-right">Tamanho</th>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300 text-center">Duração</th>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300 text-center">Resolução</th>
            <th class="px-6 py-4 text-sm font-semibold text-gray-300 text-center">Aspect Ratio</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="(video, index) in store.filteredVideos"
            :key="video.path"
            class="hover:bg-gray-700/50 transition duration-200"
          >
            <td class="px-6 py-4 text-sm text-gray-400 font-mono">{{ index + 1 }}</td>
            <td class="px-6 py-4 text-sm text-white font-medium truncate max-w-md" :title="video.name">
              {{ video.name }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-300 text-right font-mono">
              {{ formatSize(video.size) }}
            </td>
            <td class="px-6 py-4 text-sm text-center">
              <span class="font-mono text-emerald-400" v-if="video.duration">
                {{ formatDuration(video.duration) }}
              </span>
              <span class="text-gray-500 italic" v-else>—</span>
            </td>
            <td class="px-6 py-4 text-sm text-center font-mono text-cyan-400">
              {{ video.width && video.height ? `${video.width}×${video.height}` : '—' }}
            </td>
            <td class="px-6 py-4 text-sm text-center font-mono text-purple-400">
              {{ aspectRatio(video) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Caso não tenha vídeos filtrados -->
      <div v-if="store.filteredVideos.length === 0" class="text-center py-16 text-gray-500">
        <p class="text-xl">Nenhum vídeo corresponde aos filtros atuais</p>
        <p class="text-sm mt-2">Tente ajustar ou remover alguns filtros</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

const store = useLoopStore()

// Total de duração de todos os vídeos filtrados
const totalDuration = computed(() => {
  return store.filteredVideos.reduce((sum, v) => sum + (v.duration || 0), 0)
})

// Formatação de tamanho
const formatSize = (bytes: number): string => {
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 ** 3) return (bytes / (1024 ** 2)).toFixed(2) + ' MB'
  return (bytes / (1024 ** 3)).toFixed(2) + ' GB'
}

// Formatação de duração (segundos → HH:MM:SS ou MM:SS)
const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
               : `${m}:${s.toString().padStart(2, '0')}`
}

// Aspect Ratio amigável
const aspectRatio = (video: any): string => {
  if (!video.width || !video.height) return '—'
  const ratio = video.width / video.height
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a
  const d = gcd(video.width, video.height)
  const w = video.width / d
  const h = video.height / d

  // Nomes comuns
  if (w === 16 && h === 9) return '16:9'
  if (w === 4 && h === 3) return '4:3'
  if (w === 21 && h === 9) return '21:9'
  if (w === 1 && h === 1) return '1:1'
  return `${w}:${h} (${ratio.toFixed(3)})`
}
</script>

<style scoped>
table {
  border-collapse: separate;
  border-spacing: 0;
}
thead th {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>