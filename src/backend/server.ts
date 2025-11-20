// src/backend/server.ts
import { serve } from 'bun'
import { WebSocketServer, WebSocket } from 'ws'
import { resolve as pathResolve } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import handleSelect from './routes/select'
import handleApplyFilters from './routes/applyFilters'
import handleCompare from './routes/compare'
import handlePause from './routes/pause'
import handleThumbs from './routes/thumbs'
import handleFile from './routes/file'
import handleList from './routes/list'
import type { VideoFile } from './types'

// ===================================================================
// Estado global centralizado e fortemente tipado
// ===================================================================
class AppState {
  selectedFolder = ''
  /** Pasta raiz configurada (modo isolamento). Se vazio, comportamento padrão do sistema. */
  rootFolder = ''
  
  private _allVideos: VideoFile[] = []
  private _filteredVideos: VideoFile[] = []

  get allVideos(): readonly VideoFile[] { return this._allVideos }
  get filteredVideos(): readonly VideoFile[] { return this._filteredVideos }

  setAllVideos(videos: VideoFile[]) { this._allVideos = videos }
  setFilteredVideos(videos: VideoFile[]) { this._filteredVideos = videos }
}

export const state = new AppState()

// Detecta pasta raiz via argumento --root= ou variável de ambiente LOOP_ROOT_DIR
function resolveRootFromArgs(): string {
  const arg = Bun.argv.find(a => a.startsWith('--root='))
  const envRoot = process.env.LOOP_ROOT_DIR
  const raw = (arg ? arg.slice('--root='.length) : null) || envRoot
  if (!raw) return ''
  try {
    const resolved = pathResolve(raw)
    if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
      console.error('[rootFolder] Caminho inválido informado, ignorando:', raw)
      process.exit(1001)
    }
    return resolved
  } catch (e) {
    console.error('[rootFolder] Erro ao validar pasta raiz:', e)
    process.exit(1002)
  }
}

state.rootFolder = resolveRootFromArgs()
if (state.rootFolder) {
  console.log('📁 Pasta raiz limitada:', state.rootFolder)
  // Se já havia selectedFolder fora desse escopo, será ignorado até que select defina algo dentro dela.
}

// ===================================================================
// Controle de pausa/cancelamento da comparação
// ===================================================================
export const comparisonControl = {
  isPaused: false,
  cancel: false,

  pause() { this.isPaused = true },
  resume() { this.isPaused = false },
  requestCancel() { this.cancel = true },
  reset() { this.isPaused = false; this.cancel = false },
} //as const

// ===================================================================
// Broadcast via WebSocket
// ===================================================================
const wsClients = new Set<WebSocket>()

export const broadcast = (data: any) => {
  const message = JSON.stringify(data)
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// ===================================================================
// Servidor principal
// ===================================================================
const wss = new WebSocketServer({ port: 3002 })

wss.on('connection', (ws) => {
  wsClients.add(ws)
  ws.on('close', () => wsClients.delete(ws))
})

serve({
  hostname: '0.0.0.0',
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url)

    // Rotas API
    if (url.pathname === '/api/list' && req.method === 'GET') return handleList(url.searchParams.get('path') || '', state.rootFolder)
    if (url.pathname === '/api/select' && req.method === 'POST') return handleSelect(req)
    if (url.pathname === '/api/apply-filters' && req.method === 'POST') return handleApplyFilters(req)
    if (url.pathname === '/api/compare' && req.method === 'POST') return handleCompare(req)
    if (url.pathname === '/api/pause' && req.method === 'POST') return handlePause(req)

    // Servir arquivos estáticos
    if (url.pathname.startsWith('/thumbs/')) {
      const response = handleThumbs(url)
      if (response) return response
    }
    if (url.pathname.startsWith('/file')) {
      const response = handleFile(url)
      if (response) return response
    }

    return new Response('Not Found', { status: 404 })
  }
})

console.log('🚀 Seamless Video Loop Finder – Backend rodando!')
console.log('   Backend:   http://localhost:3001')
console.log('   WebSocket: http://localhost:3002')
// console.log('   Frontend (Vite):     http://localhost:5173')
// console.log('   Data atual:          November 18, 2025\n')
