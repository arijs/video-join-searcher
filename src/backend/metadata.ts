// src/backend/metadata.ts (versão 2025 – shell direto)
import { $ } from 'bun'
import type { VideoFile } from './types'

export async function getVideoMetadata(path: string): Promise<Partial<VideoFile>> {
  try {
    const result = await $`ffprobe -v quiet -print_format json -show_format -show_streams ${path}`.json()

    const format = result.format
    const videoStream = result.streams.find((s: any) => s.codec_type === 'video' && s.width && s.height)

    if (!videoStream) return {}

    return {
      duration: parseFloat(format.duration),
      width: videoStream.width,
      height: videoStream.height,
    }
  } catch (err) {
    console.warn(`ffprobe falhou em ${path}:`, (err as any).stderr?.toString() || err)
    return {}
  }
}