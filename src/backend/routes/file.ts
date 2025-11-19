export default function handleFile(url: URL) {
  const filePath = decodeURIComponent(url.pathname.slice(5))
  return new Response(Bun.file(filePath))
}