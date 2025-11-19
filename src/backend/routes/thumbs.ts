// src/backend/routes/thumbs.ts
import { join } from 'node:path'
import { state } from '../server'

/**
 * Rota: GET /thumbs/*
 * 
 * Serve thumbnails gerados anteriormente (start_*.png e end_*.png)
 * diretamente do disco, com cache automático do Bun e headers corretos.
 */
export default function handleThumbs(url: URL): Response | null {
  // Extrai o nome do arquivo solicitado após /thumbs/
  const thumbFileName = url.pathname.slice(8) // remove "/thumbs/"

  if (!thumbFileName || thumbFileName.includes('..')) { // || thumbFileName.includes('/')
    return new Response(`Forbidden - ${thumbFileName}`, { status: 403 })
  }

  const folder = state.selectedFolder
  if (!folder) {
    return new Response('Nenhuma pasta selecionada', { status: 400 })
  }

  // Caminho completo seguro dentro da pasta .seamless-thumbnails
  const fullPath = join(folder, '.seamless-thumbnails', thumbFileName)

  try {
    const file = Bun.file(fullPath)

    // Verifica se o arquivo realmente existe (proteção extra)
    if (!file.size || file.size === 0) {
      return new Response('Thumbnail não encontrado', { status: 404 })
    }

    return new Response(file, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable', //  // 1 ano de cache (thumbnails nunca mudam)
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error(`Erro ao servir thumbnail ${thumbFileName}:`, err)
    return new Response('Erro interno', { status: 500 })
  }
}