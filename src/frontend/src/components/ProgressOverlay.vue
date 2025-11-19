<template>
  <!-- Overlay escuro que cobre tudo quando há progresso ativo -->
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300"
    :class="isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'"
  >
    <div class="bg-gray-900 rounded-3xl shadow-2xl p-10 max-w-lg w-full mx-4 border border-gray-700">
      <!-- Título da fase atual -->
      <h3 class="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
        {{ store.progress.phase || 'Processando...' }}
      </h3>

      <!-- Contador grande -->
      <div class="text-center mb-8">
        <div class="text-6xl font-mono font-bold text-emerald-400 tabular-nums">
          {{ formattedCurrent }}
        </div>
        <div class="text-2xl text-gray-400 mt- mt-2">de {{ formattedTotal }}</div>
      </div>

      <!-- Barra de progresso estilizada -->
      <div class="relative w-full h-12 bg-gray-800 rounded-full overflow-hidden mb-8 shadow-inner">
        <div
          class="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-500 ease-out"
          :style="{ width: progressPercentage + '%' }"
        >
          <div class="absolute inset-0 bg-white/20 animate-shine"></div>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-2xl font-bold text-white drop-shadow-lg">
            {{ progressPercentage.toFixed(1) }}%
          </span>
        </div>
      </div>

      <!-- Mensagem adicional -->
      <p v-if="store.progress.message" class="text-center text-lg text-gray-300 mb-8">
        {{ store.progress.message }}
      </p>

      <!-- Botões de controle -->
      <div class="flex justify-center gap-6">
        <!-- Pausar / Retomar -->
        <button
          @click="togglePause"
          class="px-8 py-4 rounded-xl font-bold text-xl transition transform hover:scale-105 shadow-lg"
          :class="store.progress.phase.includes('thumbnails') || store.progress.phase.includes('Comparando')
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-gray-600 cursor-not-allowed opacity-50'"
          :disabled="!canPause"
        >
          {{ isPaused ? '▶ Retomar' : '⏸ Pausar' }}
        </button>

        <!-- Cancelar -->
        <button
          @click="cancelOperation"
          class="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-xl transition transform hover:scale-105 shadow-lg"
          :disabled="!canCancel"
        >
          ✕ Cancelar
        </button>
      </div>

      <!-- Dica sutil -->
      <p class="text-center text-sm text-gray-500 mt-8">
        Você pode minimizar a janela — o processo continua em segundo plano
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

const store = useLoopStore()

// Mostra o overlay apenas quando há uma fase ativa (exceto quando concluído)
const isVisible = computed(() => {
  const phase = store.progress.phase
  return phase && !phase.includes('Scan concluído!') && !phase.includes('Cancelado')
})

// Pausa só faz sentido durante geração de thumbnails ou comparação
const canPause = computed(() => {
  const phase = store.progress.phase.toLowerCase()
  return phase.includes('thumbnail') || phase.includes('comparando') || phase.includes('procurando')
})

const canCancel = computed(() => {
  return store.progress.total > 0 && store.progress.phase !== ''
})

const isPaused = computed(() => {
  // Aqui assumimos que o backend controla isso — você pode adicionar um campo no store se quiser
  return false // será controlado pelo botão
})

const progressPercentage = computed(() => {
  if (store.progress.total === 0) return 0
  return (store.progress.current / store.progress.total) * 100
})

const formattedCurrent = computed(() => {
  return store.progress.current.toLocaleString('pt-BR')
})

const formattedTotal = computed(() => {
  return store.progress.total.toLocaleString('pt-BR')
})

const togglePause = () => {
  const pause = !isPaused.value
  fetch('/api/pause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pause })
  })
}

const cancelOperation = () => {
  if (confirm('Tem certeza que deseja cancelar a operação atual?')) {
    fetch('/api/cancel', { method: 'POST' }) // você pode implementar essa rota se quiser
    store.progress = { phase: 'Cancelado pelo usuário', current: 0, total: 0 }
  }
}
</script>

<style scoped>
.animate-shine {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
   100% { transform: translateX(100%); }
}
</style>