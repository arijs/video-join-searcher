<template>
  <details class="bg-gray-800 backdrop-blur rounded-xl p-4 text-sm border border-gray-700">
    <summary class="cursor-pointer font-semibold text-cyan-300 select-none">Store Inspector</summary>
    <div class="mt-4 space-y-3">
      <div>
        <h3 class="text-gray-300 font-medium mb-2">Propriedades Simples</h3>
        <ul class="space-y-1 font-mono">
          <li v-for="(val, key) in simpleEntries" :key="key">
            <span class="text-purple-300">{{ key }}:</span>
            <span class="text-gray-200">{{ formatValue(val) }}</span>
          </li>
        </ul>
      </div>
      <div v-for="(arr, key) in arrayObjectEntries" :key="key">
        <details class="border border-gray-700 rounded-lg">
          <summary class="px-3 py-2 bg-gray-700 hover:bg-gray-600 transition cursor-pointer flex items-center gap-2">
            <span class="font-semibold text-emerald-300">{{ key }}</span>
            <span class="text-xs text-gray-400">({{ arr.length }})</span>
          </summary>
          <div class="p-3 space-y-3 max-h-96 overflow-auto bg-gray-900/40">
            <div v-if="arr.length === 0" class="italic text-gray-500">Lista vazia</div>
            <div
              v-for="(item, i) in arr"
              :key="i"
              class="border border-gray-700 rounded p-2 bg-gray-800/60"
            >
              <div class="text-xs text-gray-400 mb-1">#{{ i + 1 }}</div>
              <pre class="whitespace-pre-wrap leading-snug text-[11px]">{{ JSON.stringify(item, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

/**
 * Componente StoreInspector
 * Exibe propriedades simples do Pinia store e abre <details> para arrays de objetos.
 */
const store = useLoopStore()

// Helper para detectar array de objetos (exclui null, exclui arrays vazias? vazias entram como lista vazia)
const isArrayOfObjects = (val: unknown): val is Record<string, any>[] => {
  return Array.isArray(val) && (val.length === 0 || typeof val[0] === 'object' && val[0] !== null && !Array.isArray(val[0]))
}

// Filtra propriedades simples (string, number, boolean, plain object não-array-of-objects)
const simpleEntries = computed<Record<string, unknown>>(() => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(store)) {
    // Ignorar funções e WebSocket
    const val: any = (store as any)[key]
    if (typeof val === 'function') continue
    if (val instanceof WebSocket) continue
    if (isArrayOfObjects(val)) continue
    // Arrays simples (ex: de números) podem ser mostradas direto
    out[key] = val
  }
  return out
})

// Propriedades que são arrays de objetos
const arrayObjectEntries = computed<Record<string, Record<string, any>[]>>(() => {
  const out: Record<string, Record<string, any>[]> = {}
  for (const key of Object.keys(store)) {
    const val: any = (store as any)[key]
    if (isArrayOfObjects(val)) out[key] = val as any[]
  }
  return out
})

const formatValue = (val: unknown): string => {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
</script>

<style scoped>
details > summary::-webkit-details-marker { display: none; }
details[open] > summary { background-color: #374151; }
</style>
