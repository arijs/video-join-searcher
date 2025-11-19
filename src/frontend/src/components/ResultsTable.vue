<template>
  <div class="bg-gray-800 rounded-xl shadow-xl">
    <div class="p-6 border-b border-gray-700 flex justify-between items-center">
      <h2 class="text-2xl font-bold">Loops Encontrados ({{ visibleResults.length }})</h2>
      <button @click="exportCsv" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
        Exportar CSV
      </button>
    </div>

    <table class="w-full">
      <thead class="bg-gray-900">
        <tr>
          <th class="p-4 text-left">De</th>
          <th class="p-4 text-left">Para</th>
          <th class="p-4 text-center">Match</th>
          <th class="p-4 text-center">Resolução</th>
          <th class="p-4 text-center">Frames</th>
          <th class="p-4 text-center">Preview</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in visibleResults"
          :key="r.id"
          :class="getRowClass(r.match)"
          class="border-t border-gray-700 hover:bg-gray-700/50 transition"
        >
          <td class="p-4 font-medium truncate max-w-xs">{{ r.from.name }}</td>
          <td class="p-4 font-medium truncate max-w-xs">{{ r.to.name }}</td>
          <td class="p-4 text-center font-bold text-xl">{{ r.match.toFixed(2) }}%</td>
          <td class="p-4 text-center">{{ r.resolution }}</td>
          <td class="p-4">
            <div class="flex justify-center gap-2">
              <img :src="r.fromThumb" class="w-24 h-24 object-cover rounded shadow" />
              <img :src="r.toThumb" class="w-24 h-24 object-cover rounded shadow" />
              <img :src="r.diffThumb" v-if="r.diffThumb" class="w-24 h-24 object-cover rounded shadow" />
            </div>
          </td>
          <td class="p-4 text-center">
            <button @click="preview(r)" class="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm">
              ▶ Play1
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

const store = useLoopStore()
const emit = defineEmits(['preview'])

const visibleResults = computed(() =>
  store.results
    .filter(r => r.match >= store.threshold)
    .sort((a, b) => b.match - a.match)
)

function getRowClass(match: number) {
  if (match >= 99.5) return 'bg-green-900/70'
  if (match >= 97) return 'bg-yellow-900/50'
  return ''
}

function preview(r: any) {
  emit('preview', r)
}

function exportCsv() {
  // implementação simples de CSV
  const rows = [['De', 'Para', 'Match %', 'Resolução'].join(','), ...visibleResults.value.map(r => `"${r.from.name}","${r.to.name}",${r.match.toFixed(2)},${r.resolution}`).join('\n')]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'seamless-loops.csv'
  a.click()
}
</script>