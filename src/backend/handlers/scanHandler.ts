// src/backend/handlers/scanHandler.ts
import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { state, broadcast } from '../server'
import { getVideoMetadata } from '../metadata'
import type { VideoFile } from '../types'

const VIDEO_EXTS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.flv', '.wmv', '.m2ts'
])

/**
 * Escaneia completamente a pasta selecionada, extrai metadados de vídeo
 * e atualiza o estado global da aplicação.
 */
export async function fullScan(): Promise<void> {
  const folder = state.selectedFolder
  if (!folder) {
    broadcast({ type: 'error', message: 'Nenhuma pasta selecionada' })
    return
  }

  try {
    const entries = await readdir(folder)
    const totalEntries = entries.length

    broadcast({
      type: 'progress',
      phase: 'Escaneando arquivos...',
      current: 0,
      total: totalEntries,
      message: `Lendo ${totalEntries} itens na pasta...`
    })

    const videos: VideoFile[] = []
    let processed = 0

    for (const entry of entries) {
      processed++
      if (processed % 50 === 0 || processed === totalEntries) {
        broadcast({
          type: 'progress',
          current: processed,
          total: totalEntries,
          message: `Processando: ${entry}`
        })
      }

      const fullPath = join(folder, entry)
      const stats = await stat(fullPath).catch(() => null)
      if (!stats?.isFile()) continue

      const extension = extname(entry).toLowerCase()
      if (!VIDEO_EXTS.has(extension)) continue

      const baseVideo: VideoFile = {
        path: fullPath,
        name: entry,
        size: stats.size,
        mtime: stats.mtimeMs,
        ctime: stats.ctimeMs || undefined,
      }

      // Extrai metadados de vídeo (duração, resolução, etc.)
      const metadata = await getVideoMetadata(fullPath)
      const video: VideoFile = { ...baseVideo, ...metadata }

      videos.push(video)
    }

    // Atualiza estado global de forma segura e imutável
    state.setAllVideos(videos)
    state.setFilteredVideos([...videos]) // inicialmente, sem filtros

    broadcast({
      type: 'videos',
      videos: state.filteredVideos,
      total: state.allVideos.length
    })

    broadcast({
      type: 'progress',
      phase: 'Scan concluído!',
      current: totalEntries,
      total: totalEntries,
      message: `${videos.length} vídeos encontrados e analisados`
    })

    console.log(`✅ Scan concluído: ${videos.length} vídeos em "${folder}"`)
  } catch (err) {
    console.error('Erro durante o scan:', err)
    broadcast({
      type: 'error',
      message: 'Erro ao escanear pasta: ' + (err as Error).message
    })
  }
}