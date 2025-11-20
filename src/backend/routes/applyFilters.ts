import { applyAllFilters } from '../handlers/filterHandler'

export default async function handleApplyFilters(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Payload JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  try {
    await applyAllFilters(payload as any)
    return new Response('OK')
  } catch (e) {
    const message = e instanceof Error ? e.message : (
      e ? String(e) : 'Erro desconhecido ao aplicar filtros'
    )
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}