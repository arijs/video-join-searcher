<template>
  <div class="bg-gray-800/90 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-gray-700">
    <h2 class="text-3xl font-bold mb-6 flex items-center justify-between">
      <span>Explorador de Arquivos</span>
      <button
        @click="goToRoot"
        class="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        title="Voltar à raiz do sistema"
      >
        Raiz do SO
      </button>
    </h2>

    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
      <button @click="goToRoot" class="hover:text-white transition">Raiz</button>
      <span v-for="(part, i) in breadcrumb" :key="i">
        <span class="mx-2">/</span>
        <button
          @click="navigateToPath(breadcrumb.slice(0, i + 1).join('/'))"
          class="hover:text-white transition font-medium"
        >
          {{ part }}
        </button>
      </span>
    </div>

    <!-- Current Path -->
    <div class="font-mono text-lg mb-6 text-cyan-400 break-all">
      {{ currentPath || 'Selecione uma unidade ou pasta para começar' }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      <p class="mt-4 text-gray-400">Carregando conteúdo...</p>
    </div>

    <!-- Directory Contents -->
    <div v-else-if="items.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 mb-8">
      <!-- Parent Directory -->
      <button
        v-if="hasParent"
        @click="goUp"
        class="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-xl transition transform hover:scale-105 shadow-lg"
      >
        <div class="text-5xl mb-2">⬆</div>
        <div class="text-sm font-medium">.. (voltar)</div>
      </button>

      <!-- Folders and Videos -->
      <button
        v-for="item in items"
        :key="item.name"
        @click="item.isDir ? openFolder(item.name) : null"
        class="flex flex-col items-center justify-center p-6 rounded-xl transition transform hover:scale-105 shadow-lg"
        :class="item.isDir ? 'bg-gradient-to-br from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600' : 'bg-gradient-to-br from-cyan-700 to-blue-700 opacity-80'"
      >
        <div class="text-5xl mb-3">
          {{ item.isDir ? '📁' : '🎬' }}
        </div>
        <div class="text-center text-sm font-medium truncate w-full px-2">
          {{ item.name }}
        </div>
        <div v-if="!item.isDir && item.size" class="text-xs text-gray-300 mt-1">
          {{ formatSize(item.size) }}
        </div>
      </button>
    </div>

    <!-- Empty Directory -->
    <div v-else class="text-center py-16 text-gray-500">
      <p class="text-xl">Pasta vazia ou sem vídeos</p>
    </div>

    <!-- Select Button -->
    <div v-if="currentPath && videoCount > 0" class="text-center mt-10">
      <button
        @click="selectCurrentFolder"
        :disabled="selecting"
        class="px-12 py-6 text-2xl font-bold rounded-xl shadow-2xl transition transform hover:scale-105 disabled:opacity-60"
        :class="selecting ? 'bg-orange-600' : 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700'"
      >
        {{ selecting ? 'Analisando pasta...' : `ANALISAR ESTA PASTA (${videoCount} vídeos)` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLoopStore } from '../stores/useLoopStore'

const store = useLoopStore()

const currentPath = ref<string>('')
const items = ref<{ name: string; isDir: boolean; size?: number }[]>([])
const loading = ref(true)
const selecting = ref(false)

const videoCount = computed(() => {
  return items.value.filter(i => !i.isDir).length
})

const hasParent = computed(() => {
  return currentPath.value !== '' && !currentPath.value.endsWith(':/') && !currentPath.value.endsWith(':\\')
})

const breadcrumb = computed(() => {
  if (!currentPath.value) return []
  const parts = currentPath.value.replace(/\\/g, '/').split('/')
  return parts.filter(p => p)
})

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const loadDirectory = async (path: string) => {
  loading.value = true
  currentPath.value = path

  const res = await fetch(`/api/list?path=${encodeURIComponent(path)}`)
  if (res.ok) {
    const data = await res.json()
    items.value = data.items || []
    store.allVideos = items.value.filter(i => !i.isDir).map(i => ({
      name: i.name,
      path: `${currentPath.value}/${i.name}`,
      size: i.size || 0,
      mtime: -1, // Não temos essa info aqui
    }))
  } else {
    items.value = []
  }
  loading.value = false
}

const openFolder = (folderName: string) => {
  const newPath = currentPath.value ? `${currentPath.value}/${folderName}` : folderName
  loadDirectory(newPath.replace('//', '/'))
}

const goUp = () => {
  const parts = currentPath.value.replace(/\\/g, '/').split('/')
  parts.pop()
  const newPath = parts.join('/') || ''
  loadDirectory(newPath)
}

const goToRoot = () => {
  loadDirectory('')
}

const navigateToPath = (path: string) => {
  loadDirectory(path)
}

const selectCurrentFolder = async () => {
  if (!currentPath.value) return
  selecting.value = true
  try {
    const response = await fetch('/api/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath.value })
    })

    if (response.ok) {
      const data = await response.json()
      // ← ESSAS DUAS LINHAS ERAM AS QUE FALTAVAM!
      store.selectedFolder = data.path
      console.log('Pasta selecionada com sucesso:', data.path)

      // Opcional: rola para o topo ou dá feedback visual
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      const error = await response.text()
      alert('Erro ao selecionar pasta: ' + error)
    }
  } catch (err) {
    console.error('Erro na requisição /api/select:', err)
    alert('Falha na comunicação com o backend')
  } finally {
    selecting.value = false
  }
}

onMounted(() => {
  goToRoot()
})
</script>