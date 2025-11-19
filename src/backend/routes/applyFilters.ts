import { applyAllFilters } from '../handlers/filterHandler'

export default async function handleApplyFilters(req: Request) {
  const payload = await req.json()
  await applyAllFilters(payload)
  return new Response('OK')
}