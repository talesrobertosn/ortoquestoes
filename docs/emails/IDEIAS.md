# Cartas: brainstorm julgado (15/10/2026)

Ideias pensadas para os e-mails pessoais, com a decisão de cada uma. `[x]` feito nesta entrega,
`[ ]` vale fazer depois, ~~riscado~~ descartado (com o motivo).

## Feito

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
- [ ] **Resposta-carta ao relato**: quando o relato vira correção, a carta cita a alternativa e o
  trecho do comentário que mudou. Hoje já existe o aviso; dá para deixar mais pessoal.
- [ ] **Ver quem respondeu**: se as respostas forem para um endereço do domínio, um webhook de
  entrada do Resend poderia marcar "respondeu" no histórico. Útil para medir sem rastrear abertura.
- [ ] **Agendar o lote para 7h ou 12h** (os horários em que o residente lê, segundo as orientações
  de marketing). Hoje o envio é na hora do clique.
- [ ] **Carta de volta do simulado nacional**: depois do Simulado do mês, uma carta curta com a
  posição. Depende de o resultado sair no banco no mesmo dia.
- [ ] **Assinar com o nome do serviço** quando a pessoa contou o serviço ("um abraço para o pessoal
  do seu serviço"). Ficou de fora por causa do artigo (do/da) em nomes livres; dá para fazer com uma
  lista curada de serviços conhecidos (`servicosConhecidos.ts`).

## Descartado

- ~~Rastrear abertura e clique no Resend~~: pixel e redirecionamento empurram para Promoções e
  quebram a cara de carta; e o que importa (voltou a estudar?) o painel já vê.
- ~~Assunto com emoji ou "Última chance"~~: pedido explícito do dono e sinal forte de promoção.
- ~~Citar preço ou desconto no convite~~: preço muda, e carta com preço é anúncio.
- ~~Comparar com a média da turma ("você está acima de 70% das pessoas")~~: dado que o motor não tem
  de forma confiável para cada faixa; inventar número quebra a confiança.
- ~~Dizer há quanto tempo a pessoa está no plano gratuito~~: pedido do dono; soa como cobrança.
- ~~Mandar convite em lote para quem não aceitou novidades~~: os Termos (14.3) prometem o contrário.
- ~~Mais de duas observações pessoais na mesma carta~~: a partir da terceira, deixa de parecer
  atenção e passa a parecer vigilância.
- ~~Uma carta por dia útil automática para todos os grupos~~: o dono quer só clicar; mas mandar sem
  ninguém olhar o histórico é o caminho mais curto para virar spam. O botão continua sendo dele.
