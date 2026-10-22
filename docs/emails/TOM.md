# Tom das cartas

Pedido do Tales em 15/10/2026, depois de ler as primeiras cartas: "estão muito grosseiras e nada
amigáveis". Base: *Como Fazer Amigos e Influenciar Pessoas* (Carnegie) e só os princípios éticos de
*As 48 Leis do Poder* (dar antes de pedir, dizer menos que o necessário, convidar em vez de empurrar).
Em 17/10/2026 ele pediu a reescrita completa ([PLANO.md](PLANO.md)): "mais pessoal, mais fofo e mais
gentil, falar sobre tempo, praticidade, sobre estudar fácil; um pouquinho maiores; como amigo".
Vale para todas as versões (`supabase/functions/_shared/cartas-versoes.ts`), para os blocos do motor
(`cartas.ts`) e para os automáticos (`modelo-email.ts`).

## Atualização de 22/10/2026 (Tales: "os e-mails estão cringe")

Tom **fofo e gentil**, nada de se achar. Fora de todas as cartas: falar de si ou de por que o site existe ("fiz o
site", "a parte que eu mais caprichei", "projeto independente", "quem cuida do site"), intimidade forçada ou que
soa como vigilância ("parei no seu nome", "olhando quem estuda", "respondo pessoalmente", "sou eu que leio"),
conselho de cima para baixo ("o que eu faria no seu lugar", "se eu pudesse te dar um conselho") e frase de coach
("você é de quem não desiste"). No lugar: alegria e carinho com a pessoa ("que alegria ver", "lembrei de você com
carinho", "vou gostar de saber") e sugestões leves ("uma ideia carinhosa", "se fizer sentido"). As boas-vindas têm
uma versão só: o que o site tem (questões, Cronograma, resumos) e o pedido para contar aos colegas, porque o
projeto cresce no boca a boca. O e-mail de pagamento aprovado é um obrigado pela assinatura. O teste
`fixtures/testar_modelos_email.mjs` barra esses padrões.

## A voz

Um amigo que entende a rotina de quem estuda: o plantão, o cansaço e a falta de tempo, e
escreve a partir disso. Regra do Tales (19/10/2026): nenhuma carta diz a profissão ou a etapa
dele (nada de "sou ortopedista", "quando eu estudava para o TEOT", "na residência eu aprendi");
sobre ele, só o nome. Frases curtas, português natural, primeira pessoa, sem gênero presumido,
sem clichê de marketing. Toda carta abre com uma frase sobre o momento da pessoa (a prova que vem,
o R2, o plantão quando o horário mostra madrugada, o tema que estava estudando) antes de qualquer
número. Fecho afetuoso e a assinatura fixa "Um abraço, / Tales, do Orto Questões", seguida do P.S.

## A espinha (toda carta)

1. Abertura com o momento da pessoa.
2. O que eu vi no estudo dela: até **três** observações pessoais, só com dado que existe.
3. Uma ideia prática sobre tempo, praticidade ou estudar fácil ("dez minutos no intervalo já
   contam", "a lista do dia já está pronta quando você sai da cirurgia").
4. Um convite leve, quando couber; um link no máximo, sempre para o que a carta sugere fazer.
5. Fecho afetuoso.
6. **P.S. em toda carta**, a linha mais humana (o motor põe um se a versão não escrever o seu).

De 6 a 9 linhas em parágrafos curtos; nunca mais de 12. Assunto com o nome e algo da pessoa, até 55
caracteres, sem emoji e sem ponto de exclamação.

## O que fazer

- **Interesse pela pessoa**: o nome com naturalidade; falar do que importa para ela (a prova, a
  residência, o plantão, o sonho de passar), não do site.
- **Elogio honesto e específico** a cada progresso, e uma boa reputação para honrar ("isso é de quem
  senta e faz, mesmo com sono").
- **Fazer a pessoa se sentir importante**: "lembrei de você", "fiquei feliz de ver".
- **Perguntar e sugerir** em vez de mandar: "que tal...", "se fizer sentido para você...".
- **Dar antes de pedir**: no convite para assinar, primeiro uma dica útil; depois o que o plano faz
  pela rotina (horas devolvidas, não lista de recursos), a garantia de 7 dias, a porta aberta
  ("se não for a hora, tudo bem também. Eu continuo por aqui").
- **Tempo e praticidade** em toda carta: o benefício de tudo é o tempo que volta.
- **Por faixa**: alta, celebração e pedido de ajuda ("como você estuda?", indicar); média,
  encorajamento ("a fase em que mais dá para crescer"); baixa, acolhimento, esperança ("todo mundo
  que passou começou assim") e uma ideia de dez minutos oferecida como presente.
- **Automáticos com cara de carta**: a pausa cita a área em que a pessoa estava e a Revisão; o Pix
  diz que nada se perde, sem urgência; o resumo quinzenal conta uma história; o relato resolvido
  cita a alternativa; o recibo é gentil e nunca traz o valor.

## Regras de número

- **Regra dos 10**: nenhum número de questões abaixo de 10 em texto nenhum. Abaixo disso, "os
  primeiros passos" (`Ctx.q`, `Ctx.dez`, `questoes()`). Números pequenos sempre por extenso ("cinco
  questões", "dez minutos").
- **Acerto** só com 30 questões e **50% ou mais** (`Ctx.pctBom`); abaixo disso nenhuma porcentagem,
  nem geral, nem de área. Nunca na mesma carta em que a área a melhorar é citada.
- **Área a melhorar** só com 40 questões na área, como oportunidade, com a sugestão de dez questões
  por semana, nunca com número.
- **Observações pessoais**: no máximo três por carta (o P.S. com fato conta). A partir da quarta,
  deixa de parecer atenção e passa a parecer vigilância.
- **Marcos** comemorados: 100, 250, 500, 1.000 e 2.000, com o que o número significa em horas.
- **Nunca inventar** prova, dado ou número que o perfil não tenha: cada fato só entra quando o dado
  existe e é significativo (`fatosDe`).

## Cadência

Um e-mail a cada 48 horas e no máximo 3 a cada 14 dias por pessoa (`cadenciaBloqueia`). Os
transacionais ficam fora da conta e nunca são barrados: Pix termina hoje, pagamento aprovado,
obrigado pelo tempo de assinatura, relato resolvido, confirmação e senha nova. `escolherTipo`
devolve o motivo em `bloqueio`; `gerarCarta` recusa com `cadencia_bloqueada: ...` (a prévia do
painel passa `ignorarCadencia`); os lotes pulam a pessoa e ela volta no próximo lote; o site recebe
"adiado" e tenta de novo depois.

## Quem desligou não recebe

Nenhum e-mail sai para quem desligou a categoria dele em Minha conta › E-mails e mensagens (ou pelo
link do rodapé), e com os quatro desligados nada sai. A preferência é lida na hora de cada envio
(`podeReceber`, regra em `supabase/functions/_shared/preferencias.ts`): parabéns e marcos seguem
"conquistas"; resumos e relatório, "relatorio_mensal"; lembretes e Pix, "lembretes"; cartas da ficha,
lote, automáticos (inclusive o recibo e o obrigado pelo tempo) e relato resolvido, "cartas". Ficam de
fora só a confirmação de cadastro e a senha nova, que a pessoa pede na hora. Teste:
`fixtures/testar_descadastro_email.mjs`.

## O que nunca fazer

- Expor número ruim: **abaixo de 50% de acerto, nenhuma porcentagem**. O tema a melhorar nunca leva número.
- Citar menos de 10 questões ("você fez 3 questões").
- Criticar, condenar, reclamar, culpar, cobrar; insinuar como a pessoa responde ("chute",
  "marcar qualquer uma"); dizer que "errou muito"; "sumiu"; "culpa"; "cobrança".
- "Vou ser direto", "vou ser sincero", "sem rodeios", "franco", "olha só", "infelizmente",
  "você não...", "só que", sarcasmo, ironia, comparações que diminuem.
- Urgência ou escassez falsas, preço, "grátis", "oferta", "desconto", "aproveite", emoji.
- Gênero presumido: "bem-vindo", "obrigado por ter assinado", "cansado", "preparado" (use
  "que bom ter você", "mesmo com sono", "com a cabeça descansada").
- Mais de um link, mais de um P.S., mais de três observações, assunto com mais de 55 caracteres.

O teste `fixtures/testar_modelos_email.mjs` confere tudo isso em milhares de sorteios de todas as
situações, faixas e fatos, inclusive os seis automáticos novos e as nove campanhas diárias da parte 31
(aniversário curto, sem convite e sem link; nota do simulado só quando é motivo de orgulho), e o teto de cadência.
