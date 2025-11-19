// src/backend/routes/pause.ts
import type { Request } from 'bun'
import { comparisonControl } from '../server'

interface PausePayload {
  pause: boolean
}

/**
 * Rota: POST /api/pause
 * 
 * Controla o estado de pausa/resume da geração de thumbnails
 * e da comparação O(n²) em andamento.
 */
export default async function handlePause(req: Request): Promise<Response> {
  try {
    const payload: PausePayload = await req.json()

    if (typeof payload.pause !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Campo "pause" deve ser boolean' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (payload.pause) {
      comparisonControl.pause()
      console.log('⏸ Comparação pausada pelo usuário')
    } else {
      comparisonControl.resume()
      console.log('▶ Comparação retomada')
    }

    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        paused: comparisonControl.isPaused 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Erro na rota /api/pause:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}