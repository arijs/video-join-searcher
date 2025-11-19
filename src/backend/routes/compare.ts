import { startComparison } from '../handlers/comparisonHandler'

export default async function handleCompare(req: Request) {
  const { threshold = 87.5 } = await req.json()
  await startComparison(threshold)
  return new Response('OK')
}
