// src/backend/routes/select.ts
import { state } from '../server'
import { resolve, sep } from 'node:path'
import { statSync } from 'node:fs'
import { fullScan } from '../handlers/scanHandler'

interface SelectPayload {
  path: string
}

/**
 * Rota: POST /api/select
 * 
 * Recebe o caminho da pasta escolhida pelo usuário no explorador,
 * define como pasta de trabalho e inicia o scan completo + extração de metadata.
 */
export default async function handleSelect(req: Request): Promise<Response> {
  try {
    const payload: SelectPayload = await req.json()

    if (typeof payload.path !== 'string' || payload.path.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Caminho inválido ou não informado' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const requestedRaw = payload.path.trim()
    const requested = resolve(requestedRaw)

    if (state.rootFolder) {
      const root = resolve(state.rootFolder)
      if (!(requested === root || requested.startsWith(root + sep))) {
        return new Response(
          JSON.stringify({ error: 'Pasta fora da raiz configurada' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    try {
      if (!statSync(requested).isDirectory()) {
        return new Response(
          JSON.stringify({ error: 'Caminho não é uma pasta válida' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Pasta inexistente' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Atualiza estado global
    state.selectedFolder = requested

    console.log(`Pasta selecionada: ${requested}`)

    // Inicia o scan completo em background
    fullScan().catch(err => {
      console.error('Erro inesperado no scan após seleção:', err)
    })

    // Resposta imediata (o progresso vem via WebSocket)
    return new Response(
      JSON.stringify({ message: 'Pasta selecionada com sucesso', path: requested, root: state.rootFolder || null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Erro na rota /api/select:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}