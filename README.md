# Seamless Video Loop Finder

![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)

Ferramenta local (Bun + Vue 3 + Vite) para encontrar loops de vídeo perfeitos, comparando o último frame de um vídeo com o primeiro frame de outro (incluindo self-loops). Foca em desempenho, transparência (arquivos gerados ficam no disco) e feedback em tempo real via WebSocket.

## Visão Geral
- Explorador de arquivos desde a raiz (drives no Windows, `/` no Linux/macOS)
- Painel de filtros avançados (regex, tamanho, datas, duração, aspect ratio, resolução)
- Geração de thumbnails (primeiro e último frame) com regras de tamanho previsíveis
- Comparação O(n²) com early-exit por resolução e `pixelmatch`
- Progresso e resultados em tempo real (WebSocket)
- Pausar/retomar processamento; salvar imagens de diff apenas se o match ≥ threshold

## Requisitos
- Bun 1.1+
- FFmpeg e FFprobe instalados e acessíveis no PATH
  - Windows (PowerShell):
    ```powershell
    winget install Gyan.FFmpeg
    # ou
    choco install ffmpeg
    ```
  - macOS (Homebrew):
    ```bash
    brew install ffmpeg
    ```
  - Linux (Debian/Ubuntu):
    ```bash
    sudo apt-get update
    sudo apt-get install -y ffmpeg
    ```

## Instalação
```powershell
bun install
```

## Executando em desenvolvimento
```powershell
bun run dev
bun run dev --root "D:\\videos-teste"  # modo restrito à pasta
```
- Frontend (Vite): http://localhost:5173
- Backend HTTP: http://localhost:3001
- WebSocket: ws://localhost:3002

Também é possível rodar separado:
```powershell
bun run dev:backend
bun run dev:frontend
```

## Como usar
1. Abra o app (porta 5173) e navegue até a pasta de vídeos desejada.
2. Clique em “Analisar esta pasta” para iniciar o scan e extração de metadados.
3. Defina filtros conforme necessário e clique em “APLICAR FILTROS”. O contador de vídeos filtrados é atualizado.
4. Use “Mostrar vídeos” para ver detalhes (nome, tamanho, duração, resolução).
5. Clique em “Encontrar Loops Perfeitos” para iniciar:
   - Fase 1: geração de thumbnails (frames inicial e final) com progresso
   - Fase 2: comparação completa via `pixelmatch` (inclui self-loops)
6. Ajuste o threshold (opcional). Resultados são exibidos em tempo real; é possível pausar/retomar.

## Regras de thumbnails
Implementadas em `src/backend/thumbnails.ts`:
- Maior lado ≤ 80 px
- Menor lado ≥ 32 px (se possível sem ultrapassar o original)
- Nunca maior que a resolução original do vídeo
- Dimensões sempre pares (requisito do FFmpeg)
- Saída: PNGs gravados em `.seamless-thumbnails/<YYYY-MM-DDTHH-mm-ss>/start_i.png` e `end_i.png`

## Endpoints do backend
- `GET /api/list?path=...` — listar conteúdo (ou raízes, se vazio)
- `POST /api/select` — define pasta de trabalho e inicia scan completo
- `POST /api/apply-filters` — aplica filtros avançados
- `POST /api/compare` — inicia comparação; body `{ threshold?: number }` (padrão 87.5)
- `POST /api/pause` — pausa/retoma a execução
- `GET /thumbs/*` — serve thumbnails e diffs gerados
- `GET /file*` — serve um arquivo para preview (uso interno do app)

## Estrutura do projeto
```
bunfig.toml
index.html
package.json
prompt-final.txt
prompt-inicial.txt
tailwind.config.ts
tsconfig.json
vite.config.ts
src/
  backend/
    comparison.ts
    metadata.ts
    server.ts
    thumbnails.test.ts
    thumbnails.ts
    types.ts
    handlers/
      comparisonHandler.ts
      filterHandler.ts
      scanHandler.ts
      topMatches.ts
    routes/
      applyFilters.ts
      compare.ts
      file.ts
      list.ts
      pause.ts
      select.ts
      thumbs.ts
  frontend/
    src/
      App.vue
      main.ts
      assets/
        main.css
      components/
        FileExplorer.vue
        FilterPanel.vue
        LoopPreview.vue
        ProgressOverlay.vue
        ResultsTable.vue
        VideoTable.vue
      stores/
        useLoopStore.ts
```

## Como funciona (resumo técnico)
- `server.ts` expõe HTTP (3001) e WebSocket (3002) e mantém estado (`selectedFolder`, `allVideos`, `filteredVideos`). Suporta modo de raiz restrita via argumento `--root=CAMINHO` ou variável de ambiente `LOOP_ROOT_DIR`; quando ativo, a navegação/listagem fica confinada à pasta informada.
- `scanHandler.ts` varre a pasta e, para arquivos de vídeo suportados, chama `getVideoMetadata` que usa `ffprobe` (duração e resolução).
- `filterHandler.ts` aplica regras de regex conforme especificado (primeira regra define modo base) e filtros por tamanho/datas/duração/aspect/resolução.
- `thumbnails.ts` cria os PNGs usando `ffmpeg`, respeitando as regras de dimensionamento.
- `comparison.ts` compara os PNGs carregados do disco via `pixelmatch`, com `diff` opcional salvo somente se `match ≥ threshold`.
- `comparisonHandler.ts` orquestra as duas fases, envia progresso/resultados pelo WebSocket e respeita pausa/cancelamento.

## Scripts úteis
- `bun run dev` — backend + frontend com proxy já configurado (ver `vite.config.ts`)
- `bun run dev:backend` — somente backend
- `bun run dev:frontend` — somente frontend
- `bun run build` — build do frontend

## Dicas e solução de problemas
- “ffmpeg/ffprobe não encontrado”: verifique se está instalado e no PATH. No Windows, reinicie o terminal após instalar.
- Permissões: no Linux/macOS, verifique permissões de leitura na pasta selecionada.
- Pastas com muitos arquivos: o scan e a comparação podem levar tempo. Use filtros para reduzir o espaço de busca.
- Thumbnails antigas: são mantidas em `.seamless-thumbnails/` por timestamp; podem ser reutilizadas/inspecionadas.
- Raiz restrita: ao usar `--root` (ou `LOOP_ROOT_DIR`), qualquer tentativa de acessar fora da pasta retorna erro 400/403; verifique permissões e existência.

## Vídeos de Exemplo
Você pode gerar um conjunto pequeno de vídeos sintéticos para testar a detecção de loops e combinações:

```powershell
bun run sample:videos
```

Isto cria a pasta `sample-videos/` com arquivos:
- `loop_solid_red.mp4`: self-loop perfeito (frame inicial == final)
- `loop_rotating_square.mp4`: quadrado faz rotação completa (início == fim)
- `nonloop_transition.mp4`: transição preto→branco (não é loop)
- `pair_A_end_green.mp4` & `pair_B_start_green.mp4`: combinação A→B deve gerar match alto (último verde → primeiro verde)
- `diff_resolution_A.mp4` & `diff_resolution_B.mp4`: resoluções diferentes (pulados pelo early-exit)
- `loop_gradient.mp4`: gradiente animado que retorna ao estado inicial
- `loop_color_cycle_10s.mp4`: ciclo de cores suave (vermelho→verde→azul→vermelho) (loop)
- `moving_rectangle_horizontal_20s.mp4`: retângulo percorre a largura e retorna (loop)
- `bouncing_square_10s.mp4`: quadrado simulando bounce vertical com retorno (loop)
- `triangle_spin_fade_20s.mp4`: quadrado rotacionando com fade in/out (loop)
- `overlapping_shapes_transition_10s.mp4`: transição entre dois retângulos coloridos (não loop)
- `gradient_pulse_10s.mp4`: pulsos de intensidade mantendo início=fim (loop)
- `multi_morph_shapes_A_10s.mp4`: 6 formas em arranjos segmentados + crossfades (início/fim não sólidos)
- `multi_morph_shapes_B_10s.mp4`: 5 formas sobre barras SMPTE em arranjos segmentados
- `multi_morph_shapes_C_10s.mp4`: 4 formas sobre fundo cinza em arranjos segmentados

As séries `multi_morph_shapes_*` usam composição por segmentos (2s) e transições `xfade` para gerar variação espacial sem depender de expressões de tempo complexas (maior compatibilidade com builds FFmpeg no Windows).

## Casos de Teste Recomendados
Use os arquivos gerados para validar diferentes cenários da aplicação:

### Self-loops (início == fim)
- `loop_solid_red.mp4`
- `loop_rotating_square.mp4`
- `loop_gradient.mp4`
- `loop_color_cycle_10s.mp4`
- `moving_rectangle_horizontal_20s.mp4`
- `bouncing_square_10s.mp4`
- `triangle_spin_fade_20s.mp4`
- `gradient_pulse_10s.mp4`

### Pares com match esperado alto
- `pair_A_end_green.mp4` → `pair_B_start_green.mp4`: último frame verde combina com primeiro frame verde.

### Não-loops / transições
- `nonloop_transition.mp4`
- `overlapping_shapes_transition_10s.mp4`

### Resolução diferente (early-exit previsto)
- `diff_resolution_A.mp4`
- `diff_resolution_B.mp4`

### Complexidade espacial / falso positivo (segmentos + xfade)
Não são self-loops perfeitos; úteis para ver se o threshold evita falsos positivos próximos.
- `multi_morph_shapes_A_10s.mp4`
- `multi_morph_shapes_B_10s.mp4`
- `multi_morph_shapes_C_10s.mp4`

### Sugestão de uso
1. Rode comparação apenas com self-loops para calibrar threshold (ex.: ≥ 87.5).
2. Acrescente não-loops e verifique queda de score.
3. Teste pares verdes para confirmar ranking alto e geração de diff (se acima do threshold).
4. Inclua multi-morph para garantir que mudanças de layout espacial não gerem falsos positivos excessivos.

Use essa pasta para validar filtros, geração de thumbnails e ranking de matches.

## Licença
Este projeto é licenciado sob a **GNU Lesser General Public License v3.0 (LGPL-3.0)**.

Autor: Rafael Hengles (<rhengles@gmail.com>)

Resumo rápido (não substitui o texto completo):
- Você pode usar, estudar, modificar e redistribuir o código.
- Bibliotecas derivadas ou modificações deste código devem permanecer sob LGPL v3.
- Pode ser linkado por software proprietário, desde que melhorias à biblioteca sejam disponibilizadas sob LGPL.
- Distribuições devem incluir aviso de copyright e referência à licença.

Para o texto integral da licença consulte: https://www.gnu.org/licenses/lgpl-3.0.txt

Copyright (c) 2025 – Rafael Hengles.
