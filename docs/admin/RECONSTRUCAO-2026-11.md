# Reconstrução do painel administrativo — "Mesa de Comando do Atlas" (01/11/2026)

> Documento vivo. **Estado: shell, CSS, faixa HD-2D, testes e documentação de métricas feitos (01/11/2026, segunda
> sessão); falta a revisão do Tales nas telas e a PR.** Branch da primeira sessão: `claude/ortoquestoes-admin-rebuild-n8f9hl`;
> a segunda sessão continuou em `claude/gallant-cannon-5hynui` (com o commit da primeira mesclado). Prompt completo do pedido: colado pelo Tales na sessão
> (seções 0–21: arquitetura, métricas, Comando, Pessoas, Receita, Estudo, Simulados, Comunicação, Configurações,
> visual HD-2D, gráficos, componentes, backend, acessibilidade, ordem de implementação e matriz de aceite).

## 1. Passagem: o que já está feito (commitado neste branch)

| Arquivo | Estado | O que é |
|---|---|---|
| `src/componentes/admin/secoes.ts` | **reescrito** | Nova arquitetura: 6 áreas (`comando`, `pessoas`, `estudo`, `receita`, `comunicacao`, `configuracoes`), cada parte com `rotulo`, `modo` (ver/investigar/agir) e `pergunta`. Partes novas: `comando` (Visão geral, padrão de `#/admin`) e `exportar`. `agora` virou "Hoje em detalhe" dentro de Comando. `EstadoUrl` ganhou `periodo` (7/30/90, padrão 30, só em `comando` e `financeiro`). `id` validado (sem espaço/@, ≤80). Apelidos: `geral→comando`, `hoje→agora`, `estudo→conteudo`, `comunicacao→lembretes` + todos os antigos. Funções novas: `parteDe`, `ROTULO_MODO`, `PERIODOS`. |
| `src/componentes/admin/metricas.ts` | **novo** | Dicionário tipado `METRICAS` (nome, pergunta, unidade, numerador/denominador, janela, fonte, qualidade, testes, dedup, latência, comparabilidade, bom sobe/desce) e funções puras: `cortarPeriodos`, `numerosDoPeriodo`, `variacao`, `janelas`, `receitaDoPeriodo` (confirmado × reconstruído, por dia, meio, plano, novas, renovações), `filaDeAtencao` (severidade crítica/alta/média/oportunidade, grupo, causa, contagem, último evento, destino, ação), `fraseDoEstado` (só fatos). Estados de qualidade: confirmado, derivado, estimado (rótulo "Reconstruído"), previsão, indisponível. |
| `src/componentes/admin/PainelDados.tsx` | **novo** | `SeloQualidade`, `Mudanca`, `Minigrafico`, `Indicador` (KPI com definição abrível, valor null = "Indisponível"), `ControlePeriodo` (usa `.seletor`), `GraficoSerie` (SVG medido por ResizeObserver, eixo do zero, barras empilhadas + linha de comparação, hachura no reconstruído, teclado setas/Home/End/Esc, dica em foco e toque), `Legenda`, `QuadroGrafico` (pergunta, fonte, qualidade, estados carregando/vazio/erro com "Tentar novamente", `<details>` "Ver dados"), `Atualizado`. |
| `src/componentes/admin/AdminComando.tsx` | **novo** | Comando › Visão geral: topo com trilha, "Estado do Orto Questões" (frase), período, atualizado, faixa da cena HD-2D (`public/pixel/admin/observatorio[-960].webp`, **ainda não gerada**); 5 indicadores (pessoas/dia, questões, cadastros, receita confirmada, assinantes); gráfico de questões/dia com linha do período anterior; "Pede ação agora" (top 3 da fila); áreas: Acontecendo agora, Estudo de hoje (tabela hoje×ontem), Aquisição e ativação (funil com N, % do total e % da etapa), Receita e saúde de pagamento, Qualidade do acervo, Fila de atenção completa agrupada. Busca `serie_diaria_admin(p_dias = 2×período)`, `funil_admin`, `sinais_usuarios_admin` (todas já existentes, com `exigir_administrador`). |
| `src/componentes/admin/AdminReceitaPeriodo.tsx` | **novo** | Faixa de período no topo de Receita › Resultados: confirmada (com variação), reconstruída, primeiras assinaturas/renovações, gráfico diário empilhado (confirmado + reconstruído hachurado), tabelas por meio e por plano com N e %. |
| `src/componentes/admin/AdminListaAssinaturas.tsx` | **novo (extraído)** | A lista de Assinaturas que morava dentro de `AdminAssinaturas.tsx`, sem mudar lógica. Exporta `LinhaAssinatura`, `vigente`, `inicioDe`, `AdminListaAssinaturas`. |
| `src/componentes/admin/AdminAvisosProcessador.tsx` | **novo (extraído)** | A lista de Avisos de pagamento, sem mudar lógica (reprocessar com `confirmar`, marcar visto, link MP). Exporta `AdminAvisosProcessador`. |
| Textos | ajustados | "Financeiro ›" → "Receita ›" nos textos visíveis (rotulos.ts, AdminFinanceiro, AdminAgora, AdminCobrancas); títulos "Avisos do processador", "Catálogo de cartas", "Campanhas e envios". |

## 2. Segunda sessão (01/11/2026): o que foi feito

1. **Shell novo** em `src/paginas/AdminAssinaturas.tsx` (mesmo nome e export): barra fina (`.adm-topo-painel`: migalhas
   "Painel › Área › Parte", Atualizado, Atualizar, Exportar), sem o herói antigo; coluna lateral no computador com as seis
   áreas e as partes da área aberta aninhadas; no celular, barra inferior com as seis áreas (nome curto `curto` em `secoes.ts`:
   Comando, Pessoas, Estudo, Receita, E-mails, Ajustes) e as partes num trilho rolável fixo acima do conteúdo; link "Pular
   para o conteúdo"; cabeçalho de cada parte com o modo (Ver, Investigar, Agir) e a pergunta. `Assinaturas` e `Pagamentos`
   saíram do arquivo (usa `AdminListaAssinaturas` e `AdminAvisosProcessador`). Comando ligado com período no endereço,
   `irPara` validado por `lerUrl`, e "Tentar de novo" da fila chamando o `recarregar` do shell (sem recarregar a página).
   Receita › Resultados abre com `AdminReceitaPeriodo` acima de `AdminFinanceiro` (só com as cobranças gravadas);
   Configurações › Exportação é parte própria.
2. **CSS** novo `src/estilos/paginas/AdminPainel.css`; regras do shell antigo (`adm-heroi*`, `adm-nav*`, `adm-corpo`,
   `adm-partes`, `adm-parte*`, `adm-area*`) saíram de `AdminAssinaturas.css`. Nomes que já existiam e colidiam foram
   trocados: `.adm-barra` (barrinha de progresso antiga) → `.adm-topo-painel`; `.adm-trilha` (linha do tempo da ficha)
   → `.adm-migalhas`; `.adm-composicao` (AdminGraficos) → `.adm-comp-c`. **Responsivo pelo espaço do painel**
   (container query `comando`), não pela janela: estreito, 2 colunas; médio, o indicador principal à esquerda nas duas
   linhas e quatro em 2 × 2; largo (72rem de painel), cinco lado a lado. A definição do indicador ("?") abre num balão
   por cima, sem esticar a linha. No computador a cena fica só na metade direita do topo, sem passar por baixo do texto.
3. **Arte**: `scripts/gerar_cena_admin.py` gera `public/pixel/admin/observatorio{,-960,-movel}.webp` a partir do
   observatório já aprovado (`gerar_cena_observatorio.py`, luz da manhã) com o terço esquerdo mais calmo. Não é cena
   nova: se o Tales quiser a "mesa de comando" própria (mesa com mapa, janela em arco com a torre do relógio), é o próximo
   passo de arte.
4. **Testes**: `fixtures/testar_admin_secoes.mjs` reescrito (seis áreas, modos, nomes curtos, endereços antigos e novos,
   período só em Comando e Resultados, id sem e-mail/espaço); `fixtures/testar_admin_metricas.mjs` novo, no `npm test`
   (períodos, receita confirmada × reconstruída batendo com o gráfico, fila ordenada e sem item zerado, frase sem número
   inventado, e cada métrica de `METRICAS` em `docs/admin/METRICAS.md`); `fixtures/e2e_painel_admin.mjs` atualizado
   (Comando, navegação em dois níveis, Avisos, Exportação, tablet 1024, capturas 1440/1024/390 claro e escuro) e com
   três conferências que já estavam velhas antes desta reconstrução corrigidas (rótulo "Desligaram a renovação hoje",
   "Obrigado pela assinatura" e o catálogo de cartas, que passou de 32 para 42 cartões: agora o número vem do filtro).
5. **`docs/admin/METRICAS.md`** gerado do próprio dicionário.
6. `npx tsc --noEmit -p .`, `npm test`, `npm run build` e o e2e passaram.

### O que ainda falta

- Revisão visual do Tales (prints enviados na conversa) e a PR.
- Cena HD-2D própria do painel, se ele quiser (ver item 3).
- Concordância de número nos títulos da fila ("1 Avisos do processador com falha"): título único hoje; pode ganhar singular.

## 3. Inventário (antes da reconstrução)

- Entrada: `src/paginas/AdminAssinaturas.tsx` (460 linhas: shell + Assinaturas + Pagamentos), rota `#/admin` em `App.tsx`.
- Componentes: `src/componentes/admin/*` (≈9.800 linhas com CSS). Dados: `usarRpc.ts` (cache por chave, um voo por
  chave, cancelamento, atualização com aba visível — mantido), `contadores.ts` (RPC leve com plano B).
- RPCs (todas com `exigir_administrador()` no servidor, cache de 5 min na parte 35): `listar_assinaturas_admin`,
  `listar_eventos_pagamento_admin`, `resumo_admin`, `contadores_admin`, `listar_usuarios_admin`, `cobrancas_admin`,
  `serie_diaria_admin(p_dias 7–365)`, `funil_admin`, `retencao_admin`, `sinais_usuarios_admin`, `resumo_indicacoes_admin`,
  ficha (`detalhe_usuario_admin`, `atividade_usuario_admin`, `ficha_extra_usuario_admin`), e as de conteúdo, simulados,
  e-mails e configurações dos respectivos componentes. **Nenhuma RPC nova foi necessária até aqui.**
- Riscos de permissão: nenhum novo; o Comando só lê RPCs existentes. Busca digitada, e-mail e nome nunca vão para a URL.

## 4. Mapa de URLs (antigo → novo)

| Endereço | Abre em |
|---|---|
| `#/admin` | Comando › Visão geral (antes: Agora) |
| `?aba=agora`, `?aba=hoje` | Comando › Hoje em detalhe |
| `?aba=geral` | Comando › Visão geral |
| `?aba=usuarios[&filtro=…]`, `?aba=pessoas` | Pessoas › Explorador |
| `?aba=crescimento` | Pessoas › Análise |
| `?aba=conteudo[&vista=…]`, `?aba=avaliacoes`, `?aba=relatos`, `?aba=estudo` | Estudo › Triagem (vista preservada) |
| `?aba=questoes&id=…` | Estudo › Editor de questões |
| `?aba=opinioes`, `?aba=simulados` | Estudo › Opiniões / Simulados |
| `?aba=financeiro[&periodo=7|90]`, `?aba=receita` | Receita › Resultados |
| `?aba=assinaturas`, `?aba=cobrancas` | Receita › Assinaturas / Cobranças |
| `?aba=pagamentos`, `?aba=avisos` | Receita › Avisos do processador (links dos e-mails de alerta) |
| `?aba=lembretes`, `emails`, `cartas`, `operacoes`, `comunicacao` | Comunicação › Campanhas e envios |
| `?aba=todas` | Comunicação › Catálogo de cartas |
| `?aba=ajustes`, `?aba=configuracoes` | Configurações › Site e acesso |
| `?aba=exportar` | Configurações › Exportação (novo) |

## 5. Matriz de paridade (preencher com evidência no fim)

| # | Função | Componente novo | Situação |
|---|---|---|---|
| 1 | Agora | AdminComando + AdminAgora (Hoje em detalhe) | ok: e2e (online, listas, filtros, ficha, carta) |
| 2 | Usuários | AdminUsuarios (sem mudança) | ok: e2e (Pessoas › Explorador) |
| 3 | Ficha | AdminFichaUsuario (sem mudança) | ok: e2e (abre em "Carta e ações") |
| 4 | Crescimento | AdminCrescimento (sem mudança) | ok: e2e (Pessoas › Análise, captura) |
| 5 | Financeiro | AdminReceitaPeriodo + AdminFinanceiro | ok: e2e (faixa do período, Ganhos, previsão) |
| 6 | Assinaturas | AdminListaAssinaturas (extraído) | ok: typecheck + testar_paywall (strings) |
| 7 | Cobranças | AdminCobrancas | ok: sem mudança, ligada |
| 8 | Avisos | AdminAvisosProcessador (extraído) | ok: e2e (lista com o erro) + testar_paywall (reprocessar) |
| 9–11 | Conteúdo, Questões, Flashcards | sem mudança | ok: ligados; Simulados visível no e2e |
| 12 | Simulados | sem mudança | ok: ligado (a trava no servidor não foi mexida) |
| 13 | E-mails | sem mudança | ok: e2e (Campanhas, Catálogo de cartas inteiro) |
| 14–15 | Ajustes, Exportação | AdminConfiguracoes, AdminExportar | ok: e2e (Exportação como parte) |
| 16 | Segurança | só RPCs existentes com exigir_administrador | ok: nenhuma RPC nova; nada pessoal no endereço (testado) |
| 17 | Navegação | secoes.ts novo | ok: testar_admin_secoes + e2e (endereços antigos) |

Nada aqui deve ser chamado de "reconstrução completa" até a matriz estar preenchida.
