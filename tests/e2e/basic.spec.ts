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

  const sampleVideosBtn = page.getByText('sample-videos', { exact: false });
  await sampleVideosBtn.click();

  // Caso exista um gatilho para abrir filtros (exemplo: texto 'Filtros'), ajustar se mudar.
  // Aqui apenas checamos presença de elementos típicos.
  const applyFiltersBtn = page.getByText('ANALISAR ESTA PASTA (17 vídeos)', { exact: false });
  await expect(applyFiltersBtn).toBeVisible();
});
