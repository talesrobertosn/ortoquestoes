# Desempenho do site (16/10/2026)

Medição reprodutível com `scripts/medir_desempenho.mjs` sobre o build de produção (servidor local
com gzip e HTTP/2, Supabase falso, navegador limpo, sem service worker). Perfis: **celular**
(390×844, CPU 4× mais lenta, rede "Fast 3G": 1,6 Mbps e 562 ms de latência) e **computador**
(1400×860, sem limitação). Uma rodada por rota: diferenças de até ~200 ms no celular e ~100 ms no
computador ficam dentro do ruído.

```
npm run build && node scripts/medir_desempenho.mjs --saida medidas.json
```

## O que mudou

- **Pré-carga por intenção** (`src/util/preCarga.ts`): o código da página começa a descer quando o
  dedo ou o ponteiro chega num link; com o aparelho ocioso, desce o próximo passo mais provável.
- **Service worker**: acervo com rede primeiro e prazo de 2,5 s (com rede lenta a cópia responde e
  é renovada em segundo plano); artes do site com cópia enquanto renova; arquivos de versões
  antigas podados depois de 45 dias.
- **Abertura**: preconnect ao Supabase; o índice de questões não desce nas páginas que não o usam;
  JSON do acervo publicado compacto (o índice cai de 1,5 MB para 0,7 MB antes do gzip); mais rotas
  com pré-carga no HTML.
- **Deslocamento de layout (CLS)**: área principal com altura mínima enquanto carrega, faixa de
  aviso guardada no aparelho, espera inicial sem colapso de margens.
- **CPU**: tabela de conquistas fora do código inicial; contagem dos filtros sem repetir a parte
  comum por faceta; incidência do cronograma sem `toLocaleLowerCase` por questão.
- **Orçamento** no `npm test` (`fixtures/testar_orcamento_chunks.mjs`): entrada 49,4 KB gzip
  (teto 56), CSS global 29,6 KB (teto 34), código inicial 152,5 KB (teto 165).

## Antes e depois (ms; "pronto" = a página saiu do carregando e tem conteúdo)

| Perfil | Rota | Pronto | LCP | Tarefas longas | KB baixados | CLS |
|---|---|---|---|---|---|---|
| celular | início (visitante) | 3892 → 3912 | 2844 → 3000 | 834 → 905 | 431 → 426 | 0,532 → 0 |
| celular | início (logado) | 3982 → 3877 | 2812 → 3012 | 960 → 994 | 443 → 430 | 0,192 → 0,002 |
| celular | treinar | 4270 → 4016 | 2476 → 2560 | 994 → 946 | 364 → 360 | 0,436 → 0,002 |
| celular | sessão rápida | 1132 → 1122 | 2492 → 2576 | 1385 → 977 | 372 → 369 | 0,436 → 0,002 |
| celular | revisão | 3840 → 4052 | 2548 → 2768 | 496 → 745 | 387 → 368 | 0,609 → 0,600 |
| celular | cronograma | **7091 → 4553** | 2624 → 2732 | **3575 → 1173** | 408 → 389 | 0,556 → 0,066 |
| celular | desempenho | 3511 → 3536 | 2456 → 2672 | 565 → 551 | 383 → 346 | 0,182 → 0,002 |
| celular | ranking | 3636 → 3631 | 2676 → 2864 | 426 → 491 | 412 → 408 | 0,218 → 0,017 |
| celular | planos | 3700 → 3438 | 2412 → 2460 | 542 → 588 | 390 → 340 | 0,532 → 0 |
| celular | conta | 4556 → 3715 | 2276 → 2800 | 436 → 503 | 385 → 336 | 0,639 → 0,066 |
| celular | resumão | 4600 → 3908 | 2260 → 2300 | 620 → 537 | 390 → 337 | 0,436 → 0,002 |
| celular | simulado nacional | 3917 → 3346 | 2248 → 2416 | 409 → 370 | 363 → 359 | 0,256 → 0,102 |
| computador | início (visitante) | 384 → 259 | 176 → 156 | 205 → 57 | 431 → 426 | 0,259 → 0 |
| computador | treinar | 628 → 403 | 232 → 228 | 202 → 134 | 364 → 360 | 0,472 → 0,001 |
| computador | cronograma | 784 → 383 | 184 → 428 | 557 → 150 | 408 → 389 | 0,391 → 0,001 |
| computador | revisão | 271 → 299 | 192 → 216 | 0 → 54 | 387 → 368 | 0,636 → 0,712 |

Troca de página no celular: início → cronograma **4199 → 1528 ms**; as demais trocas ficaram iguais
(dentro do ruído). Rolagem: sem mudança relevante.

## Leitura

- O ganho claro é o **pulo de layout**: CLS perto de zero em quase todas as páginas (antes, 0,2 a
  0,6 em toda primeira visita) e o **cronograma** no celular, que ficou pronto 2,5 s antes e com
  um terço das tarefas longas.
- LCP no celular subiu 100 a 200 ms em várias rotas numa rodada só; fica dentro do ruído, mas vale
  repetir com `--repeticoes 3` antes de mexer mais.

## Pendências

- **Revisão** continua com CLS 0,6 a 0,7: o conteúdo entra depois do primeiro desenho sem reservar
  espaço. Próximo alvo.
- Medir de novo com 3 repetições e o site publicado (Search Console / Web Vitals reais).
