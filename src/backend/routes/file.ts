import { resolve, sep } from 'node:path'
import { state } from '../server'
import { statSync } from 'node:fs'

export default function handleFile(url: URL) {
  const raw = decodeURIComponent(url.pathname.slice(5))
  const filePath = resolve(raw)
  if (state.rootFolder) {
    const root = resolve(state.rootFolder)
    if (!(filePath === root || filePath.startsWith(root + sep))) {
      return new Response('Fora da raiz configurada', { status: 403 })
    }
  }
  try {
    if (!statSync(filePath).isFile()) {
      return new Response('Arquivo não encontrado', { status: 404 })
    }
  } catch {
    return new Response('Arquivo não encontrado', { status: 404 })
  }
  return new Response(Bun.file(filePath))
}