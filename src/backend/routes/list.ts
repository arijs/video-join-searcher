import { readdir, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { existsSync } from 'node:fs'

function isInside(base: string, target: string) {
  const b = resolve(base)
  const t = resolve(target)
  return t === b || t.startsWith(b + sep)
}

export default async function handleList(path: string, rootFolder: string) {
  try {
    // Modo restrito: se rootFolder definido, só listar dentro dela.
    if (rootFolder) {
      const requested = path && path.trim() !== '' ? resolve(path) : rootFolder
      // Bloqueia tentativas de sair da raiz
      if (!isInside(rootFolder, requested)) {
        return new Response(JSON.stringify({ error: 'Fora da raiz configurada' }), { status: 400 })
      }
      const entries = await readdir(requested)
      const items = (await Promise.all(entries.map(async (name) => {
        const fullPath = join(requested, name)
        try {
          const stats = await stat(fullPath)
          return {
            name,
            isDir: stats.isDirectory(),
            size: stats.isFile() ? stats.size : undefined
          }
        } catch { return null }
      }))).filter(Boolean)
      return new Response(JSON.stringify({ items, base: requested, root: rootFolder }), { headers: { 'Content-Type': 'application/json' } })
    }

    const normalizedPath = path || (process.platform === 'win32' ? '' : '/')
    let items: { name: string; isDir: boolean; size?: number }[] = []

    if (!normalizedPath) {
      // Mostrar raízes (drives no Windows, / no Linux/macOS)
      if (process.platform === 'win32') {
        const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        items = drives
          .map(letter => `${letter}:\\`)
          .filter(drive => existsSync(drive))
          .map(drive => ({ name: drive, isDir: true }))
      } else {
        items = [{ name: '/', isDir: true }]
      }
    } else {
      const entries = await readdir(normalizedPath)
      items = (await Promise.all(
        entries.map(async (name) => {
          const fullPath = join(normalizedPath, name)
          try {
            const stats = await stat(fullPath)
            return {
              name,
              isDir: stats.isDirectory(),
              size: stats.isFile() ? stats.size : undefined
            }
          } catch {
            return null
          }
        })
      )).filter(item => item !== null)
    }

    return new Response(JSON.stringify({ items }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Erro ao listar diretório:', err)
    return new Response(JSON.stringify({ error: 'Não foi possível ler a pasta' }), { status: 500 })
  }
}