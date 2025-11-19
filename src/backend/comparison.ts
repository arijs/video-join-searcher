// src/backend/comparison/pixelComparator.ts
import { readFile, writeFile } from 'fs/promises'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export interface ComparisonResult {
  matchPercentage: number
  mismatchedPixels: number
  diffBuffer?: Buffer   // só preenchido se solicitado
}

/**
 * Compara duas imagens com pixelmatch UMA ÚNICA VEZ.
 * Gera diffBuffer apenas se match >= threshold (ou se forçado).
 */
export async function compareImages(
  img1Path: string,
  img2Path: string,
  options: {
    threshold?: number
    generateDiff?: boolean
    minMatchToSaveDiff?: number
    diffOutputPath?: ((match: number) => string) | undefined
  } = {}
): Promise<ComparisonResult> {
  const {
    threshold = 0.125,
    generateDiff = false,
    minMatchToSaveDiff = 90,
    diffOutputPath
  } = options

  const [buf1, buf2] = await Promise.all([
    readFile(img1Path),
    readFile(img2Path)
  ])

  const img1 = PNG.sync.read(buf1)
  const img2 = PNG.sync.read(buf2)

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return { matchPercentage: 0, mismatchedPixels: img1.width * img1.height }
  }

  const diff = generateDiff ? new PNG({ width: img1.width, height: img1.height }) : null

  const mismatchedPixels = pixelmatch(
    img1.data,
    img2.data,
    diff?.data || undefined,
    img1.width,
    img1.height,
    { threshold } //, diffColor: [255, 0, 0]
  )

  const totalPixels = img1.width * img1.height
  const matchPercentage = (totalPixels - mismatchedPixels) / totalPixels * 100

  // Só salva o diff se for bom o suficiente
  if (diff && matchPercentage >= minMatchToSaveDiff && diffOutputPath) {
    try {
      await writeFile(diffOutputPath(matchPercentage), PNG.sync.write(diff))
    } catch (err) {
      console.warn(`Falha ao salvar diff ${diffOutputPath}:`, err)
    }
  }

  return {
    matchPercentage,
    mismatchedPixels,
    diffBuffer: diff ? PNG.sync.write(diff) : undefined
  }
}
