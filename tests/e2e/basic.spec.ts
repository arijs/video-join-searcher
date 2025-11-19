import { test, expect } from '@playwright/test';

/**
 * Teste básico de smoke da interface principal.
 * Valida que a aplicação carrega e exibe o botão de análise.
 */

test('home carrega e exibe elementos iniciais do explorador', async ({ page }) => {
  await page.goto('/');

  // URL básica carregada.
  await expect(page).toHaveURL(/\/$/);

  // Título do explorador de arquivos.
  await expect(page.getByText('Explorador de Arquivos', { exact: false })).toBeVisible();

  // Botão de breadcrumb "Raiz" (exato) visível.
  await expect(page.getByRole('button', { name: 'Raiz', exact: true })).toBeVisible();

  // Verifica presença de alguns arquivos/pastas esperados na raiz configurada (modo --root=.).
  const expectedRootEntries = [
    'index.html',
    'LICENSE',
    'package.json',
    'README.md',
    'tsconfig.json',
    'vite.config.ts'
  ];

  for (const name of expectedRootEntries) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    await expect(page.getByRole('button', { name: regex })).toBeVisible()
  }
});

test('painel de filtros aparece ao interagir', async ({ page }) => {
  await page.goto('/');

  // Seleciona especificamente o botão da pasta (evita conflito com <pre> JSON do store)
  const sampleVideosBtn = page.getByRole('button', { name: /sample-videos/i });
  await sampleVideosBtn.click();

  // Caso exista um gatilho para abrir filtros (exemplo: texto 'Filtros'), ajustar se mudar.
  // Aqui apenas checamos presença de elementos típicos.
  const applyFiltersBtn = page.getByText('ANALISAR ESTA PASTA (17 vídeos)', { exact: false });
  await expect(applyFiltersBtn).toBeVisible();
});

test('todos os vídeos de sample-videos aparecem listados', async ({ page }) => {
  await page.goto('/');

  // Entra na pasta "sample-videos" pelo explorador.
  await page.getByText('sample-videos', { exact: false }).click();

  // Lista esperada (17 vídeos gerados pelos scripts de exemplo).
  const expectedVideos = [
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
    'triangle_spin_fade_20s.mp4',
  ];

  for (const name of expectedVideos) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    await expect(page.getByRole('button', { name: regex })).toBeVisible();
  }
});
