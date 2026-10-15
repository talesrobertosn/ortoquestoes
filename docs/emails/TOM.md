# Tom das cartas

Pedido do Tales em 15/10/2026, depois de ler as primeiras cartas: "estão muito grosseiras e nada
amigáveis". Base: *Como Fazer Amigos e Influenciar Pessoas* (Carnegie) e só os princípios éticos de
*As 48 Leis do Poder* (dar antes de pedir, dizer menos que o necessário, convidar em vez de empurrar).
Vale para todas as versões (`supabase/functions/_shared/cartas-versoes.ts`), para os blocos do motor
(`cartas.ts`) e para os automáticos (`modelo-email.ts`).

## A voz

Um colega mais velho, gentil e presente, que se importa. Frases curtas, português natural, primeira
pessoa, sem gênero presumido, sem clichê de marketing. Abertura calorosa ("Oi, Ana, tudo bem?"),
fecho afetuoso e a assinatura fixa "Um abraço, / Tales, do Orto Questões".

## O que fazer

- **Interesse pela pessoa**: o nome com naturalidade; falar do que importa para ela (a prova, a
  residência, o plantão, o sonho de passar), não do site.
- **Elogio honesto e específico** a cada progresso, e uma boa reputação para honrar ("dá para ver
  que você é de quem não desiste").
- **Fazer a pessoa se sentir importante**: "lembrei de você", "fiquei feliz de ver".
- **Perguntar e sugerir** em vez de mandar: "que tal...", "se fizer sentido para você...".
- **Dar antes de pedir**: no convite para assinar, primeiro uma dica útil; depois o benefício ligado
  ao objetivo dela; a porta aberta, sem pressão ("se não for a hora, tudo bem").
- **Por faixa**: alta, celebração e convite a opinar; média, encorajamento; baixa, acolhimento,
  esperança ("todo mundo que passou começou assim") e uma dica pequena oferecida como presente.

## O que nunca fazer

- Expor número ruim: **abaixo de 50% de acerto, nenhuma porcentagem** (nem geral, nem de área; o
  motor dá `c.pctBom`, que é null abaixo de 50%). O tema a melhorar nunca leva número.
- Criticar, condenar, reclamar, culpar, cobrar; insinuar como a pessoa responde ("chute",
  "marcar qualquer uma"); dizer que "errou muito".
- "Vou ser direto", "vou ser sincero", "sem rodeios", "franco", "olha só", "infelizmente",
  "você não...", "só que", sarcasmo, ironia, comparações que diminuem.
- Urgência ou escassez falsas, preço, "grátis", "oferta", "desconto", "aproveite".

O teste `fixtures/testar_modelos_email.mjs` confere a lista proibida em milhares de sorteios de
todas as situações e faixas, e que nenhuma carta abaixo de 50% cita porcentagem.
