# Simulado Nacional e Resumão: otimização de 15/10/2026

Pedido do dono: "Otimizar o sistema do Simulado Nacional. Otimizar o sistema do Resumão,
adicionar mais coisas se necessário. Sempre com design bonito e experiência de usuário fluida."

Escopo respeitado: nenhuma questão, gabarito, comentário, preço, limite ou dado de usuário foi
alterado. **Sem SQL novo**: tudo usa as RPCs já existentes
(`obter_simulado_nacional`, `iniciar_simulado_nacional`, `entregar_simulado_nacional`,
`resultado_simulado_nacional`, `gabarito_simulado_nacional`).

## Como era (diagnóstico)

**Simulado Nacional** (`#/simulado-nacional` → `#/sessao` → `#/resumo` → volta):
topo com o botão, "Como funciona" em quatro itens soltos, composição por tema, resultado
(nota, posição, percentil, prontidão, top 10) e uma correção que só aparecia depois de tocar em
"Ver o gabarito", como uma grade de números sem tema.

Atritos e bugs encontrados:

1. **Edição ainda por abrir aparecia como "Esta edição encerrou"** e o prazo dizia
   "encerra em N dias" (o código só olhava `aberto`).
2. **Risco de perder a prova**: prova concluída neste aparelho com a entrega falhando (rede) e
   ainda dentro do tempo mostrava "Continuar a prova"; tocar nele criava uma sessão nova e
   apagava as marcações guardadas. A falha da entrega automática era engolida em silêncio
   ("Entregando…" para sempre, sem como tentar de novo).
3. Começar a prova era um toque só: o cronômetro do servidor ligava sem confirmação.
4. Prazo e tempo restante eram calculados uma vez (página aberta por horas ficava parada).
5. "Encerra em 2 dias" com a data a 2 dias e 23 horas (arredondamento para baixo).
6. Título "2026-10" quando a edição não tinha título próprio; "2 h 00 min" em vez de "2 h".
7. Sem histórico: as edições anteriores eram só links; não dava para ver a evolução.
8. Resultado sem caminho de ação: as erradas não eram agrupadas nem dava para refazê-las.
9. Erro de carregamento sem botão de tentar de novo.

**Resumão** (`#/resumao`): 600 frases em 11 sanfonas; sem busca, sem filtro, sem link de
treino, todas as frases renderizadas de uma vez (inclusive as das áreas fechadas), índice
quebrando em várias linhas no celular, erro sem "tentar de novo".

## Brainstorm (curto)

| Ideia | Valor | Custo | Decisão |
|---|---|---|---|
| Corrigir edição "em breve" e prazo vivo | alto (bug) | baixo | feito |
| Não deixar "Continuar" apagar prova não entregue; entrega com "tentar de novo" | alto (bug, perda de dados) | baixo | feito |
| Confirmação antes de ligar o cronômetro | alto | baixo | feito |
| Tempo restante no topo quando a prova está em andamento | médio | baixo | feito |
| "Como funciona" em passos numerados (tempo, aparelho, mapa, resultado) | médio | baixo | feito |
| Histórico pessoal com nota e variação por edição | alto | médio (sem SQL: 1 RPC por edição, em paralelo) | feito |
| Correção carregada junto com o resultado, com tema e filtro (todas/erradas/certas) | alto | baixo | feito |
| "O que rever agora": erradas e em branco por tema, refazer todas ou por tema, treinar o tema | alto | baixo | feito |
| Contagem certas/erradas/em branco e "você +N" sobre a média | médio | baixo | feito |
| Top 10 em duas colunas, 5 visíveis e "Ver os 10" | médio | baixo | feito |
| Percentil por tema / ranking histórico | médio | precisa de SQL | adiado |
| Retomar a prova em outro aparelho (respostas no servidor) | alto | SQL + mudança de sessão | adiado (registrado abaixo) |
| Resumão: busca sem acento, com destaque | alto | baixo | feito |
| Resumão: só prioridade máxima | médio | baixo | feito |
| Resumão: links "Treinar" por assunto e por área, flashcards | alto | baixo | feito |
| Resumão: origem da frase (prova e ano) e nº de questões do assunto | médio | baixo (dados já no acervo) | feito, no gerador |
| Resumão: "Li esta área, próxima" + "Continuar: área" + barra de progresso | alto | baixo | feito |
| Resumão: tamanho de letra, abrir/fechar todas, tempo de leitura por área | médio | baixo | feito |
| Resumão: só renderizar a área aberta | médio (desempenho no celular) | baixo | feito |
| Flashcards do tema com link direto | médio | a central não aceita tema na URL | link geral; fica para o projeto de flashcards |

## O que foi feito

### Simulado Nacional (`src/paginas/SimuladoNacional.tsx`, `src/dados/simuladoNacional.ts`)

- `situacaoEdicao()` decide em um só lugar: em breve, aberta, em andamento, tempo esgotado,
  entregue, encerrada. O topo mostra a ação certa para cada uma ("Abre em 18 de outubro",
  "Continuar a prova · faltam 1 h 30 min", "Ir para a edição atual" numa edição antiga).
- `prazoEdicao()`: "abre em"/"encerra em", dias arredondados, horas e minutos no fim; relógio
  da página a cada 20 s.
- Prova concluída neste aparelho e não entregue: o topo mostra "Entregando…" e, se falhar,
  "Tentar entregar de novo" (as respostas continuam no aparelho). "Continuar a prova" não
  aparece nesse caso, então a sessão guardada não é mais substituída.
- Confirmação antes de começar ("São 50 questões em 2 h. O cronômetro começa agora…").
- "Como funciona" em quatro passos numerados e uma nota com as regras do ranking.
- "Seu histórico": nota de cada edição entregue, barra, variação sobre a anterior, melhor nota.
- Resultado: contagem certas/erradas/em branco, comparação com a média, "O que rever agora"
  (refazer as N erradas numa sessão comum com gabarito e comentário, refazer por tema, treinar
  o tema; links para caderno de erros, revisão, flashcards e Resumão), correção já carregada
  com o tema de cada questão e filtro, top 10 compacto.

### Resumão (`src/paginas/Resumao.tsx`, `src/dados/resumao.ts`, `scripts/gerar_resumao.py`)

- Busca (sem acento, todos os termos, no texto, no assunto e na área) com destaque `<mark>`
  e contagem "2 de 604 frases com 'Bado'". Quem não assina busca só na área de amostra.
- Filtro "Só prioridade máxima"; "Abrir todas/Fechar todas"; letra A−/A+ (quatro tamanhos,
  lembrados no aparelho).
- Progresso no topo com barra e "Continuar: Ortopedia pediátrica"; "Li esta área, próxima"
  fecha a lida e abre a seguinte; "Resumão lido inteiro" no fim leva ao Simulado Nacional.
- Cada assunto: prioridade, nº de questões de prova no acervo e "Treinar" (subtema);
  cada frase: origem ("TEOT 2025", "OrtoQuestões Simulados") e "ver questão";
  cada área: "Treinar a área" e "Flashcards", tempo estimado de leitura.
- Índice das áreas desliza na horizontal no celular; só a área aberta é renderizada.
- O gerador agora grava `n` por assunto e `origem` por frase (dados já existentes no acervo
  e em `src/dados/incidencia.json`); nenhuma frase foi reescrita. O arquivo foi regenerado
  pelo mesmo script que roda em cada publicação.
- Integração com o cronograma mantida: `#/resumao?tema=…` abre e rola até a área, e um minuto
  de leitura com a aba à vista marca a área como lida hoje.

## Testes

- `fixtures/testar_simulado_resumao.mjs` (no `npm test`): situação e prazo da edição, correção
  por tema, histórico, busca, próxima área e todos os assuntos do resumão existirem como
  subtema do acervo (o link "Treinar" funciona).
- Playwright em 1400×860, 390×844 e 844×390 com as RPCs simuladas (visitante, aberta, em breve,
  em andamento, resultado, sessão começada, resumão, busca, leitura).

## Para depois

- Respostas da prova salvas no servidor durante a prova (retomar em outro aparelho e não
  depender do aparelho para entregar). Precisa de SQL e de mexer na sessão.
- Desempenho por tema comparado a edições anteriores (precisa do `por_tema` das anteriores:
  hoje `resultado_simulado_nacional` traz só da edição pedida).
- Link direto para flashcards de um tema quando a central aceitar `?tema=`.
