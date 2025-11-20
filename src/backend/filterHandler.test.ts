import { describe, it, expect } from 'bun:test'
import { applyAllFilters } from './handlers/filterHandler'
import { state } from './server'
import type { VideoFile } from './types'

function makeVideo(partial: Partial<VideoFile>): VideoFile {
  return {
    path: partial.path || `/videos/${partial.name || 'vid.mp4'}`,
    name: partial.name || 'vid.mp4',
    size: partial.size ?? 10 * 1024 * 1024, // 10MB
    mtime: partial.mtime ?? Date.UTC(2025, 0, 10),
    ctime: partial.ctime ?? Date.UTC(2025, 0, 5),
    duration: partial.duration,
    width: partial.width,
    height: partial.height
  }
}

function setVideos(videos: VideoFile[]) {
  state.setAllVideos(videos)
  state.setFilteredVideos(videos) // initial filtered mirrors allVideos
}

describe('applyAllFilters - Regex (isolado)', () => {
  it('positive base faz união dos conjuntos (loop OR mp4)', async () => {
    setVideos([
      makeVideo({ name: 'loop_a.mov' }), // matches pattern loop only
      makeVideo({ name: 'random_b.mp4' }), // matches ext mp4 only
      makeVideo({ name: 'other.avi' }) // matches none
    ])
    await applyAllFilters({
      regexRules: [
        { pattern: 'loop', mode: 'positive', target: 'name' },
        { pattern: 'mp4', mode: 'positive', target: 'ext' }
      ]
    })
    const names = state.filteredVideos.map(v => v.name)
    expect(names).toContain('loop_a.mov')
    expect(names).toContain('random_b.mp4')
    expect(names).not.toContain('other.avi')
    expect(names.length).toBe(2)
  })

  it('negative base aplica interseção (remove quem casa)', async () => {
    setVideos([
      makeVideo({ name: 'test_sample.mp4' }),
      makeVideo({ name: 'draft_clip.mp4' }),
      makeVideo({ name: 'final_ok.mp4' })
    ])
    await applyAllFilters({
      regexRules: [
        { pattern: 'test', mode: 'negative', target: 'full' },
        { pattern: 'draft', mode: 'negative', target: 'name' }
      ]
    })
    const names = state.filteredVideos.map(v => v.name)
    expect(names).toEqual(['final_ok.mp4'])
  })

  it('negative + positive (interseção) mantém apenas nomes que casam com positive subsequente', async () => {
    setVideos([
      makeVideo({ name: 'loop_one.mp4' }),
      makeVideo({ name: 'another.mov' }),
      makeVideo({ name: 'loop_two.webm' })
    ])
    await applyAllFilters({
      regexRules: [
        { pattern: 'xyz_not_present', mode: 'negative', target: 'full' }, // todos passam (não casam)
        { pattern: 'loop', mode: 'positive', target: 'name' }
      ]
    })
    const names = state.filteredVideos.map(v => v.name).sort()
    expect(names).toEqual(['loop_one.mp4', 'loop_two.webm'].sort())
  })

  it('erro pattern vazio', async () => {
    setVideos([makeVideo({ name: 'a.mp4' })])
    await expect(applyAllFilters({
      regexRules: [
        { pattern: '   ', mode: 'positive', target: 'name' }
      ]
    })).rejects.toThrow(/pattern vazio/i)
  })

  it('erro regex inválida', async () => {
    setVideos([makeVideo({ name: 'a.mp4' })])
    await expect(applyAllFilters({
      regexRules: [
        { pattern: '[', mode: 'positive', target: 'name' }
      ]
    })).rejects.toThrow(/regex inválida/i)
  })
})

describe('applyAllFilters - Metadados (isolado)', () => {
  it('sizeMin', async () => {
    setVideos([
      makeVideo({ name: 'small.mp4', size: 1 * 1024 * 1024 }), // 1 MB
      makeVideo({ name: 'big.mp4', size: 50 * 1024 * 1024 }) // 50 MB
    ])
    await applyAllFilters({ filters: { sizeMin: 10 } }) // require >=10MB
    const names = state.filteredVideos.map(v => v.name)
    expect(names).toEqual(['big.mp4'])
  })

  it('sizeMax', async () => {
    setVideos([
      makeVideo({ name: 'small.mp4', size: 1 * 1024 * 1024 }),
      makeVideo({ name: 'big.mp4', size: 50 * 1024 * 1024 })
    ])
    await applyAllFilters({ filters: { sizeMax: 10 } }) // <=10MB
    const names = state.filteredVideos.map(v => v.name)
    expect(names).toEqual(['small.mp4'])
  })

  it('createdAfter', async () => {
    const base = Date.UTC(2025, 0, 1)
    setVideos([
      makeVideo({ name: 'old.mp4', ctime: base }),
      makeVideo({ name: 'new.mp4', ctime: base + 5 * 24 * 3600 * 1000 }) // +5d
    ])
    await applyAllFilters({ filters: { createdAfter: new Date(base + 1 * 24 * 3600 * 1000).toISOString() } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['new.mp4'])
  })

  it('createdBefore', async () => {
    const base = Date.UTC(2025, 0, 1)
    setVideos([
      makeVideo({ name: 'old.mp4', ctime: base }),
      makeVideo({ name: 'new.mp4', ctime: base + 5 * 24 * 3600 * 1000 })
    ])
    await applyAllFilters({ filters: { createdBefore: new Date(base + 2 * 24 * 3600 * 1000).toISOString() } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['old.mp4'])
  })

  it('modifiedAfter', async () => {
    const m1 = Date.UTC(2025, 0, 1)
    const m2 = Date.UTC(2025, 0, 10)
    setVideos([
      makeVideo({ name: 'old.mp4', mtime: m1 }),
      makeVideo({ name: 'new.mp4', mtime: m2 })
    ])
    await applyAllFilters({ filters: { modifiedAfter: new Date(m1 + 2 * 24 * 3600 * 1000).toISOString() } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['new.mp4'])
  })

  it('modifiedBefore', async () => {
    const m1 = Date.UTC(2025, 0, 1)
    const m2 = Date.UTC(2025, 0, 10)
    setVideos([
      makeVideo({ name: 'old.mp4', mtime: m1 }),
      makeVideo({ name: 'new.mp4', mtime: m2 })
    ])
    await applyAllFilters({ filters: { modifiedBefore: new Date(m1 + 2 * 24 * 3600 * 1000).toISOString() } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['old.mp4'])
  })

  it('durationMin', async () => {
    setVideos([
      makeVideo({ name: 'short.mp4', duration: 2 }),
      makeVideo({ name: 'long.mp4', duration: 20 })
    ])
    await applyAllFilters({ filters: { durationMin: 10 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['long.mp4'])
  })

  it('durationMax', async () => {
    setVideos([
      makeVideo({ name: 'short.mp4', duration: 2 }),
      makeVideo({ name: 'long.mp4', duration: 20 })
    ])
    await applyAllFilters({ filters: { durationMax: 10 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['short.mp4'])
  })

  it('aspectMin', async () => {
    setVideos([
      makeVideo({ name: 'narrow.mp4', width: 640, height: 640 }), // ar=1
      makeVideo({ name: 'wide.mp4', width: 1280, height: 640 }) // ar=2
    ])
    await applyAllFilters({ filters: { aspectMin: 1.5 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['wide.mp4'])
  })

  it('aspectMax', async () => {
    setVideos([
      makeVideo({ name: 'narrow.mp4', width: 640, height: 640 }), // ar=1
      makeVideo({ name: 'wide.mp4', width: 1280, height: 640 }) // ar=2
    ])
    await applyAllFilters({ filters: { aspectMax: 1.5 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['narrow.mp4'])
  })

  it('widthMin', async () => {
    setVideos([
      makeVideo({ name: 'smallw.mp4', width: 320, height: 240 }),
      makeVideo({ name: 'bigw.mp4', width: 1280, height: 720 })
    ])
    await applyAllFilters({ filters: { widthMin: 640 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['bigw.mp4'])
  })

  it('widthMax', async () => {
    setVideos([
      makeVideo({ name: 'smallw.mp4', width: 320, height: 240 }),
      makeVideo({ name: 'bigw.mp4', width: 1280, height: 720 })
    ])
    await applyAllFilters({ filters: { widthMax: 640 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['smallw.mp4'])
  })

  it('heightMin', async () => {
    setVideos([
      makeVideo({ name: 'smallh.mp4', width: 320, height: 240 }),
      makeVideo({ name: 'bigh.mp4', width: 1280, height: 720 })
    ])
    await applyAllFilters({ filters: { heightMin: 500 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['bigh.mp4'])
  })

  it('heightMax', async () => {
    setVideos([
      makeVideo({ name: 'smallh.mp4', width: 320, height: 240 }),
      makeVideo({ name: 'bigh.mp4', width: 1280, height: 720 })
    ])
    await applyAllFilters({ filters: { heightMax: 300 } })
    expect(state.filteredVideos.map(v => v.name)).toEqual(['smallh.mp4'])
  })
})
