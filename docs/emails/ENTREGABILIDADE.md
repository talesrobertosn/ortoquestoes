# E-mails do Orto Questões: entregabilidade e como funciona

Pedido do Tales (15/10/2026): e-mail com cara de e-mail de amigo, para cair na caixa
**Principal** do Gmail e não em Promoções. Só texto, sem logo, sempre assinado:

```text
Um abraço,
Tales, do Orto Questões
```

Este documento explica as regras de formato, o que foi decidido sobre descadastro, o
rastreamento do Resend, como o painel escolhe e envia as cartas e como publicar.

## 1. Formato de toda carta

Vale para as cartas do painel e para os automáticos (parabéns por emblema, lembretes,
renovação do Pix, resumo quinzenal, relatório do mês e aviso de relato resolvido).

| Regra | Por quê |
|---|---|
| Sem logo, sem imagem, sem cabeçalho ou rodapé de marca | O Gmail classifica pela "cara" do e-mail; imagem e moldura de marca puxam para Promoções. |
| Sem botão colorido, sem tabela de layout | Botão é o sinal mais claro de campanha. Um link em texto parece carta. |
| HTML mínimo (parágrafos) com parte `text/plain` equivalente | A parte de texto existe e diz o mesmo que o HTML: filtros desconfiam de e-mail só HTML ou com texto diferente. |
| No máximo um link no corpo, com o endereço visível (`ortoquestoes.com.br/#/revisao`) | Vários links e texto de link diferente do destino são sinais de propaganda e de phishing. |
| Assunto curto e pessoal, sem emoji, sem CAIXA ALTA, sem "grátis", "oferta", "desconto", "aproveite", "imperdível", "promoção", "urgente" | Essas palavras e formatos pesam na classificação. O motor recusa assunto assim (`problemaNoAssunto`). |
| Assinatura fixa, sempre a mesma | Coerência de remetente e o pedido do dono. A assinatura entra sozinha; se alguém colar outra no texto, ela é trocada pela fixa. |
| Nenhum preço | Preço é conteúdo comercial explícito e muda; quem quiser vê na página de planos. |
| Sem pré-cabeçalho escondido | Texto invisível é um truque de campanha; o Gmail já mostra a primeira linha da carta. |

Tudo isso está em um lugar só: `renderizarCarta` em
`supabase/functions/_shared/cartas.ts`. O painel usa a mesma função para a prévia, então
**o que aparece na prévia é exatamente o que sai**.

## 2. Descadastro e List-Unsubscribe: o trade-off

| Envio | List-Unsubscribe | Linha de descadastro no fim |
|---|---|---|
| Carta da ficha (uma pessoa, enviada por você) | não | não |
| Cartas em lote (Pessoas › Cartas) | sim | sim, discreta, em texto: "Se preferir não receber mais estas mensagens, é só clicar aqui." |
| Automáticos (emblema, lembretes, Pix, resumos) | sim | sim, do mesmo jeito |

**O trade-off.** O cabeçalho `List-Unsubscribe` faz o Gmail mostrar "Cancelar inscrição" ao
lado do remetente e é lido como sinal de envio em massa: ajuda a reputação do domínio (quem
não quer sai sem marcar como spam, e para envio em volume é exigência do Gmail e do Yahoo),
mas deixa o e-mail com cara de lista. Por isso:

- a carta da ficha é correspondência pessoal de uma pessoa para outra: vai **sem** o cabeçalho
  e sem rodapé, com mais chance de ficar na Principal. Ela continua respeitando quem desligou os
  e-mails;
- o lote e os automáticos são, por definição, envio em massa. Esconder isso é pior: se o Gmail
  perceber volume sem descadastro fácil, a reputação cai e **todos** os e-mails do domínio
  (inclusive confirmação de cadastro) sofrem. Eles levam o cabeçalho e uma linha discreta.

O cabeçalho leva o link assinado e, se o segredo `EMAIL_RESPONDER_PARA` existir, também um
`mailto:` com o assunto "parar". Quem responder "parar" a qualquer carta: abra a ficha da pessoa,
parte **Carta e ações**, e clique em "Ela pediu para parar" (desliga as cartas dela).

O link de descadastro das cartas tem o tipo `cartas`. A página `#/emails` confirma e a pessoa
pode religar em Minha conta ("Receber, de vez em quando, uma mensagem pessoal do Tales").

## 3. Rastreamento de abertura e de clique no Resend: deixar desligado

O Resend tem **Open tracking** (um pixel invisível em cada e-mail) e **Click tracking** (troca
cada link por um endereço de redirecionamento do Resend). Os dois ficam por domínio, em
**Resend › Domains › ortoquestoes.com.br › Configuration**, e vêm desligados; o código do site
não liga nenhum dos dois (não manda `open_tracking` nem `click_tracking`).

Recomendação: **manter os dois desligados.**

- O pixel de abertura é uma imagem: carta com imagem escondida deixa de ser "só texto".
- O rastreamento de clique troca `ortoquestoes.com.br/#/revisao` por um domínio de
  redirecionamento: o texto visível passa a não bater com o destino, sinal clássico de phishing.
- Os números de abertura já não são confiáveis (Apple Mail abre tudo sozinho) e o painel não
  precisa deles: o que importa é se a pessoa voltou a estudar, e isso o painel já mostra.

Para conferir: no Resend, abra o domínio e veja se "Open tracking" e "Click tracking" estão
desligados. Se estiverem ligados, desligue.

## 4. Outras práticas que contam

- **Remetente com nome de pessoa.** O segredo `EMAIL_REMETENTE` pode ser
  `Tales, do Orto Questões <tales@ortoquestoes.com.br>` (ou o endereço que já existe). Nome de
  pessoa no "De" ajuda a parecer carta. Mudar só o nome não exige nova verificação do domínio.
- **Responder para um endereço real.** `EMAIL_RESPONDER_PARA` com o seu Gmail: as cartas pedem
  resposta, e respostas melhoram a reputação.
- **SPF, DKIM e DMARC** do domínio: já verificados no Resend (docs/supabase-email-confirmacao.md).
- **Ritmo.** O lote manda uma carta por segundo (o plano gratuito do Resend aceita 2 por segundo),
  com pausa maior se o Resend responder 429.
- **Pouco e relevante.** Nenhuma carta em lote vai para quem recebeu qualquer e-mail nas últimas
  48 horas, nem o mesmo tipo de carta em menos de 30 dias. O painel mostra, ao lado de cada
  pessoa, o último e-mail e quantos ela recebeu na semana e no mês (aviso amarelo com 2 em 7 dias,
  vermelho com 3 ou mais).

## 5. Quem recebe o quê

| Situação | Quem | Onde |
|---|---|---|
| Convite para assinar | Não assina e tem mais de 20 questões (texto curto) ou mais de 50 (texto mais pessoal) | Pessoas › Cartas, ou a ficha |
| Criou e não começou | Conta confirmada há 1 dia ou mais, nenhuma questão | Pessoas › Cartas, a ficha, ou o lembrete "Primeira missão" |
| Sumiu | Respondia e está de 10 a 90 dias sem responder | Pessoas › Cartas, a ficha, ou o lembrete "Retomar" |
| Estudando, uma voz por faixa de acerto | 0–10, 10–20, 20–30, 30–40, 40–60 (na média), 60–70, 70–80, 80–90, 90–100% | a ficha |
| Obrigado pela assinatura, boas-vindas, começou e parou, reta final, marco, opinião, indicar, cronograma | pela situação | a ficha |

**Convites e o aceite de novidades.** Os Termos (item 14.3) dizem que comunicação sobre
novidades só vai para quem optou por ela ("Quero receber novidades sobre o Orto Questões").
Por isso o convite **em lote** só vai para quem marcou essa opção; as demais pessoas aparecem
em "Fora deste envio" com o motivo. Pela ficha dá para escrever a qualquer pessoa, e o painel
avisa quando a carta é um convite para alguém sem esse aceite.

Ficam sempre fora do lote: administradores, contas de teste (as do Tales e da Valéria, pelo
mesmo critério do financeiro), quem não confirmou o e-mail e quem desligou os e-mails.

## 6. Como o motor escolhe e escreve

`supabase/functions/_shared/cartas.ts` (motor) e `cartas-versoes.ts` (os textos):

1. `escolherTipo(perfil, histórico)` decide a situação, nesta ordem: nunca começou; assinante sem
   agradecimento; sumiu (10 dias ou mais); começou e parou (menos de 30 questões e 3 dias parado);
   boas-vindas (até 3 dias de conta); marco de 100, 500 ou 1.000 ainda não comemorado; reta final
   (TEOT a 60 dias ou menos, sem reta final em 30 dias); convite (não assina, mais de 20 ou 50
   questões, sem convite em 30 dias); começando (menos de 30); e, por fim, a carta da faixa de acerto.
2. `gerarCarta` sorteia uma versão que a pessoa ainda não recebeu (são 5 a 7 por situação e
   faixa) e preenche os blocos trocáveis: saudação, observações pessoais, dica, fecho e P.S.
   Isso dá centenas de textos diferentes por faixa (a contagem está em `docs/emails/MODELOS.md`).
3. Observações pessoais só aparecem quando o dado existe e é significativo: melhor área
   (15+ questões e 70%+), área mais estudada (25+ e 35% do total), área a melhorar, horário de
   estudo (40+ tentativas em 60 dias), prova de interesse, etapa, posição no ranking (top 100,
   50+ questões), sequência (3+ dias), flashcards (20+). O acerto só é citado com 30 questões ou
   mais. Nada de "0 questões", "undefined", "null" ou "NaN": o motor confere o texto final e
   troca de versão se algo escapar.
4. O convite cita só benefícios reais da página de planos (cronograma, Simulado Nacional, temas que
   mais caem e a turma, Resumão, liga e relatório do mês, e "sem limite diário" só quando o limite
   do gratuito está ligado), a garantia de 7 dias e nenhum preço.

## 7. Publicar

### SQL (parte 27)

Cole `supabase/colar-no-painel/sql-202610152100-parte27.sql` no SQL Editor do Supabase e rode.
Pode rodar mais de uma vez. Antes dele o site continua funcionando: a ficha escreve a carta com o
que já tem e avisa; a seção Cartas mostra quantas pessoas entrariam em cada grupo, mas deixa o
envio em lote desligado.

### Edge Function `enviar-email`

Pelo painel (sem terminal):

1. No repositório, `npm run funcoes:colar` (o arquivo já está gerado em
   `supabase/colar-no-painel/enviar-email.ts`).
2. Supabase › Edge Functions › `enviar-email` › Code: apague o conteúdo, cole o arquivo inteiro e
   clique em **Deploy**.

Pelo terminal, com a CLI do Supabase: `supabase functions deploy enviar-email`.

Os segredos não mudam (RESEND_API_KEY, EMAIL_REMETENTE, EMAIL_SEGREDO e, opcional,
EMAIL_RESPONDER_PARA). A função `webhook-mercado-pago` também foi regerada (só muda o cabeçalho
de descadastro, que ela não usa); republicar é opcional.

Ordem sugerida: SQL primeiro, depois a função. Se a função nova for publicada antes do SQL, a
carta da ficha já funciona e grava no histórico como antes; o lote espera o SQL.
