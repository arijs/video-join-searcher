// src/frontend/src/stores/useLoopStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VideoFile } from '../../../backend/types' // ajuste o caminho se necessário

export interface ComparisonResult {
  id: string
  from: { name: string; path: string }
  to: { name: string; path: string }
  match: number
  resolution: string
  fromThumb: string
  toThumb: string
  diffThumb?: string
}

export const useLoopStore = defineStore('loop', () => {
  // === Conexão WebSocket ===
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)

  // === Estado da aplicação ===
  const selectedFolder = ref<string>('')
  const allVideos = ref<VideoFile[]>([])
  const filteredVideos = ref<VideoFile[]>([])
  const results = ref<ComparisonResult[]>([])
  const threshold = ref<number>(93)

  // === Progresso da operação atual ===
  const progress = ref<{
    phase: string
    current: number
    total: number
    message?: string
  }>({
    phase: '',
    current: 0,
    total: 0,
    message: ''
  })

  // === Computeds úteis ===
  const totalVideos = computed(() => allVideos.value.length)
  const matchedVideos = computed(() => filteredVideos.value.length)
  const hasResults = computed(() => results.value.length > 0)
  const isProcessing = computed(() => progress.value.phase !== '' && progress.value.phase !== 'Scan concluído!' && progress.value.phase !== 'Concluído!')

  // === Métodos ===
  const connect = () => {
    if (ws.value?.readyState === WebSocket.OPEN) return

    ws.value = new WebSocket('ws://localhost:3002/ws')

    ws.value.onopen = () => {
      isConnected.value = true
      console.log('WebSocket conectado')
    }

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'videos':
          allVideos.value = data.total ? allVideos.value : data.videos // mantém all se vier total
          filteredVideos.value = data.videos
          break

        case 'result':
          results.value.push(data.result)
          break

        case 'results-clear':
          results.value = []
          break

        case 'progress':
          progress.value = {
            phase: data.phase || progress.value.phase,
            current: data.current ?? progress.value.current,
            total: data.total ?? progress.value.total,
            message: data.message
          }
          break

        case 'error':
          console.error('Erro do backend:', data.message)
          progress.value = { phase: 'Erro', current: 0, total: 0, message: data.message }
          break
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      console.log('WebSocket desconectado')
    }

    ws.value.onerror = (err) => {
      console.error('WebSocket error:', err)
      isConnected.value = false
    }
  }

  const disconnect = () => {
    ws.value?.close()
    ws.value = null
    isConnected.value = false
  }

  const clearResults = () => {
    results.value = []
  }

  const setThreshold = (value: number) => {
    threshold.value = value
  }

  return {
    // WebSocket
    ws,
    isConnected,
    connect,
    disconnect,

    // Dados
    selectedFolder,
    allVideos,
    filteredVideos,
    results,
    threshold,

    // Progresso
    progress,

    // Computeds
    totalVideos,
    matchedVideos,
    hasResults,
    isProcessing,

    // Actions
    clearResults,
    setThreshold
  }
})