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
- `server.ts` expõe HTTP (3001) e WebSocket (3002) e mantém estado (`selectedFolder`, `allVideos`, `filteredVideos`).
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
