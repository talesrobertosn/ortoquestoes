# Cartas: brainstorm julgado (15/10/2026; atualizado em 17/10/2026)

Ideias pensadas para os e-mails pessoais, com a decisão de cada uma. `[x]` feito,
`[ ]` vale fazer depois, ~~riscado~~ descartado (com o motivo). O plano da reescrita completa está
em [PLANO.md](PLANO.md).

## Feito

- [x] **Reescrita completa na voz nova** (17/10/2026, PLANO.md): amigo que já passou pela
  residência; espinha fixa (momento → o que eu vi → ideia sobre tempo → convite leve → fecho →
  P.S.); 6 a 12 linhas; 5 a 7 versões por situação e faixa, todas reescritas do zero.
- [x] **Quatro fatos novos** no motor: resumos lidos, dias para a prova (cronograma), serviço ou
  cidade, aniversário. Até três observações por carta (eram duas; o P.S. com fato conta).
- [x] **Regra dos 10**: nenhum número de questões abaixo de 10 ("os primeiros passos"); acerto só com
  30 questões e 50% ou mais; área a melhorar só com 40 questões na área e sem número.
- [x] **Teto de cadência** no motor: 48 h entre e-mails e 3 em 14 dias; transacionais fora. Os lotes
  pulam a pessoa; o site recebe "adiado".
- [x] **Marcos 250 e 2.000** (agora 100, 250, 500, 1.000, 2.000), com o que o número vale em horas.
- [x] **Automáticos na voz nova**: a pausa cita a área que a pessoa estava estudando e a Revisão; o
  Pix sem urgência ("nada se perde"); o resumo quinzenal como história; o relato resolvido citando a
  alternativa (**Resposta-carta ao relato**, que estava em "Para depois").
- [x] **Seis automáticos novos sem SQL** (ação `automatico` de `enviar-email`): boas-vindas no dia da
  confirmação, primeiras 10 questões, que bom te ver de volta, cronograma pronto, pagamento aprovado
  (recibo gentil) e obrigado pelo tempo de assinatura.
- [x] **Confirmação de cadastro e senha nova** na voz das cartas (`supabase/modelos-email/`).
- [x] **Assinar com o nome do serviço**: "do Hospital X" / "da Santa Casa" quando o artigo é claro;
  "do seu serviço" quando o nome é livre (`servicoComArtigo`), sem precisar de lista curada.

- [x] **Uma voz por faixa de acerto** (9 faixas): quem acerta 8% recebe acolhimento e uma dica de
  presente ("todo mundo que passou começou assim"), quem está na média ouve que é a fase em que mais
  dá para crescer, quem acerta 93% recebe um pedido ("como você estuda?"). Abaixo de 50%, nunca cita
  a porcentagem. Tom revisto em 15/10/2026 a pedido do dono: ver [TOM.md](TOM.md).
- [x] **Observação que prova que alguém olhou**: melhor área, área mais estudada (com um comentário
  sobre a área, como "mão é uma área bem da hora"), horário de estudo, prova, etapa, ranking,
  sequência, flashcards. Só com dado significativo, no máximo duas por carta, para não parecer vigilância.
- [x] **Sorteio sem repetir**: o histórico guarda a versão enviada; a próxima carta da mesma
  situação sai de outra versão.
- [x] **Carta que pergunta** em vez de afirmar (faixas baixas, opinião, começou e parou): perguntas
  geram resposta, e resposta melhora a entregabilidade e traz informação de verdade.
- [x] **Convite ligado ao momento da pessoa**: TEOT perto → cronograma; área fraca → temas que mais
  caem e a turma; usa flashcards e o limite está ligado → sem limite. Sempre com a garantia de 7 dias.
- [x] **Convite para quem olhou os planos** (versão própria): "se ficou alguma dúvida, me responde".
- [x] **Aviso de excesso** ao lado de cada pessoa (2 e-mails em 7 dias: amarelo; 3 ou mais: vermelho).
- [x] **Automáticos em forma de carta**, com o relatório sem "0 questões" e o lembrete que muda de
  situação se a pessoa mudou desde que a lista foi montada.
- [x] **"Ela pediu para parar"** na ficha: resposta "parar" vira um clique.

## Para depois

- [ ] **Carta de aniversário de conta** (1 ano de Orto Questões): curta, sem convite. Precisa de um
  agendador diário; baixo risco, alto carinho.
- [ ] **Ver quem respondeu**: se as respostas forem para um endereço do domínio, um webhook de
  entrada do Resend poderia marcar "respondeu" no histórico. Útil para medir sem rastrear abertura.
- [ ] **Agendar o lote para 7h ou 12h** (os horários em que o residente lê, segundo as orientações
  de marketing). Hoje o envio é na hora do clique.
- [ ] **Carta de volta do simulado nacional**: depois do Simulado do mês, uma carta curta com a
  posição. Depende de o resultado sair no banco no mesmo dia.
- [ ] **Parte 31 (SQL)**: as RPCs ainda não devolvem cidade, nascimento, resumos lidos, data da prova
  do cronograma e último login; os nove e-mails novos com SQL (seção 4 do PLANO); um índice único
  por pessoa e referência para as cartas automáticas; e `emails_48h` passando a ignorar os
  transacionais novos.
- [ ] **Ligar o site e o webhook** aos seis automáticos (onde chamar cada um está no relatório da
  entrega de 17/10/2026 e no cabeçalho de `supabase/functions/enviar-email/index.ts`).
- [ ] **Página "Todas as cartas"** no painel, com amostra viva de cada tipo e "sortear outra versão".

## Descartado

- ~~Rastrear abertura e clique no Resend~~: pixel e redirecionamento empurram para Promoções e
  quebram a cara de carta; e o que importa (voltou a estudar?) o painel já vê.
- ~~Assunto com emoji ou "Última chance"~~: pedido explícito do dono e sinal forte de promoção.
- ~~Citar preço ou desconto no convite~~: preço muda, e carta com preço é anúncio.
- ~~Comparar com a média da turma ("você está acima de 70% das pessoas")~~: dado que o motor não tem
  de forma confiável para cada faixa; inventar número quebra a confiança.
- ~~Dizer há quanto tempo a pessoa está no plano gratuito~~: pedido do dono; soa como cobrança.
- ~~Mandar convite em lote para quem não aceitou novidades~~: os Termos (14.3) prometem o contrário.
- ~~Mais de três observações pessoais na mesma carta~~: a partir da quarta, deixa de parecer
  atenção e passa a parecer vigilância (eram duas até 17/10/2026; o PLANO subiu para três).
- ~~Uma carta por dia útil automática para todos os grupos~~: o dono quer só clicar; mas mandar sem
  ninguém olhar o histórico é o caminho mais curto para virar spam. O botão continua sendo dele.
