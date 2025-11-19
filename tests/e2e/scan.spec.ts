import { test, expect } from '@playwright/test'

/**
 * Teste de fluxo de scan da pasta sample-videos.
 * 1. Abre raiz
 * 2. Entra em sample-videos
 * 3. Clica em "ANALISAR ESTA PASTA"
 * 4. Aguarda tabela "Vídeos Analisados"
 * 5. Valida todas as células: índice, nome, tamanho, duração, resolução, aspect ratio.
 */

test('scan da pasta sample-videos popula tabela Vídeos Analisados', async ({ page }) => {
  await page.goto('/')

  // Abre pasta sample-videos
  await page.getByText('sample-videos', { exact: false }).click()

  // Dispara análise
  const analyzeBtn = page.getByRole('button', { name: /ANALISAR ESTA PASTA/i })
  await expect(analyzeBtn).toBeVisible()
  await analyzeBtn.click()

  // Aguarda header da tabela "Vídeos Analisados"
  await expect(page.getByText('Vídeos Analisados')).toBeVisible()

  const expectedNames = [
    'bouncing_square_10s.mp4',
    'diff_resolution_A.mp4',
    'diff_resolution_B.mp4',
    'gradient_pulse_10s.mp4',
    'loop_color_cycle_10s.mp4',
    'loop_gradient.mp4',
    'loop_rotating_square.mp4',
    'loop_solid_red.mp4',
    'moving_rectangle_horizontal_20s.mp4',
    'multi_morph_shapes_A_10s.mp4',
    'multi_morph_shapes_B_10s.mp4',
    'multi_morph_shapes_C_10s.mp4',
    'nonloop_transition.mp4',
    'overlapping_shapes_transition_10s.mp4',
    'pair_A_end_green.mp4',
    'pair_B_start_green.mp4',
    'triangle_spin_fade_20s.mp4'
  ]

  // Resoluções esperadas (quase todos 320×240; exceções) e Aspect Ratio.
  const resolutionMap: Record<string, string> = {}
  for (const n of expectedNames) resolutionMap[n] = '320×240'
  resolutionMap['diff_resolution_A.mp4'] = '640×360'
  resolutionMap['diff_resolution_B.mp4'] = '800×600'

  const aspectMap: Record<string, string> = {}
  for (const n of expectedNames) aspectMap[n] = '4:3'
  aspectMap['diff_resolution_A.mp4'] = '16:9'
  // diff_resolution_B.mp4 permanece 4:3

  // Aguarda até que a contagem de linhas corresponda ao esperado e nenhuma célula de resolução esteja '—'.
  await page.waitForFunction((expectedCount) => {
    const table = document.querySelector('table')
    if (!table) return false
    const rows = table.querySelectorAll('tbody tr')
    if (rows.length !== expectedCount) return false
    return Array.from(rows).every(r => !r.children[4].textContent?.includes('—'))
  }, expectedNames.length, { timeout: 15000 })

  // Seleciona linhas da primeira tabela de vídeos analisados.
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(expectedNames.length)

  for (let i = 0; i < expectedNames.length; i++) {
    const row = rows.nth(i)

    // Colunas: 0=#,1=Nome,2=Tamanho,3=Duração,4=Resolução,5=Aspect Ratio
    await expect(row.locator('td').nth(0)).toHaveText(String(i + 1))
    await expect(row.locator('td').nth(1)).toHaveText(expectedNames[i])

    // Tamanho: deve terminar com KB ou MB
    const sizeText = await row.locator('td').nth(2).innerText()
    expect(sizeText).toMatch(/\d+\.?\d* (KB|MB)/)

    // Duração: formato m:ss ou h:mm:ss (aceita ambos) - não vazia
    const durationText = await row.locator('td').nth(3).innerText()
    expect(durationText).toMatch(/^(\d+:\d{2}|\d+:\d{2}:\d{2})$/)

    // Resolução: exatamente a esperada
    await expect(row.locator('td').nth(4)).toHaveText(resolutionMap[expectedNames[i]])

    // Aspect Ratio
    await expect(row.locator('td').nth(5)).toHaveText(new RegExp('^' + aspectMap[expectedNames[i]].replace(/([.*+?^${}()|\[\]\\])/g, '\\$&')))
  }
})
