// src/backend/handlers/topMatches.ts
export interface TopMatch {
  fromName: string
  toName: string
  match: number
}

/**
 * Mantém as N melhores combinações (por similaridade descendente)
 * Função pura → 100% testável isoladamente
 */
export class TopMatchesTracker {
  private items: TopMatch[] = []
  private readonly limit: number

  constructor(limit: number = 20) {
    this.limit = limit
  }

  add(fromName: string, toName: string, match: number): void {
    // if (match < 90) return // opcional: ignora matches ruins pra não poluir

    this.items.push({ fromName, toName, match })

    // Ordena descendente e mantém apenas os top N
    this.items.sort((a, b) => b.match - a.match)
    if (this.items.length > this.limit) {
      this.items.length = this.limit
    }
  }

  getTop(): readonly TopMatch[] {
    return this.items
  }

  clear(): void {
    this.items = []
  }
}
