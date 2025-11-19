<template>
  <div class="bg-gray-800/90 backdrop-blur rounded-2xl p-8 shadow-2xl border border-gray-700">
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-white">Filtros Avançados</h2>
      <div class="text-2xl font-mono font-bold text-emerald-400">
        {{ store.matchedVideos }} / {{ store.totalVideos }} vídeos
      </div>
    </div>

    <!-- Regex Rules -->
    <section class="mb-10">
      <h3 class="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-3">
        <span class="text-2xl">1.</span> Regras Regex (opcional)
      </h3>
      <div v-for="(rule, i) in regexRules" :key="i" class="flex flex-wrap gap-3 mb-3 items-center">
        <input
          v-model="rule.pattern"
          placeholder="ex: ^intro|loop$"
          class="flex-1 min-w-72 px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
        />
        <select v-model="rule.mode" class="px-5 py-3 bg-gray-700 rounded-lg">
          <option value="positive">+ Positivo</option>
          <option value="negative">- Negativo</option>
        </select>
        <select v-model="rule.target" class="px-5 py-3 bg-gray-700 rounded-lg">
          <option value="name">Nome (sem ext)</option>
          <option value="ext">Extensão</option>
          <option value="full">Nome completo</option>
        </select>
        <button @click="removeRule(i)" class="text-red-400 hover:text-red-300 text-3xl">×</button>
      </div>
      <button @click="addRule" class="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
        + Adicionar regra regex
      </button>
    </section>

    <!-- Size Filters -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Tamanho mínimo (MB)</label>
        <input v-model.number="filters.sizeMin" type="number" step="0.1" placeholder="0" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Tamanho máximo (MB)</label>
        <input v-model.number="filters.sizeMax" type="number" step="0.1" placeholder="∞" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
    </section>

    <!-- Dates -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Data de criação</label>
        <div class="grid grid-cols-2 gap-4">
          <input v-model="filters.createdAfter" type="date" class="px-4 py-3 bg-gray-700 rounded-lg" />
          <input v-model="filters.createdBefore" type="date" class="px-4 py-3 bg-gray-700 rounded-lg" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Data de modificação</label>
        <div class="grid grid-cols-2 gap-4">
          <input v-model="filters.modifiedAfter" type="date" class="px-4 py-3 bg-gray-700 rounded-lg" />
          <input v-model="filters.modifiedBefore" type="date" class="px-4 py-3 bg-gray-700 rounded-lg" />
        </div>
      </div>
    </section>

    <!-- Duration & Aspect Ratio -->
    <section class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Duração mínima</label>
        <input v-model="durationMinInput" placeholder="ex: 30, 1:23 ou 01:23:45" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Duração máxima</label>
        <input v-model="durationMaxInput" placeholder="ex: 300, 5:00" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio mínimo</label>
        <input v-model="aspectMinInput" placeholder="ex: 1.777 ou 16:9" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio máximo</label>
        <input v-model="aspectMaxInput" placeholder="ex: 2.39 ou 21:9" class="w-full px-4 py-3 bg-gray-700 rounded-lg" />
      </div>
    </section>

    <!-- Resolution -->
    <section class="mb-10">
      <h3 class="text-xl font-semibold text-cyan-400 mb-4">Resolução (pixels)</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <label class="block text-xs text-gray-400">Largura mín</label>
          <input v-model.number="filters.widthMin" type="number" placeholder="0" class="w-full px-4 py-3 bg-gray-700 rounded-lg mt-1" />
        </div>
        <div>
          <label class="block text-xs text-gray-400">Largura máx</label>
          <input v-model.number="filters.widthMax" type="number" placeholder="∞" class="w-full px-4 py-3 bg-gray-700 rounded-lg mt-1" />
        </div>
        <div>
          <label class="block text-xs text-gray-400">Altura mín</label>
          <input v-model.number="filters.heightMin" type="number" placeholder="0" class="w-full px-4 py-3 bg-gray-700 rounded-lg mt-1" />
        </div>
        <div>
          <label class="block text-xs text-gray-400">Altura máx</label>
          <input v-model.number="filters.heightMax" type="number" placeholder="∞" class="w-full px-4 py-3 bg-gray-700 rounded-lg mt-1" />
        </div>
      </div>
    </section>

    <!-- Apply Button -->
    <div class="text-center pt-6">
      <button
        @click="applyFilters"
        :disabled="isApplying || !store.selectedFolder"
        class="px-16 py-5 text-2xl font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isApplying ? 'bg-orange-600' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'"
      >
        {{ isApplying ? 'Aplicando filtros...' : 'APLICAR FILTROS' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

const store = useLoopStore()

// Regex rules
const regexRules = ref([
  { pattern: '', mode: 'positive' as const, target: 'name' as const }
])

// Filters state
const filters = ref({
  sizeMin: null as number | null,
  sizeMax: null as number | null,
  createdAfter: '',
  createdBefore: '',
  modifiedAfter: '',
  modifiedBefore: '',
  widthMin: null as number | null,
  widthMax: null as number | null,
  heightMin: null as number | null,
  heightMax: null as number | null,
})

const durationMinInput = ref('')
const durationMaxInput = ref('')
const aspectMinInput = ref('')
const aspectMaxInput = ref('')

const isApplying = ref(false)

// Parsing helpers
const parseDuration = (input: string): number | null => {
  if (!input.trim()) return null
  const parts = input.split(':').map(Number)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

const parseAspect = (input: string): number | null => {
  if (!input.trim()) return null
  if (input.includes(':')) {
    const [w, h] = input.split(':').map(Number)
    return w && h ? w / h : null
  }
  const n = parseFloat(input)
  return isNaN(n) ? null : n
}

// Actions
const addRule = () => regexRules.value.push({ pattern: '', mode: 'positive', target: 'name' })
const removeRule = (i: number) => regexRules.value.splice(i, 1)

const applyFilters = async () => {
  if (!store.selectedFolder) return

  isApplying.value = true

  await fetch('/api/apply-filters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      regexRules: regexRules.value.filter(r => r.pattern.trim()),
      filters: {
        ...filters.value,
        durationMin: parseDuration(durationMinInput.value),
        durationMax: parseDuration(durationMaxInput.value),
        aspectMin: parseAspect(aspectMinInput.value),
        aspectMax: parseAspect(aspectMaxInput.value),
      }
    })
  })

  isApplying.value = false
}
</script>