// src/backend/handlers/filterHandler.ts
import { extname, basename } from 'node:path'
import { state, broadcast } from '../server'
import type { VideoFile } from '../types'

interface RegexRule {
  pattern: string
  mode: 'positive' | 'negative'
  target: 'name' | 'ext' | 'full'
}

interface FilterPayload {
  regexRules?: RegexRule[]
  filters?: {
    sizeMin?: number | null
    sizeMax?: number | null
    createdAfter?: string
    createdBefore?: string
    modifiedAfter?: string
    modifiedBefore?: string
    durationMin?: number | null
    durationMax?: number | null
    aspectMin?: number | null
    aspectMax?: number | null
    widthMin?: number | null
    widthMax?: number | null
    heightMin?: number | null
    heightMax?: number | null
  }
}

/**
 * Aplica todos os filtros (regex + metadados) conforme especificação original.
 * Mantém exatamente a lógica: primeira regra define o modo base (add ou remove).
 */
export async function applyAllFilters(payload: FilterPayload): Promise<void> {
  const { regexRules = [], filters = {} } = payload
  let result: VideoFile[] = [...state.allVideos]

  // ===============================================================
  // 1. Regras Regex – lógica idêntica à solicitada originalmente
  // ===============================================================
  if (regexRules.length > 0 && regexRules.some(r => r.pattern.trim() !== '')) {
    const validRules = regexRules.filter(r => r.pattern.trim() !== '')
    const firstRulePositive = validRules[0].mode === 'positive'

    // Conjunto de índices que permanecem após todas as regras
    let matchedIndices = firstRulePositive ? new Set<number>() : new Set(result.map((_, i) => i))

    for (const rule of validRules) {
      let regex: RegExp
      try {
        regex = new RegExp(rule.pattern, 'i')
      } catch {
        continue // regex inválida → ignora regra
      }

      const currentMatch = new Set<number>()

      for (let i = 0; i < result.length; i++) {
        const video = result[i]
        let text = ''

        if (rule.target === 'name') {
          text = basename(video.name, extname(video.name))
        } else if (rule.target === 'ext') {
          text = extname(video.name).slice(1).toLowerCase()
        } else {
          text = video.name
        }

        const matches = regex.test(text)

        if (
          (rule.mode === 'positive' && matches) ||
          (rule.mode === 'negative' && !matches)
        ) {
          currentMatch.add(i)
        }
      }

      if (firstRulePositive) {
        matchedIndices = new Set([...matchedIndices, ...currentMatch])
      } else {
        matchedIndices = new Set([...matchedIndices].filter(idx => currentMatch.has(idx)))
      }
    }

    result = Array.from(matchedIndices).map(i => result[i])
  }

  // ===============================================================
  // 2. Filtros de metadados (tamanho, data, duração, aspect, resolução)
  // ===============================================================
  result = result.filter(video => {
    // Tamanho em MB
    const sizeMB = video.size / (1024 * 1024)
    if (filters.sizeMin !== undefined && filters.sizeMin !== null && sizeMB < filters.sizeMin) return false
    if (filters.sizeMax !== undefined && filters.sizeMax !== null && sizeMB > filters.sizeMax) return false

    // Datas (ctime = criação, mtime = modificação)
    if (filters.createdAfter && video.ctime) {
      if (new Date(video.ctime) < new Date(filters.createdAfter)) return false
    }
    if (filters.createdBefore && video.ctime) {
      if (new Date(video.ctime) > new Date(filters.createdBefore)) return false
    }
    if (filters.modifiedAfter && video.mtime) {
      if (new Date(video.mtime) < new Date(filters.modifiedAfter)) return false
    }
    if (filters.modifiedBefore && video.mtime) {
      if (new Date(video.mtime) > new Date(filters.modifiedBefore)) return false
    }

    // Duração
    if (filters.durationMin !== undefined && filters.durationMin !== null) {
      if ((video.duration ?? 0) < filters.durationMin) return false
    }
    if (filters.durationMax !== undefined && filters.durationMax !== null) {
      if ((video.duration ?? 0) > filters.durationMax) return false
    }

    // Aspect Ratio
    if (video.width && video.height) {
      const ar = video.width / video.height
      if (filters.aspectMin !== undefined && filters.aspectMin !== null && ar < filters.aspectMin) return false
      if (filters.aspectMax !== undefined && filters.aspectMax !== null && ar > filters.aspectMax) return false
    }

    // Resolução
    if (filters.widthMin !== undefined && filters.widthMin !== null && (video.width ?? 0) < filters.widthMin) return false
    if (filters.widthMax !== undefined && filters.widthMax !== null && (video.width ?? 0) > filters.widthMax) return false
    if (filters.heightMin !== undefined && filters.heightMin !== null && (video.height ?? 0) < filters.heightMin) return false
    if (filters.heightMax !== undefined && filters.heightMax !== null && (video.height ?? 0) > filters.heightMax) return false

    return true
  })

  // Atualiza estado global
  state.setFilteredVideos(result)

  // Notifica frontend
  broadcast({
    type: 'videos',
    videos: state.filteredVideos,
    total: state.allVideos.length
  })

  console.log(`Filtros aplicados → ${result.length} vídeos restantes (de ${state.allVideos.length} totais)`)
}