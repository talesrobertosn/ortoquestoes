# Painel administrativo 3.0: reconstrução (01 e 02/11/2026)

Pedido do Tales: refazer **toda** a camada visual e a arquitetura de interação do painel, sem reaproveitar
a aparência antiga, preservando dados, regras de negócio, autenticação, permissões, Mercado Pago, e-mails,
simulados e os endereços antigos. A primeira tentativa (PR #801) só trocou a casca e foi desfeita (PR #806);
esta começa do zero.

## Arquitetura

| Camada | Onde | O que faz |
| --- | --- | --- |
| Rotas e IA | `src/admin/rotas.ts` | 6 áreas, 23 partes, endereços antigos, estado no endereço (`aba`, `filtro`, `vista`, `id`, `periodo`) |
| Casca | `src/admin/Painel.tsx` | Barra lateral, trilha, "Atualizado às", busca global (Ctrl K ou /), celular com faixa de partes e barra de baixo; o site abre o painel sem o cabeçalho e o rodapé dele |
| Dados | `src/admin/dados/` | Consultas compartilhadas (`painel.tsx`), séries (`consultas.ts`), pessoas (`pessoas.ts`), linguagem de dados (`metricas.ts`) |
| Sistema de design | `src/admin/admin.css`, `src/admin/ui/` | Tokens `a3-` (monocromo, verdete raro, vermelho só para erro e destrutivo), claro e escuro; kit, gráficos, tabela, gaveta, confirmação, avisos, paleta, ícones próprios |
| Módulos | `src/admin/modulos/` | Um arquivo por tela, carregado sob demanda (o maior tem 45 kB) |
| Lógica reaproveitada | `src/componentes/admin/*.ts` | Receita, financeiro, ganhos, pagamentos, rótulos, modelos de e-mail, montagem do simulado, exportação: as contas não mudaram |

Todas as RPCs continuam passando por `exigir_administrador` no banco; nenhuma RPC, política, `SECURITY DEFINER`
ou `search_path` foi alterada. Nenhum dado administrativo foi exposto em endpoint público.

## Arquitetura da informação

| Área | Partes |
| --- | --- |
| Comando | Visão geral (estado do Orto Questões, cena HD-2D, "Pede ação agora"), Atividade agora, Pendências |
| Pessoas | Explorador, Aquisição e ativação, Retenção e ritmo, Perfis e origem |
| Estudo e conteúdo | Qualidade do acervo, Editor de questões, Simulados, Opiniões dos flashcards |
| Receita | Visão financeira, Previsão, Assinaturas, Cobranças, Avisos do processador |
| Comunicação | Campanhas, Cartas pessoais, Relatórios e envios, Catálogo de cartas |
| Configurações | Acesso e pagamentos, Aviso no topo do site, Exportação |

## Matriz de paridade (nada do painel antigo ficou de fora)

| Painel antigo | Onde está agora | Mantido | Novo |
| --- | --- | --- | --- |
| Agora (torre de controle) | Comando › Atividade agora | números do dia, online com o que cada um vê, estudaram, entraram, recém-cadastrados, mais ativos, dinheiro hoje, biblioteca | linha do dia em ordem do tempo, monitor com segmentos |
| Pede atenção (dentro de Agora) | Comando › Visão geral e Pendências | todos os alertas | fila única com severidade, causa, contagem, último evento e ação; fonte que falha vira item, nunca zero |
| Pessoas › Usuários | Pessoas › Explorador | 9 filtros, busca, colunas, CSV do recorte, ficha | filtro no endereço, ordenação por coluna, filtros ativos removíveis, tabela que vira blocos no celular |
| Ficha do usuário | Gaveta por cima de qualquer tela | resumo, atividade, assinatura com reprocessar, carta, cortesia, ranking, desconectar | abas, foco preso, Esc devolve o foco |
| Pessoas › Crescimento | Pessoas › Aquisição; Retenção e ritmo; Perfis e origem | série diária, funil, semanas e meses, coortes, adoção, mapa dia e hora, perfis, indicações | comparação com o período anterior, funil com o denominador certo, "Ver dados" em todo gráfico |
| Financeiro › Ganhos e Resumo do mês | Receita › Visão financeira | hoje, 7 dias, mês contra o mês passado até o mesmo dia, ano, desde o começo, por meio, por plano, MRR, base, renovação, cancelamento, mês a mês com churn e CSV, aviso de paga sem cobrança | confirmado e reconstruído separados (hachura), "Como estes números são calculados" |
| Financeiro › Previsão | Receita › Previsão | fechamento do mês, horizontes 1, 3, 6 e 12, hipótese do Pix com taxa observada e presets, previsão mês a mês, cartões que renovam | soma do fechamento explicada linha a linha |
| Financeiro › Assinaturas | Receita › Assinaturas | grupos, plano, meio, período, busca, CSV, selo Teste e Renovação | régua do período pago |
| Financeiro › Pagamentos | Receita › Cobranças | período, meio, situação, busca, totais, reembolsadas riscadas, link do Mercado Pago, CSV | extrato agrupado por dia |
| Avisos de pagamento | Receita › Avisos do processador | filtros, vistos, reprocessar com confirmação, link, ficha | fila com detalhe ao lado |
| Conteúdo (suspeitas, fáceis, temas, relatos, avaliações) | Estudo › Qualidade do acervo | as cinco vistas, relatos com nota, aviso por e-mail, lidas | fila → detalhe → decisão → próximo |
| Editar questões | Estudo › Editor de questões | todos os campos, imagens, esconder, apagar, desfazer, lista das editadas e fora do site | prévia ao lado enquanto digita, barra de salvar com estado, aviso ao sair sem salvar |
| Simulados | Estudo › Simulados | montagem, sorteio com semente, cotas, trocas, prévia da página, rascunho, publicar, trava por participantes, datas, despublicar, acompanhar | calendário de 12 meses, revisão ao lado da montagem, edição em abas |
| Opiniões dos flashcards | Estudo › Opiniões | categorias, notas, som, texto | mural com busca e composição |
| E-mails › Lembretes e resumo quinzenal | Comunicação › Campanhas | as 5 campanhas e o quinzenal, lista de quem recebe, prévia por pessoa, envio em lotes, travas contra spam | fluxo em etapas (público, prévia, revisão com nomes, resultado) |
| E-mails › Cartas pessoais | Comunicação › Cartas pessoais | 4 grupos, histórico, marcar e desmarcar, sortear, editar, prévia exata, uma por segundo, parar, relatório | caixa de saída com a carta aberta ao lado |
| E-mails › Relatório mensal, automáticos, últimos envios | Comunicação › Relatórios e envios | mês, prévia, envio, as duas chaves automáticas, últimos envios com motivo da falha | registro filtrável por tipo e falha |
| E-mails › Todas as cartas | Comunicação › Catálogo de cartas | 42 modelos, grupos, busca, sortear, ver como chega | diretório com amostra ao lado |
| Ajustes (recursos pagos, limite, pagamentos) | Configurações › Acesso e pagamentos | as três chaves e o limite, confirmação | estado atual ao lado de cada chave e "o que muda ao salvar" |
| Ajustes (aviso no topo) | Configurações › Aviso no topo do site | texto, link, cor, duração, tirar do ar | prévia exata no computador e no celular, histórico |
| Exportar dados do painel | Configurações › Exportação | 10 seções, privacidade, Markdown, JSON, CSV, copiar | página própria em três passos |

## Matriz de substituição visual

| Antes | Depois |
| --- | --- |
| Cabeçalho e rodapé do site em volta do painel | Casca própria, sem a do site |
| Abas em fileira de botões verdes | Barra lateral com áreas que abrem e fecham; no celular, faixa de partes e barra de baixo |
| Cartões verdes cheios de número | Faixas de métricas com selo de qualidade, variação e balão de definição |
| Barras verdes sem eixo | Gráficos com eixo, dica no teclado, legenda, fonte e "Ver dados" |
| Listas de cartões (assinaturas, cobranças, relatos) | Tabela ordenável que vira blocos no celular; extrato por dia; filas com detalhe |
| `window.confirm` e mensagens verdes para erro | Diálogo de confirmação com o efeito escrito; avisos rápidos (erro fica até fechar) |
| Janela central para exportar | Página em três passos |
| Formulário corrido do editor | Blocos numerados, prévia ao lado, barra de salvar |
| Cores do site (verde e ouro) | Monocromo do Painel 3.0, claro e escuro, verdete só como acento raro |

## Evidência

- `npm test`: passa inteiro, com dois testes do painel: `testar_admin_secoes.mjs` (6 áreas, 23 partes,
  endereços antigos, estado no endereço, nada pessoal no endereço) e `testar_admin_metricas.mjs`
  (contas da linguagem de dados e o dicionário `docs/admin/METRICAS.md` igual ao código).
- `npm run build`: passa; cada tela é um pedaço separado (de 12 a 45 kB).
- `node fixtures/e2e_painel_admin.mjs`: 10 verificações no navegador, entre elas as 23 partes sem erro,
  endereços antigos, Voltar, ficha, Ctrl K, confirmação que não chama a RPC ao cancelar, falha que não vira zero,
  celular sem rolagem de lado e tema escuro.
- `fixtures/capturar_painel_admin.mjs`: 184 capturas (23 partes × 320, 390, 768 e 1440 px × claro e escuro),
  sem rolagem de lado depois da correção de Cartas em 320 px.
- Os dados de exemplo dos testes (`fixtures/painel_admin_falso.mjs`) respondem tudo localmente: nenhum
  e-mail real, nenhuma cobrança, nenhuma publicação, nenhuma configuração de produção.

## O que ficou de fora de propósito

- Nenhuma mudança no banco: se uma parte nova pedir dado que o banco não tem, ela diz "indisponível".
- O e2e não entra no `npm test` (precisa de navegador); roda à mão, como antes.

## Revisão de 02/11/2026 (pedido do Tales: "ficou confuso, antes estava melhor")

- **Menu com os nomes de antes**: Agora, Pessoas, Financeiro, Conteúdo, E-mails, Ajustes. De 23 para 17 itens;
  o que era parecido virou **aba dentro da mesma tela** (`?sub=`): Crescimento (Aquisição, Retenção, Perfis e origem),
  Financeiro › Ganhos (Ganhos, Previsão) e Ajustes (Acesso e pagamentos, Aviso no topo). Os endereços antigos
  (`?aba=previsao`, `retencao`, `aviso`, `agora`, `pendencias`) abrem a aba certa.
- **Página inicial = Agora**: a primeira coisa é quem está online (sinal nos últimos 5 minutos), em dois grupos com cor
  própria: assinantes (verde) e não assinantes (cinza, com "viu os planos" quando for o caso). Logo abaixo, quantos
  assinantes não entraram hoje (e quais deles viram os planos) e os não assinantes que viram os planos nos últimos
  30 dias, com atalho para carta. Depois os números do dia, o que pede ação, a linha do dia e as listas.
- **Menos leitura no Supabase**: os contadores do menu passaram de 1 em 1 minuto para 5 em 5 minutos, e trocar de tela
  reaproveita o que foi lido nos últimos 5 minutos (antes, 15 segundos). Para ver na hora, o botão Atualizar.
- **Financeiro mais simples**: "Reconstruído" voltou a ser "Estimado"; Ganhos sem os blocos repetidos (últimas cobranças,
  ações) e com o mês a mês recolhido; selos "Confirmado" e "Derivado" só aparecem onde explicam algo.

## Revisão de 02/11/2026, noite (online organizado e mais cor)

- **Agora em três faixas numeradas**: 1. Online agora; 2. Não estão online; 3. Hoje.
- **Totais coloridos no topo**: online agora, assinantes online (de quantos assinantes), não assinantes online e
  não assinantes que viram os planos hoje.
- **Online em três grupos com cor**: assinantes (verde), não assinantes que viram os planos **hoje** (âmbar, com a
  hora) e os demais não assinantes (azul, com o que fazem, questões, idade da conta e atalho para carta).
- **Não estão online**: assinantes que não entraram hoje; não assinantes que viram os planos hoje e saíram;
  não assinantes que viram os planos nos últimos 30 dias.
- **Cor no painel inteiro** (`src/admin/cores.css`): cada área com a sua cor (Agora verde, Pessoas azul,
  Financeiro turquesa, Conteúdo violeta, E-mails laranja, Ajustes ardósia), que tinge o menu, o título, o botão
  principal, as abas e os filtros; gráficos em índigo, turquesa e âmbar; claro e escuro.
