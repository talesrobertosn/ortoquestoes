# Central de revisão — prévia de 13/11/2026

Branch: `codex/revisoes-painel`. Implementação local, sem publicação.

## Pedidos e referência

Tales pediu as 45 melhorias da crítica, mais um modo leve para quem tem pouco tempo. Depois definiu o novo
Desempenho como qualidade mínima e enviou o prompt complementar do Claude. A composição segue o Desempenho:
verde #00806f, azul-ardósia #243b47, Plus Jakarta, estufa em moldura integrada ao painel, navegação lateral fixa,
atalhos no celular, seções abertas, botões verdes/de contorno. Prefixo isolado `rvp-`; a pintura não se move no hover.

O prompt complementar sugere uma mudança só de apresentação. O pedido direto de incluir as melhorias funcionais e
o modo leve também foi mantido. As diferenças de regra abaixo estão isoladas e testadas; os intervalos de
Chute/Dúvida/Certeza e as regras de acerto, confiança e encerramento de ciclo não foram alterados.

## Contrato preservado (12 itens do prompt)

- [x] Filtro por área: seleção múltipla, chave antiga `revisao:area`, nova `revisao:areas`, entrada por `?area=coluna`.
- [x] Hoje, meta concluída, folga e nenhuma questão vencendo são estados distintos.
- [x] Mensagem contextual de carga, resgate, folga, conclusão e primeira visita.
- [x] Começar, sessão curta, adiantar um próximo dia e treinar novas; prévia antes de iniciar IDs reais.
- [x] Anel de hoje, sequência e quantidade pela frente com próximo agendamento.
- [x] Resgate com estimativa e alteração de teto via simulação antes de aplicar.
- [x] Flashcards com fila independente e opção de esconder/mostrar.
- [x] Calendário e revisão por dia/área; agora com semana/mês e feitas de hoje no resumo.
- [x] Quatro famílias de conquistas, progresso, família completa, totais e acesso a todas.
- [x] Teto e folgas abertos; mínimo de um dia útil; notas sobre distribuição e sequência.
- [x] Escadas abertas, erro elegível hoje, acesso a dúvidas/chutes e caderno de erros.
- [x] Carregamento e recuperação de erro de catálogo sem apagar progresso.

## Melhorias implementadas

1–9, clareza: números distintos para meta, atraso e agendamento; contagens de filtro explicadas; questões ausentes,
anuladas e cópias não ocupam slots; histórico original preservado. Vencimento e reserva separados; faixas de atraso;
resgate considera prova cadastrada; data de resgate declarada como estimativa; respostas e questões distintas
explicitadas; calendário mensal inclui hoje.

10–19, dados: atividade com teto atual, acerto, comparação de períodos, próximos 14 dias, retenção por intervalo,
estágios, recorrência, resultado por área e calendário de intensidade de seis meses. Evolução do estoque usa retratos
reais por dia neste aparelho. Entradas e conclusões são reconstruídas apenas em questões com histórico completo.

20–29, escolha: prévia com áreas/motivos; prova, assunto, múltiplas áreas, situação e ordenação; explicação de
prioridade, frequência do acervo; sessões de 5/10/15 minutos ou quantidade; duração adaptada após pelo menos cinco
respostas em sessões de revisão concluídas; retomada gradual de 5, 10 e 15 questões.

30–37, aprendizado: filas de erros com certeza, reincidentes e dúvidas/chutes; resultado com confiança;
reaprendizado próximo distinguido de retenção longa; recuperação ativa opcional antes de alternativas (inclui bloqueio
de atalhos de responder antes de revelar); resumos ligados aos erros; trajetória por questão; explicação das escadas;
resultado de sessão com recuperadas, avanços, ciclos completos e próximos agendamentos.

38–45, uso: semana/mês, detalhe com feitas/pendentes e acerto do dia, todas as áreas do dia, modo compacto,
pintura estática, filtros que quebram linha e ficam visíveis, ritmo junto à meta e conquistas/flashcards abaixo das
prioridades. As seções principais ficam abertas, conforme a referência mais recente, em vez das abas da primeira prévia.

## Definições e limites

- A meta usa questões distintas refeitas hoje. Gráficos de respostas podem incluir reencontros da mesma questão.
- Uma questão já revisada hoje e ainda errada vai para uma reserva futura; continua elegível para uma sessão extra
  voluntária. Isso evita que a meta cresça ou recicle o mesmo erro indefinidamente depois de concluir um passo leve.
- Mudar o filtro não recria a capacidade diária. O plano é calculado na fila geral disponível e depois recortado.
- Modo leve reserva aproximadamente cinco minutos (sete questões no ritmo inicial de 40 segundos). Pode ajustar o teto.
- Concluir a pequena meta registra um dia nesta página, neste aparelho. Conquistas existentes conservam seus critérios.
- Preferências, retomada e retratos de estoque são locais ao aparelho, como o teto anterior. Nenhuma nova tabela ou
  migração. Respostas continuam com a sincronização já existente.
- O histórico continua limitado às oito tentativas disponíveis por questão. A página explicita o limite; não promete
  recuperação do que não existe. Entradas/conclusões omitiram históricos parciais; retenção omite intervalos desconhecidos.
- A previsão ignora novos erros, respostas e futuras repetições. Dia da prova não conta como dia para resgate anterior a ela.
- A frequência é a do acervo de provas, sem probabilidade de aprovação ou alegação de memória garantida.
- O tempo inicial usa 40 segundos; depois usa a duração das sessões de revisão concluídas (limitada a 10–180 s).

## Validação

- `npx tsc --noEmit -p .` e `npm run build`.
- `npm test` completo; novo `fixtures/testar_revisoes_painel.mjs` incluído no comando e conferido separadamente.
- Orçamento de chunks validado sem ampliar limites.
- `fixtures/revisoes_roteiro.mjs`: conta e servidor falsos locais, dados artificiais. Modo leve, prévia, filtros,
  histórico, calendário, gráficos, compacto, sessão de uma questão com recuperação ativa, resposta, resultado e
  retorno sem crescimento da meta. 320/390/1440 px, claro/escuro e sem rolagem lateral.

Capturas: `/Users/talesroberto/Downloads/Previa-Revisao-OrtoQuestoes/` (dados fictícios, não publicados).
