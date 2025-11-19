# Instruções para GitHub Copilot

Contexto: este repositório é um app local (sem nuvem) para descobrir loops de vídeo perfeitos (incluindo self-loops). Ele roda com Bun + Vite + Vue 3 no frontend e um backend Bun com WebSocket. O pipeline faz:
- Explorar o sistema de arquivos, o usuário escolhe a pasta de trabalho
- Aplicar filtros avançados (regex, tamanho, datas, duração, aspect ratio, resolução)
- Gerar thumbnails (primeiro e último frame de cada vídeo) em disco
- Comparar todas as combinações O(n²) via pixelmatch (com early skip por resolução)
- Exibir progresso e resultados em tempo real via WebSocket

Principais tecnologias já em uso
- Runtime: Bun 1.1+
- Frontend: Vue 3 + Vite 5+ (Pinia)
- Imagens: sharp
- Comparação: pixelmatch
- Comunicação: ws (WebSocket)
- Ferramentas externas: ffmpeg/ffprobe disponíveis no PATH (chamadas via Bun `$`)

Arquitetura e pontos de extensão
- `src/backend/server.ts`: monta o servidor (HTTP 3001) e WebSocket (3002), estado global, broadcast.
- Rotas HTTP em `src/backend/routes/`: `list`, `select`, `applyFilters`, `compare`, `pause`, `thumbs`, `file`.
- Handlers em `src/backend/handlers/`:
  - `scanHandler.ts`: varre pasta selecionada e coleta metadados
  - `filterHandler.ts`: aplica regras de regex e filtros (tamanho, datas, duração, AR, resolução)
  - `comparisonHandler.ts`: orquestra geração de thumbnails e comparação O(n²)
  - `topMatches.ts`: acompanha top-N matches
- Utilitários:
  - `metadata.ts`: obtém duração/largura/altura via `ffprobe`
  - `thumbnails.ts`: gera thumbnails via `ffmpeg` e calcula tamanho conforme regras
  - `comparison.ts`: compara PNGs com `pixelmatch` (gera diff condicionado ao threshold)
  - `types.ts`: tipos compartilhados (ex.: `VideoFile`)

Convenções de código
- TypeScript estrito. Crie funções pequenas, puras quando possível. I/O e efeitos em camadas finas e fáceis de mockar.
- Não reformate arquivos inteiros sem motivo. Faça mudanças cirúrgicas e coesas.
- Nomes claros; evite variáveis de uma letra. Sem comentários supérfluos inline.
- Logs e mensagens de UI preferencialmente em PT-BR; nomes de símbolos em inglês.
- Siga o padrão existente para pastas e nomes: thumbnails ficam em `.seamless-thumbnails/<timestamp>/start_i.png` e `end_i.png`.
- Só grave diffs quando `match >= threshold` (veja `comparison.ts`).
- Respeite o early-exit por resolução antes de comparar pixels.

Diretrizes de dependências
- Evite adicionar dependências pesadas. Se imprescindível, justifique no PR e verifique compatibilidade com Bun.
- Não presuma bundlers/Node APIs indisponíveis; use Bun APIs já presentes (ex.: `Bun.file`, ``$`` para ffmpeg/ffprobe).

Integração com o frontend
- Mudanças em rotas ou payloads devem manter compatibilidade ou vir com o ajuste correspondente no Vue.
- Backend expõe:
  - `GET /api/list?path=` — listar diretórios/raiz
  - `POST /api/select` — define pasta e inicia scan
  - `POST /api/apply-filters` — aplica filtros
  - `POST /api/compare` — inicia comparação (payload `{ threshold?: number }`)
  - `POST /api/pause` — pausa/retoma
  - `GET /thumbs/*` — serve thumbnails/diffs
  - `GET /file*` — serve arquivo para preview
- WebSocket (porta 3002): mensagens `progress`, `videos`, `result`, etc.

Performance e UX
- Comparação é O(n²). Mantenha progressos em lotes e não bloqueie a event loop; respeite pausa/cancelamento (`comparisonControl`).
- Evite manter imagens em memória; leia PNGs do disco (como feito).
- Em `thumbnails.ts`, preserve regras: maior lado ≤ 80px, menor lado ≥ 32px, nunca maior que o original, dimensões pares.

Testes e qualidade
- Prefira funções puras nos handlers utilitários para facilitar testes.
- Inclua JSDoc nas funções públicas.
- Se criar novas funções de utilidade, mantenha assinatura simples e parâmetros tipados.

Commits e PRs
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
- Descreva impacto em API/UX, scripts e requisitos.
- Inclua notas de rollout e, quando aplicável, instruções de verificação manual.

O que NÃO fazer
- Não apagar thumbnails gerados; são artefatos úteis e cache implícito.
- Não armazenar imagens grandes em memória nem fazer polling no frontend (use WS).
- Não alterar portas/rotas sem atualizar o frontend/proxy do Vite.
- Não introduzir mudanças amplas de estilo não relacionadas ao objetivo do PR.

Como rodar localmente (referência rápida)
- Pré-requisitos: Bun 1.1+, `ffmpeg` e `ffprobe` no PATH.
- Comandos:
  - `bun install`
  - `bun run dev` — inicia backend (3001/3002) e Vite (5173)
  - Separados: `bun run dev:backend` e `bun run dev:frontend`

Checklist rápido para alterações
- [ ] Mantém o padrão de pastas e nomes de arquivo
- [ ] Respeita as regras de geração de thumbnails
- [ ] Atualiza progressos e emite eventos WS
- [ ] Não quebra compatibilidade das rotas/payloads
- [ ] Evita dependências desnecessárias
- [ ] Inclui JSDoc e tipos adequados
