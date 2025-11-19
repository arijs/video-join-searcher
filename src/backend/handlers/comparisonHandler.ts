// src/backend/handlers/comparisonHandler.ts
import { join } from 'node:path'
import { ensureThumbFolder, generateThumbnail } from '../thumbnails'
import { compareImages } from '../comparison'
import { state, broadcast, comparisonControl } from '../server'
import { TopMatchesTracker } from './topMatches'
// import type { VideoFile } from '../types'

/**
 * Inicia a busca por loops perfeitos (incluindo self-loops).
 * Totalmente pausável, cancelável e com progresso em tempo real.
 */
export async function startComparison(threshold: number): Promise<void> {
  if (state.filteredVideos.length === 0) {
    broadcast({ type: 'progress', phase: 'Nenhum vídeo filtrado', current: 0, total: 0 })
    return
  }

  // Reset de controles
  comparisonControl.reset()

  const videosToUse = state.filteredVideos
  const thumbDir = await ensureThumbFolder(state.selectedFolder)

  // ===================================================================
  // FASE 1: Geração de thumbnails (primeiro e último frame útil)
  // ===================================================================
  broadcast({
    type: 'progress',
    phase: 'Gerando thumbnails...',
    current: 0,
    total: videosToUse.length * 2,
    message: 'Extraindo frames inicial e final de cada vídeo'
  })

  for (let i = 0; i < videosToUse.length; i++) {
    if (comparisonControl.cancel) break
    while (comparisonControl.isPaused) await new Promise(r => setTimeout(r, 1000))

    const video = videosToUse[i]
    const startPath = join(thumbDir, `start_${i}.png`)
    const endPath = join(thumbDir, `end_${i}.png`)

    try {
      await generateThumbnail(video.path, startPath, null, video.width!, video.height!)
      const endTime = video.duration ? Math.max(1, video.duration * 0.999) : 1
      await generateThumbnail(video.path, endPath, endTime, video.width!, video.height!)

      broadcast({
        type: 'progress',
        current: (i + 1) * 2,
        total: videosToUse.length * 2
      })
    } catch (err) {
      console.error(`Falha ao gerar thumbnail para ${video.name}:`, err)
    }
  }

  if (comparisonControl.cancel) {
    broadcast({ type: 'progress', phase: 'Cancelado', current: 0, total: 0, message: 'Geração de thumbnails cancelada' })
    return
  }

  // ===================================================================
  // FASE 2: Comparação O(n²) com early exit e resultados em tempo real
  // ===================================================================
  const totalCombinations = videosToUse.length ** 2

  broadcast({
    type: 'progress',
    phase: 'Procurando loops perfeitos...',
    current: 0,
    total: totalCombinations,
    message: 'Comparando último frame → primeiro frame (incluindo auto-loops)'
  })

  // Limpa resultados antigos
  broadcast({ type: 'results-clear' })

  let checked = 0
  let topTracker = new TopMatchesTracker(20)  // top 20 global
  let batchTracker = new TopMatchesTracker(20) // top 20 do lote atual
  const reportEvery = 400

  for (let i = 0; i < videosToUse.length; i++) {
    if (comparisonControl.cancel) break

    for (let j = 0; j < videosToUse.length; j++) {
      if (comparisonControl.cancel) break
      while (comparisonControl.isPaused) await new Promise(r => setTimeout(r, 150))

      const fromVideo = videosToUse[i]  // último frame vem deste
      const toVideo = videosToUse[j]    // primeiro frame vem deste

      // Early exit crítico: resolução deve ser idêntica
      if (fromVideo.width !== toVideo.width || fromVideo.height !== toVideo.height) {
        checked++
        continue
      }

      const endThumbName = `end_${i}.png`
      const startThumbName = `start_${j}.png`
      const diffThumbName = (match: number) => `diff_end_${i}_start_${j}_match_${match.toFixed(2)}.png`
      const endThumb = join(thumbDir, endThumbName)
      const startThumb = join(thumbDir, startThumbName)
      const diffPath = (match: number) => join(thumbDir, diffThumbName(match))

      let match = 0
      try {
        match = (await compareImages(
          endThumb,
          startThumb,
          {
            generateDiff: true,              // sempre gera o buffer
            minMatchToSaveDiff: threshold,   // só salva se >= threshold
            diffOutputPath: diffPath
          }
        )).matchPercentage
      } catch (err) {
        console.error(`Erro na comparação ${fromVideo.name} → ${toVideo.name}:`, err)
      }

      if (match >= threshold) {
        const result = {
          id: `${i}-${j}`,
          from: { name: fromVideo.name, path: fromVideo.path },
          to: { name: toVideo.name, path: toVideo.path },
          match,
          resolution: `${fromVideo.width}x${fromVideo.height}`,
          fromThumb: `/thumbs/${thumbDir.split(/[\\/]/).pop()}/${endThumbName}`,
          toThumb: `/thumbs/${thumbDir.split(/[\\/]/).pop()}/${startThumbName}`,
          diffThumb: `/thumbs/${thumbDir.split(/[\\/]/).pop()}/${diffThumbName(match)}`,
        }

        broadcast({ type: 'result', result })
      }

      // === Atualiza trackers ===
      topTracker.add(fromVideo.name, toVideo.name, match)
      batchTracker.add(fromVideo.name, toVideo.name, match)

      checked++
      if (checked % reportEvery === 0 || checked === totalCombinations) {
        broadcast({
          type: 'progress',
          current: checked,
          total: totalCombinations,
          message: `${checked.toLocaleString()} / ${totalCombinations.toLocaleString()} combinações analisadas`,
          // phase: 'Procurando loops perfeitos...',
          topBatch: batchTracker.getTop(),   // ← novo: top 20 do lote
          topOverall: topTracker.getTop(),   // ← novo: top 20 geral
        })
      }
    }
  }

  const finalMessage = comparisonControl.cancel
    ? 'Análise cancelada pelo usuário'
    : 'Busca concluída!'

  broadcast({
    type: 'progress',
    phase: 'Concluído!',
    current: totalCombinations,
    total: totalCombinations,
    message: finalMessage
  })

  console.log(`Comparação finalizada: ${checked} combinações processadas`)
}