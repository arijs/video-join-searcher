<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
    <!-- Header -->
    <header class="text-center py-12 px-6">
      <h1 class="text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-2xl">
        Seamless Loop Finder
      </h1>
      <p class="mt-4 text-lg text-gray-300">Encontre loops de vídeo perfeitos ou quase perfeitos em qualquer pasta</p>
    </header>

    <main class="max-w-7xl mx-auto px-6 pb-20 space-y-16">
      <!-- Explorador de Pastas -->
      <FileExplorer />

      <StoreInspector />

      <!-- Se uma pasta foi selecionada -->
      <div v-if="store.selectedFolder && store.allVideos.length > 0" class="space-y-16 animate-fade-in">
        <!-- Filtros Avançados -->
        <FilterPanel />

        <!-- Slider de Threshold + Botão Principal -->
        <div class="text-center space-y-8 bg-gray-800/50 backdrop-blur rounded-2xl p-10 shadow-2xl border border-gray-700">
          <div class="space-y-4">
            <label class="text-2xl font-semibold">
              Threshold mínimo: <span class="font-mono text-3xl text-emerald-400">{{ store.threshold.toFixed(1) }}%</span>
            </label>
            <input
              type="range"
              v-model.number="store.threshold"
              min="0"
              max="100"
              step="0.1"
              class="w-full h-4 bg-gray-700 rounded-full appearance-none cursor-pointer slider-thumb"
            />
          </div>

          <button
            @click="startComparison"
            :disabled="store.isProcessing"
            class="px-20 py-8 text-3xl font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed
                   bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700"
          >
            {{ store.isProcessing ? 'Processando...' : 'ENCONTRAR LOOPS PERFEITOS AGORA' }}
          </button>
        </div>

        <!-- Tabela de Vídeos Filtrados (opcional) -->
        <VideoTable />

        <!-- Resultados -->
        <ResultsTable @preview="openPreview" />
      </div>

      <!-- Mensagem quando ainda não selecionou pasta -->
      <div v-if="!store.selectedFolder" class="text-center py-20">
        <p class="text-3xl text-gray-400">Selecione uma pasta acima para começar a análise</p>
      </div>
    </main>

    <!-- Componentes flutuantes -->
    <ProgressOverlay />
    <LoopPreview :result="previewResult" @close="previewResult = null" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useLoopStore } from './stores/useLoopStore'

// Componentes
import FileExplorer from './components/FileExplorer.vue'
import FilterPanel from './components/FilterPanel.vue'
import VideoTable from './components/VideoTable.vue'
import ResultsTable from './components/ResultsTable.vue'
import ProgressOverlay from './components/ProgressOverlay.vue'
import LoopPreview from './components/LoopPreview.vue'
import StoreInspector from './components/StoreInspector.vue'

const store = useLoopStore()
const previewResult = ref<any>(null)

const startComparison = () => {
  store.results = []
  fetch('/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threshold: store.threshold })
  })
}

const openPreview = (result: any) => {
  previewResult.value = result
}

onMounted(() => {
  store.connect()
  console.log('WebSocket conectado automaticamente no App.vue')
})
</script>

<style scoped>
@reference "tailwindcss";
@reference "./assets/main.css";

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.slider-thumb::-webkit-slider-thumb {
  @apply appearance-none w-8 h-8 bg-cyan-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing;
}
.slider-thumb::-moz-range-thumb {
  @apply w-8 h-8 bg-cyan-500 rounded-full shadow-lg border-0 cursor-grab active:cursor-grabbing;
}
</style>