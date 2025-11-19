// src/backend/thumbnails/utils.test.ts
import { calculateThumbnailSize } from './thumbnails'
import { describe, it, expect } from 'bun:test'

describe('calculateThumbnailSize', () => {
  it('segue as regras exatas do prompt original', () => {
    expect(calculateThumbnailSize(1920, 1080)).toEqual({ width: 80, height: 44 })   // 80×45 arredondado para par
    expect(calculateThumbnailSize(1080, 1920)).toEqual({ width: 44, height: 80 })
    expect(calculateThumbnailSize(1920, 360)).toEqual({ width: 170, height: 32 })  // largura ajustada para manter menor lado = 32px
    expect(calculateThumbnailSize(360, 1920)).toEqual({ width: 32, height: 170 })  // altura ajustada para manter menor lado = 32px
    expect(calculateThumbnailSize(1920, 36)).toEqual({ width: 1706, height: 32 })    // portrait extremo
    expect(calculateThumbnailSize(36, 1920)).toEqual({ width: 32, height: 1706 })    // landscape extremo

    expect(calculateThumbnailSize(40, 80)).toEqual({ width: 40, height: 80 })  // → {40, 80}  (não aumenta!)
    expect(calculateThumbnailSize(20, 20)).toEqual({ width: 20, height: 20 })  // → {20, 20}  (nunca cresce)
    expect(calculateThumbnailSize(30, 60)).toEqual({ width: 30, height: 60 })  // → {30, 60}  (menor que 32px → mantém original)
    expect(calculateThumbnailSize(100, 50)).toEqual({ width: 80, height: 40 })  // → {80, 40}  (normal)
  })
})
