# Filtros de Vídeo (`/api/apply-filters`)

Este documento descreve todas as regras disponíveis para filtrar os arquivos de vídeo após o scan inicial. O endpoint HTTP envolvido é:

```
POST /api/apply-filters
Content-Type: application/json
```

Payload base:
```jsonc
{
  "regexRules": [
    { "pattern": "...", "mode": "positive" | "negative", "target": "name" | "ext" | "full" },
    // ... outras regras
  ],
  "filters": {
    "sizeMin": 0,          // MB
    "sizeMax": 500,        // MB
    "createdAfter": "2025-01-01T00:00:00.000Z",
    "createdBefore": "2025-12-31T23:59:59.999Z",
    "modifiedAfter": "2025-01-01T00:00:00.000Z",
    "modifiedBefore": "2025-06-30T23:59:59.999Z",
    "durationMin": 0,      // segundos
    "durationMax": 12,     // segundos
    "aspectMin": 1.3,      // razão Largura/Altura mínima
    "aspectMax": 1.9,      // razão Largura/Altura máxima
    "widthMin": 640,
    "widthMax": 1920,
    "heightMin": 360,
    "heightMax": 1080
  }
}
```

## 1. Regras Regex (`regexRules`)

Lista ordenada de regras. Cada regra possui:
- `pattern`: expressão regular (case-insensitive). Espaços em branco nas pontas são ignorados. A PARTIR DE 20/11/2025: padrão vazio ou regex inválida gera erro HTTP 400 (não é mais descartado silenciosamente).
- `mode`: `positive` ou `negative`.
  - `positive`: regra é considerada satisfeita se o texto ALVO casa com o regex.
  - `negative`: regra é considerada satisfeita se o texto ALVO **não** casa com o regex.
- `target` define qual cadeia textual é verificada:
  - `name`: nome base sem extensão (ex.: `video_loop_final` para `video_loop_final.mp4`).
  - `ext`: extensão em minúsculas sem ponto (ex.: `mp4`).
  - `full`: nome completo do arquivo incluindo extensão (ex.: `video_loop_final.mp4`).

### Modo Base (Regra 1)
A primeira regra válida (com `pattern` não vazio) define o "modo base" de combinação:
- Se a primeira regra é `positive`: inicia com CONJUNTO VAZIO e cada regra contribui ADITIVAMENTE. Isto é, qualquer vídeo que satisfaça **cada regra individualmente** (incluindo negativas que não casam) é ADICIONADO ao resultado. Resultado final = união de todos os conjuntos de índices satisfeitos.
- Se a primeira regra é `negative`: inicia com TODOS os vídeos e cada regra aplica INTERSEÇÃO. Ou seja, um vídeo só permanece se satisfizer TODAS as regras segundo sua lógica (`positive` precisa casar, `negative` precisa não casar). Resultado final = interseção sucessiva.

Em outras palavras:
- Primeiro `positive` → comportamento de "whitelist incremental": cada regra (inclusive negativas) expande o conjunto (negativas adicionam vídeos que **não** casam com o padrão delas).
- Primeiro `negative` → comportamento de "filtro restritivo": cada regra vai reduzindo.

### Implicação Prática Importante
Para EXCLUIR padrões (blacklist), comece com uma regra `negative`; assim somente arquivos que não casarem com aquele padrão permanecem, e regras seguintes refinam.
Se você começar com `positive` e incluir regras `negative`, estará **adicionando** os vídeos que não casam com aquele padrão, o que pode surpreender.

### Tratamento de Erros
O backend valida TODAS as regras antes de aplicar:
- Padrão vazio (após `trim`) → erro.
- Regex que não compila → erro.

Em caso de qualquer erro, nada é aplicado e a resposta HTTP será `400` com corpo JSON:
```json
{ "error": "Erros nas regras regex: Regra 1: pattern vazio; Regra 3: regex inválida ([" }
```
O texto pode variar conforme as regras falhas. Corrija o payload e reenvie.

### Exemplos de Regex
1. Selecionar apenas arquivos `.mp4` cujo nome contenha "loop":
```json
{
  "regexRules": [
    { "pattern": "loop", "mode": "positive", "target": "name" },
    { "pattern": "mp4",  "mode": "positive", "target": "ext" }
  ]
}
```
(Modo base = positive → união incremental; porém ambos os padrões devem ser satisfeitos para inclusão.)

2. Excluir tudo que contenha `test` ou `draft` no nome:
```json
{
  "regexRules": [
    { "pattern": "test",  "mode": "negative", "target": "full" },
    { "pattern": "draft", "mode": "negative", "target": "name" }
  ]
}
```
(Modo base = negative → começa com todos e remove onde haja correspondência.)

3. Incluir vídeos cujo nome contenha `loop` OU que NÃO tenham a extensão `mov`:
```json
{
  "regexRules": [
    { "pattern": "loop", "mode": "positive", "target": "name" },
    { "pattern": "mov",  "mode": "negative", "target": "ext" }
  ]
}
```
(Primeira é positive → união; segunda negative adiciona arquivos que não são `.mov`.)

4. Filtrar estritamente para `.webm` com nome começando em `a` ou `b` (case-insensitive):
```json
{
  "regexRules": [
    { "pattern": "webm", "mode": "negative", "target": "ext" },   // mantém somente quem NÃO falha (ou seja, ext == webm)
    { "pattern": "^[ab]", "mode": "positive", "target": "name" }
  ]
}
```
(A primeira negative reduz para `webm`; a segunda positive exige início a/b.)

## 2. Filtros de Metadados (`filters`)
Aplicados APÓS as regras regex ao conjunto já reduzido/adicionado. Todos são opcionais; ausência ou `null` ignora.

Campo | Tipo | Unidade / Formato | Regra
------|------|-------------------|------
`sizeMin` | number | MB | Exclui se `sizeMB < sizeMin`.
`sizeMax` | number | MB | Exclui se `sizeMB > sizeMax`.
`createdAfter` | string | ISO Date | Exclui se `ctime < createdAfter`.
`createdBefore` | string | ISO Date | Exclui se `ctime > createdBefore`.
`modifiedAfter` | string | ISO Date | Exclui se `mtime < modifiedAfter`.
`modifiedBefore` | string | ISO Date | Exclui se `mtime > modifiedBefore`.
`durationMin` | number | segundos | Usa `(video.duration ?? 0)`; exclui se menor.
`durationMax` | number | segundos | Exclui se maior.
`aspectMin` | number | razão (W/H) | Só calcula se `width` e `height` existirem.
`aspectMax` | number | razão (W/H) | Idem acima.
`widthMin` | number | pixels | Usa `(video.width ?? 0)`.
`widthMax` | number | pixels | Exclui se maior.
`heightMin` | number | pixels | Usa `(video.height ?? 0)`.
`heightMax` | number | pixels | Exclui se maior.

Observações:
- Convertemos tamanho do arquivo para MB: `size / (1024 * 1024)`.
- Aspect Ratio = `width / height` (float). Precisa de ambos presentes.
- Se metadados (ex.: `duration`, `width`, `height`) ainda não foram populados pelo processo de scan/`ffprobe`, valores `undefined` são tratados como `0` ou ignorados conforme o caso.

### Exemplo Combinado (Regex + Metadados)
Selecionar vídeos `.mp4` ou `.mov` com nome contendo `loop`, duração entre 2 e 8 segundos, resolução mínimo 640x360 e aspecto entre 1.3 e 2.0:
```json
{
  "regexRules": [
    { "pattern": "loop", "mode": "positive", "target": "name" },
    { "pattern": "mp4|mov", "mode": "positive", "target": "ext" }
  ],
  "filters": {
    "durationMin": 2,
    "durationMax": 8,
    "widthMin": 640,
    "heightMin": 360,
    "aspectMin": 1.3,
    "aspectMax": 2.0
  }
}
```

### Exemplo de Exclusão Rígida
Remover qualquer arquivo cujo nome contenha "sample" ou seja maior que 200 MB, e aceitar somente resoluções até Full HD:
```json
{
  "regexRules": [
    { "pattern": "sample", "mode": "negative", "target": "full" }
  ],
  "filters": {
    "sizeMax": 200,
    "widthMax": 1920,
    "heightMax": 1080
  }
}
```

## 3. Ordem de Aplicação
1. Normalização e filtragem de regras regex vazias.
2. Determinação do modo base pela primeira regra válida.
3. Aplicação cumulativa (união ou interseção) conforme lógica acima.
4. Aplicação sequencial dos filtros de metadados sobre o array resultante.
5. Atualização de estado global e broadcast (`type: 'videos'`).

## 4. Boas Práticas
- Para criar listas de exclusão (blacklist), sempre comece com uma regra `negative` para evitar adicionar inadvertidamente itens que não casam.
- Agrupe extensões com separador de alternância (`mp4|mov|webm`) quando quiser multi-match em uma única regra.
- Use âncoras (`^`, `$`) para restringir início ou fim do nome base.
- Teste regex complexas em ferramentas externas antes de aplicar.
- Comece com filtros mais restritivos para acelerar a comparação posterior (reduz `n` na etapa O(n²)).

## 5. Limitações / Edge Cases
- Erros de regex bloqueiam a aplicação de filtros (fail-fast). Não há aplicação parcial.
- Se metadados ainda não disponíveis (processo de probe não completo), filtros de duração/resolução podem excluir indevidamente (tratados como 0). Reaplicar filtros após conclusão do scan pode ser necessário.
- Campos numéricos tratam `null` e `undefined` como "não aplicar"; use explicitamente um valor para ativar.

## 6. Resumo Rápido
| Grupo | Chave | Objetivo |
|-------|-------|----------|
| Regex | `positive` | Adiciona (modo base positive = união) / exige (modo base negative = interseção). |
| Regex | `negative` | Adiciona se NÃO casa (modo base positive) / Exige que NÃO case (modo base negative). |
| Metadados | `sizeMin/Max` | Faixa de tamanho em MB. |
| Metadados | `created*/modified*` | Janelas temporais ISO. |
| Metadados | `durationMin/Max` | Faixa em segundos. |
| Metadados | `aspectMin/Max` | Faixa da razão W/H. |
| Metadados | `width*/height*` | Restrições de resolução. |

## 7. Verificação Manual
Após enviar o payload, o backend retornará via WebSocket uma mensagem `videos` com:
```jsonc
{
  "type": "videos",
  "videos": [ /* lista filtrada */ ],
  "total": 123 // total original antes dos filtros
}
```
Compare `videos.length` com `total` para avaliar o impacto.

---
Última atualização: 2025-11-20 (tratamento de regex inválida atualizado)
