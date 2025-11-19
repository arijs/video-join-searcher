import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export default async function handleList(path: string) {
  try {
    const normalizedPath = path || (process.platform === 'win32' ? '' : '/')
    let items: { name: string; isDir: boolean; size?: number }[] = []

    if (!normalizedPath) {
      // Mostrar raízes (drives no Windows, / no Linux/macOS)
      if (process.platform === 'win32') {
        const drives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
        items = drives
          .map(letter => `${letter}:\\`)
          .filter(drive => require('fs').existsSync(drive))
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