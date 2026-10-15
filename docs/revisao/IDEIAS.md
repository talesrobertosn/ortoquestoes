# Revisão: brainstorm e o que foi feito (15/10/2026)

Pedido do Tales: a página `#/revisao` era antiga; muita gente deixa a revisão para depois ou não faz
porque é chata. Deixar atrativa, incentivar, mais conquistas para quem revisa, calendário mais bonito.
O algoritmo de intervalos das questões (`src/estado/revisao.ts`) **não mudou**.

## Por que a pessoa não revisa (hipóteses)

1. Não sabe quanto vai custar: "40 questões" parece uma tarde inteira.
2. Muro de atrasadas: depois de uns dias fora, a fila assusta e ela desiste.
3. Não vê progresso nem recompensa: revisar não dá ponto no ranking nem emblema.
4. Muitas decisões antes de começar (10? todas? qual dia?).
5. Calendário sem informação útil sobre o passado e sem previsão clara da semana.

## Ideias (✅ feito · ◻️ fica para depois)

**Começar fácil**
- ✅ Resumo do dia em uma linha: "12 para hoje · ~8 min" (40 s por revisão, `metasRevisao.ts`).
- ✅ Um botão grande "Começar revisão"; sessão curta de 5 minutos como opção secundária.
- ✅ Anel de progresso do dia (feitas / feitas + que faltam).
- ◻️ Lembrete por notificação no horário escolhido (depende de permissão do navegador).

**Recompensa e hábito**
- ✅ Sequência de dias revisando (10 revisões no dia ou fila zerada; folgas do ritmo não quebram).
- ✅ Tela de "Dia zerado" com a sequência, a próxima conquista de revisão e a opção de adiantar amanhã.
- ✅ Emblemas novos: Revisões feitas, Constância na revisão, Resgate de atrasadas e a secreta Muralha derrubada.
- ✅ Faixa "Conquistas de revisão" na página, com o progresso até o próximo emblema de cada família.
- ◻️ Revisão contar pontos numa liga semanal própria.

**Atrasadas sem muro**
- ✅ Plano de resgate: quando há atrasadas, a página mostra em quantos dias o teto do ritmo as dilui e
  deixa trocar o teto ali mesmo (o excedente já era distribuído; agora a pessoa vê e escolhe).
- ✅ Revisar uma atrasada há 3+ dias conta para o emblema Resgate (recupera em vez de punir).
- ◻️ "Modo férias": pausar a revisão por N dias sem acumular.

**Calendário**
- ✅ Próximos 7 dias em barras (previsão da semana), com hoje destacado.
- ✅ Mês em mapa de calor: dias futuros pela carga prevista, dias passados pelas revisões feitas.
- ✅ Legenda clara e detalhe do dia escolhido com os temas.

**Flashcards**
- ✅ Bloco "Flashcards de hoje" separado (a fila deles é outra), com opção de esconder.

## Onde está

- Página: `src/paginas/Revisao.tsx`, estilos em `src/estilos/paginas/Revisao.css`.
- Contas (revisões por dia, resgates, sequência): `src/estado/metasRevisao.ts`.
- Emblemas: `src/estado/conquistas.ts` (famílias `revisoes`, `constancia`, `resgate`, secreta `secreta-muralha`).
