# Reconstrução do painel administrativo — "Mesa de Comando do Atlas" (01/11/2026)

> Documento vivo. **Estado: EM ANDAMENTO (passagem de sessão).** Tales avisou que o uso podia acabar; esta seção
> registra exatamente o que foi feito e o que falta, para outra conta continuar sem refazer nada.
> Branch: `claude/ortoquestoes-admin-rebuild-n8f9hl`. Prompt completo do pedido: colado pelo Tales na sessão
> (seções 0–21: arquitetura, métricas, Comando, Pessoas, Receita, Estudo, Simulados, Comunicação, Configurações,
> visual HD-2D, gráficos, componentes, backend, acessibilidade, ordem de implementação e matriz de aceite).

## 1. Passagem: o que já está feito (commitado neste branch)

| Arquivo | Estado | O que é |
|---|---|---|
| `src/componentes/admin/secoes.ts` | **reescrito** | Nova arquitetura: 6 áreas (`comando`, `pessoas`, `estudo`, `receita`, `comunicacao`, `configuracoes`), cada parte com `rotulo`, `modo` (ver/investigar/agir) e `pergunta`. Partes novas: `comando` (Visão geral, padrão de `#/admin`) e `exportar`. `agora` virou "Hoje em detalhe" dentro de Comando. `EstadoUrl` ganhou `periodo` (7/30/90, padrão 30, só em `comando` e `financeiro`). `id` validado (sem espaço/@, ≤80). Apelidos: `geral→comando`, `hoje→agora`, `estudo→conteudo`, `comunicacao→lembretes` + todos os antigos. Funções novas: `parteDe`, `ROTULO_MODO`, `PERIODOS`. |
| `src/componentes/admin/metricas.ts` | **novo** | Dicionário tipado `METRICAS` (nome, pergunta, unidade, numerador/denominador, janela, fonte, qualidade, testes, dedup, latência, comparabilidade, bom sobe/desce) e funções puras: `cortarPeriodos`, `numerosDoPeriodo`, `variacao`, `janelas`, `receitaDoPeriodo` (confirmado × reconstruído, por dia, meio, plano, novas, renovações), `filaDeAtencao` (severidade crítica/alta/média/oportunidade, grupo, causa, contagem, último evento, destino, ação), `fraseDoEstado` (só fatos). Estados de qualidade: confirmado, derivado, estimado (rótulo "Reconstruído"), previsão, indisponível. |
| `src/componentes/admin/PainelDados.tsx` | **novo** | `SeloQualidade`, `Mudanca`, `Minigrafico`, `Indicador` (KPI com definição abrível, valor null = "Indisponível"), `ControlePeriodo` (usa `.seletor`), `GraficoSerie` (SVG medido por ResizeObserver, eixo do zero, barras empilhadas + linha de comparação, hachura no reconstruído, teclado setas/Home/End/Esc, dica em foco e toque), `Legenda`, `QuadroGrafico` (pergunta, fonte, qualidade, estados carregando/vazio/erro com "Tentar novamente", `<details>` "Ver dados"), `Atualizado`. |
| `src/componentes/admin/AdminComando.tsx` | **novo** | Comando › Visão geral: topo com trilha, "Estado do OrtoQuestões" (frase), período, atualizado, faixa da cena HD-2D (`public/pixel/admin/observatorio[-960].webp`, **ainda não gerada**); 5 indicadores (pessoas/dia, questões, cadastros, receita confirmada, assinantes); gráfico de questões/dia com linha do período anterior; "Pede ação agora" (top 3 da fila); áreas: Acontecendo agora, Estudo de hoje (tabela hoje×ontem), Aquisição e ativação (funil com N, % do total e % da etapa), Receita e saúde de pagamento, Qualidade do acervo, Fila de atenção completa agrupada. Busca `serie_diaria_admin(p_dias = 2×período)`, `funil_admin`, `sinais_usuarios_admin` (todas já existentes, com `exigir_administrador`). |
| `src/componentes/admin/AdminReceitaPeriodo.tsx` | **novo** | Faixa de período no topo de Receita › Resultados: confirmada (com variação), reconstruída, primeiras assinaturas/renovações, gráfico diário empilhado (confirmado + reconstruído hachurado), tabelas por meio e por plano com N e %. |
| `src/componentes/admin/AdminListaAssinaturas.tsx` | **novo (extraído)** | A lista de Assinaturas que morava dentro de `AdminAssinaturas.tsx`, sem mudar lógica. Exporta `LinhaAssinatura`, `vigente`, `inicioDe`, `AdminListaAssinaturas`. |
| `src/componentes/admin/AdminAvisosProcessador.tsx` | **novo (extraído)** | A lista de Avisos de pagamento, sem mudar lógica (reprocessar com `confirmar`, marcar visto, link MP). Exporta `AdminAvisosProcessador`. |
| Textos | ajustados | "Financeiro ›" → "Receita ›" nos textos visíveis (rotulos.ts, AdminFinanceiro, AdminAgora, AdminCobrancas); títulos "Avisos do processador", "Catálogo de cartas", "Campanhas e envios". |

## 2. O que FALTA (próxima conta, nesta ordem)

1. **Reescrever o shell** `src/paginas/AdminAssinaturas.tsx` (manter o nome do arquivo e o export `AdminAssinaturas`:
   `App.tsx`, `util/preCarga.ts` e `fixtures/testar_paywall.py` dependem dele; o teste exige as strings
   `listar_assinaturas_admin`, `Acesso negado`, `status_processamento === 'erro'`, `webhook-mercado-pago?acao=reprocessar`
   em `src/paginas/AdminAssinaturas.tsx` + `src/componentes/admin/*.ts*` — glob NÃO recursivo, manter arquivos planos).
   - Remover do arquivo as funções `Assinaturas` e `Pagamentos` e importar `AdminListaAssinaturas` / `AdminAvisosProcessador`
     (já extraídos; hoje o código está duplicado).
   - O arquivo antigo compara `secao === 'agora'`, `s.id === 'pessoas'` e `aba === 'agora'` como padrão: com o
     `secoes.ts` novo isso **não compila** até o shell ser trocado (padrão agora é `comando`; `agora` é parte de `comando`).
   - Shell novo: barra fina (trilha "Painel › Área › Parte", `Atualizado`, Atualizar, Exportar), **sem** o herói antigo;
     navegação lateral no desktop com as 6 áreas e as partes da área ativa aninhadas (2 níveis); no celular, barra
     inferior com 6 áreas + `.seletor` rolável com as partes; cabeçalho de cada parte com `ROTULO_MODO[modo]` + `pergunta`;
     skip link para `#adm-painel`.
   - Ligar: `aba==='comando'` → `<AdminComando …>` (passar `periodo`, `aoMudarPeriodo` via `irPara({periodo})`,
     `irPara(destino)` convertendo `{aba, filtro, vista}`); `financeiro` → `<AdminReceitaPeriodo>` acima de `<AdminFinanceiro>`;
     `exportar` → seção com `<AdminExportar />`; `ajustes` → `<AdminConfiguracoes />`. `usuariosQ` precisa ficar ativo também em `comando`;
     `cobrancasQ` ativo em `comando`; `resumoQ` com atualização em `comando` e `agora`.
   - Em `AdminComando`, trocar o `window.location.reload()` do item "Tentar de novo" por um `recarregar` vindo do shell.
2. **CSS** novo `src/estilos/paginas/AdminPainel.css` (importar no shell): classes usadas e ainda sem estilo —
   `adm-comando*`, `adm-trilha`, `adm-ind*`, `adm-q--*`, `adm-mudanca--*`, `adm-mini-grafico*`, `adm-periodo`,
   `adm-serie*` (barra a/b/c, hachura, linha b tracejada, cursor, dica), `adm-legenda`, `adm-quadro*`, `adm-atualizado`,
   `adm-prioridades*`, `adm-fila*`, `adm-sev--*`, `adm-area-c*`, `adm-contas`, `adm-vivos*`, `adm-hoje`, `adm-sem-medida`,
   `adm-funil-c*`, `adm-dupla*`, `adm-composicao*`, `adm-saude*`, `adm-atalhos`, `adm-receita-periodo*`. Tokens de
   `tokens.css` (porcelana, superfície, verdete, grafite, traço; escuro em `:root[data-tema="escuro"]`). Remover do
   `AdminAssinaturas.css` as regras do shell antigo (`adm-heroi*`, `adm-nav*`, `adm-corpo`, `adm-partes`, `adm-parte`,
   `adm-area__*`) quando o shell novo estiver no ar.
3. **Arte HD-2D** `scripts/gerar_cena_admin.py` (modelo: `scripts/gerar_cena_flashcards.py`, importa
   `gerar_cena_cronograma as cr` e usa `Camada`/`Montagem`): observatório da vila de manhã — mesa de madeira com mapa e
   instrumentos de latão, janela em arco com telhados e torre do relógio ao longe, luminária quente, feixe de sol com
   poeira; lado esquerdo calmo; sem texto, cruz, igreja ou personagem protegido. Pintar 480×200, exportar
   `public/pixel/admin/observatorio.webp` (1440×480, recorte de faixa) e `-960.webp`. 4–6 rodadas olhando o resultado.
4. **Testes**: atualizar `fixtures/testar_admin_secoes.mjs` (áreas novas, `''→comando`, `geral→comando`, `hoje→agora`,
   `periodo` só em comando/financeiro) e criar `fixtures/testar_admin_metricas.mjs` (cortarPeriodos, receitaDoPeriodo
   separando estimada, filaDeAtencao ordenada e sem itens com contagem 0, fraseDoEstado; e que cada chave de `METRICAS`
   aparece em `docs/admin/METRICAS.md`) e incluí-lo no `npm test`. Ajustar `fixtures/e2e_painel_admin.mjs`
   (espera `.adm-nav`; áreas novas; capturas 1440/390 claro/escuro).
5. **`docs/admin/METRICAS.md`** com uma linha por métrica de `metricas.ts` (mesmos campos).
6. `npm ci` (node_modules não estava instalado nesta sessão), `npx tsc --noEmit -p .`, `npm test`, `npm run build`,
   e2e com capturas; 4–6 rodadas visuais; preencher a matriz de paridade abaixo com evidência; abrir PR em rascunho.

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
| 1 | Agora | AdminComando + AdminAgora (Hoje em detalhe) | pendente: shell |
| 2 | Usuários | AdminUsuarios (sem mudança) | pendente: shell |
| 3 | Ficha | AdminFichaUsuario (sem mudança) | pendente: verificação |
| 4 | Crescimento | AdminCrescimento (sem mudança) | pendente |
| 5 | Financeiro | AdminReceitaPeriodo + AdminFinanceiro | pendente: shell |
| 6 | Assinaturas | AdminListaAssinaturas (extraído) | pendente: shell |
| 7 | Cobranças | AdminCobrancas | pendente |
| 8 | Avisos | AdminAvisosProcessador (extraído) | pendente: shell |
| 9–11 | Conteúdo, Questões, Flashcards | sem mudança | pendente |
| 12 | Simulados | sem mudança (trava no servidor já existente a conferir) | pendente |
| 13 | E-mails | sem mudança | pendente |
| 14–15 | Ajustes, Exportação | AdminConfiguracoes, AdminExportar | pendente |
| 16 | Segurança | só RPCs existentes com exigir_administrador | a conferir |
| 17 | Navegação | secoes.ts novo | pendente: testes |

Nada aqui deve ser chamado de "reconstrução completa" até a matriz estar preenchida.
