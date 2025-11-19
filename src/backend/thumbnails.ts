// src/backend/thumbnails.ts (versão 2025 – shell direto)
import { mkdir, exists, unlink } from 'fs/promises'
import { join } from 'path'
import { $ } from 'bun'

const THUMB_ROOT = '.seamless-thumbnails'

export async function ensureThumbFolder(baseFolder: string): Promise<string> {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const folder = join(baseFolder, THUMB_ROOT, timestamp)
  await mkdir(folder, { recursive: true })
  return folder
}

export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  duration: number | null, // duração total em segundos (já vem do metadata)
  // Se for null, usa o primeiro frame (0.1s)
  // isEndFrame: boolean = false,
  originalWidth: number,
  originalHeight: number
): Promise<void> {
  const { width, height } = calculateThumbnailSize(originalWidth, originalHeight)

  if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid thumbnail size calculated: ${width}x${height}, (original: ${originalWidth}x${originalHeight}, video: ${videoPath})`)
  }

  const isEndFrame = duration !== null

  // Estratégia infalível para o último frame:
  // 1. Primeiro tenta duration - 0.1s
  // 2. Se falhar ou gerar arquivo vazio → tenta duration - 1s
  // 3. Se ainda falhar → tenta duration / 2 (meio do vídeo, sempre existe)
  const candidates = isEndFrame
    ? [duration - 0.1, duration - 1, duration - 5, duration / 2]
    : [0.1]

  for (const time of candidates) {
    if (time < 0) continue

    try {
      // Usa -accurate_seek para precisão máxima no final do vídeo
      const cmd = $`ffmpeg -y ${isEndFrame ? '-accurate_seek' : ''} -ss ${time.toFixed(3)} -i ${videoPath} -frames:v 1 -q:v 2 -vf "scale=${width}:${height}" ${outputPath}`

      // const result = 
      await cmd.quiet()
      // .nothrow() // não lança erro, mas guarda exitCode

      // Se o arquivo foi criado e tem tamanho > 1KB → sucesso!
      if ((await exists(outputPath)) && Bun.file(outputPath).size > 1024) {
        return // thumbnail válido → sai do loop
      }

      // Se falhou, remove arquivo lixo
      try { await unlink(outputPath) } catch {}
    } catch {
      // continua para próximo candidato
    }
  }

  // Último recurso: força um frame do início (melhor que nada)
  console.warn(`Último recurso: usando frame inicial para último thumbnail de ${videoPath}`)
  await $`ffmpeg -y -ss 0.1 -i ${videoPath} -frames:v 1 -q:v 2 -vf "scale=${width}:${height}" ${outputPath}`.quiet()
}

/**
 * Calcula dimensões do thumbnail seguindo rigorosamente as regras:
 * 1. Maior lado ≤ 80px
 * 2. Menor lado ≥ 32px
 * 3. NUNCA maior que o tamanho original do vídeo
 * 4. Sempre dimensões pares
 */
export function calculateThumbnailSize(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  const MAX_SIDE = 80
  const MIN_SIDE = 32

  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: 80, height: 80 } // fallback seguro
  }

  const aspectRatio = originalWidth / originalHeight

  let width: number
  let height: number

  // Passo 1: Limitar o maior lado a 80px
  if (originalWidth >= originalHeight) {
    // Landscape
    width = Math.min(originalWidth, MAX_SIDE)
    height = Math.round(width / aspectRatio)
  } else {
    // Portrait
    height = Math.min(originalHeight, MAX_SIDE)
    width = Math.round(height * aspectRatio)
  }

  // Passo 2: Garantir menor lado ≥ 32px → mas NUNCA maior que original!
  if (width >= originalWidth || height >= originalHeight) {
    // Vídeo já é pequeno → usar tamanho original (ou menor, se necessário)
    width = originalWidth - (originalWidth % 2)
    height = originalHeight - (originalHeight % 2)
  } else {
    // Aplicar regra do menor lado só se não ultrapassar original
    if (width < height) {
      // width é o menor lado
      if (width < MIN_SIDE && originalWidth >= MIN_SIDE) {
        width = MIN_SIDE
        height = Math.round(width / aspectRatio)
      }
    } else {
      // height é o menor lado
      if (height < MIN_SIDE && originalHeight >= MIN_SIDE) {
        height = MIN_SIDE
        width = Math.round(height * aspectRatio)
      }
    }
  }

  // Passo 3: Forçar par (obrigatório pro FFmpeg)
  width = width - (width % 2)
  height = height - (height % 2)

  return { width, height }
}
