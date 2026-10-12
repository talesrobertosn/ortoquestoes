# Tabela de Snellen e Cupom fiscal: modelos aprovados

Tales aprovou os dois modelos em 12/10/2026 ("muito bom, salvar modelo para o futuro"). Este guia vale para Claude, Codex e os demais agentes. Os modelos fazem parte do arsenal, mas não são padrão obrigatório. Respeite o intervalo de 2 dias entre usos do mesmo estilo e confira `historico.json` antes de usar.

## Quando escolher cada um

| Modelo | Formato | Use quando | Referência executável |
|---|---|---|---|
| Tabela de Snellen | Feed, 5 slides de 1080×1350 | Uma palavra do enunciado decide a questão (nível, lado, idade, tempo, "junção", "proximal") e as alternativas parecem quase iguais | [snellen/modelo.html](snellen/modelo.html) |
| Cupom fiscal, versão principal | Stories, 3 telas de 1080×1920 | Questão primeiro (pergunta e resposta na nota) e propaganda leve no fim, sem preço | [cupom-fiscal/modelo.html](cupom-fiscal/modelo.html) |
| Cupom fiscal, variante de preço | Stories, 3 telas de 1080×1920 | Só quando o pedido for propaganda direta de assinatura, com preço | [cupom-fiscal/modelo-preco.html](cupom-fiscal/modelo-preco.html) |

Os dois combinam no mesmo dia: o Snellen de manhã no feed e o cupom nos stories do almoço ou da noite. Também funcionam separados. A primeira entrega foi o post `posts/2026-10-12-snellen-cupom/`.

## Tabela de Snellen (feed)

**Metáfora.** A banca esconde o detalhe na última linha, e o Orto Questões treina o seu olho. A tabela só funciona se a linha miúda for de fato a que decide a questão. Se a questão se resolve pelo conceito geral, escolha outro estilo.

**Roteiro dos 5 slides:**
1. **Capa, "Até que linha você lê?"**
   - As palavras-chave da questão aparecem em linhas que diminuem, com 20/200 até 20/20 na lateral.
   - A pista decisiva fica nas linhas 6 e 7, numeradas em vermelho.
   - As alternativas podem aparecer resumidas numa linha média.
   - Nunca escreva o gabarito na capa.
   - O oclusor preto fica no canto como decoração.
2. **A questão:**
   - enunciado integral num cartão branco, com a pista grifada em amarelo;
   - alternativas em blocos grandes, como optotipos;
   - "Comente a sua letra antes de arrastar".
3. **Com a lupa:** a lente amplia a linha miúda. Dois cartões explicam o que a primeira metade do enunciado já resolve e qual pergunta a palavra miúda responde.
4. **A resposta:**
   - os itens em escada, de cima para baixo;
   - o correto em bloco preto, com o selo "Gabarito";
   - os outros com o motivo, tirado do comentário.
5. **Para a prova:**
   - teste do vermelho e verde, com dois lados do que cai (por exemplo, quando complica e o que vale sempre);
   - um cartão com mais um fato;
   - fecho fixo: "A banca esconde o detalhe na última linha. A gente treina o seu olho.";
   - rodapé com ortoquestoes.com.br e @ortoquestoes.

**Acabamento:**
- **Fundo:** parede de consultório (#e9e6df) com rodapé bege.
- **Quadro:** iluminado, com cantos de 22 px e moldura branca dupla.
- **Fontes:** Source Serif 4 nos títulos, Inter 800 nas letras da tabela, com espaçamento largo.
- **Altura do conteúdo:** a classe `.quadro.centro` centraliza o conteúdo na vertical. Use sempre, para não sobrar vazio embaixo.
- **Tamanho mínimo:** a linha 20/20 não pode ficar abaixo de 19 px, para continuar legível no celular.
- **Lupa:** o cabo sai para a direita, na altura do meio. Confira se não cobre nenhum texto.
- **Sem anatomia:** nada de desenho anatômico. O conteúdo da tabela é texto, e a lupa, o oclusor e as cores vermelho e verde são só objetos de exame de vista.

## Cupom fiscal (stories)

**Versão principal: questão primeiro (orientação do Tales, 12/10/2026).** "Quando a gente consegue abordar uma questão antes da propaganda, nós entregamos algo e pedimos algo em troca." Use esta versão por padrão. A propaganda fica leve, sem preço. Se algum valor precisar aparecer, que seja bem pequeno e discreto.

1. **Pedido do dia:**
   - a nota imprime uma questão oficial curta (enunciado de até cerca de 130 caracteres, alternativas curtas), com as alternativas como itens "[A]" a "[D]";
   - "aguardando a sua letra..." no papel;
   - fora do papel, um gancho do caso (por exemplo, "Um prego atravessou o tênis. Qual germe?") e "Comente a sua letra. A resposta sai no próximo cupom."
2. **Resposta:**
   - a alternativa correta numa faixa preta;
   - dois parágrafos de explicação tirados do comentário;
   - as erradas em cinza, cada uma com o motivo em uma linha;
   - fora do papel, a regra para a prova em uma frase.
3. **Propaganda leve:**
   - "ESSA SAIU POR NOSSA CONTA / e tem mais na mesma nota:";
   - até 5 recursos reais marcados OK;
   - código de barras, ortoquestoes.com.br e "VOLTE AMANHÃ";
   - fora do papel, "Gostou? Treine mais como esta." e "Comece grátis: o caminho está no nosso perfil."

Referência: conceitos-basicos-0079, TARO 2022, em `posts/2026-10-12-cupom-questao/`.

**Variante de preço (`modelo-preco.html`).** É a primeira versão aprovada e a descrição abaixo vale para ela. Só use quando o pedido for explicitamente propaganda com preço.


**Metáfora.** O mês de estudo sai impresso numa nota térmica, item por item, e o total é menor que um almoço.

**Roteiro das 3 telas:**
1. **Início do cupom:**
   - a impressora com o LED verde;
   - o cabeçalho "ORTO QUESTÕES", com "CUPOM DO SEU MÊS DE ESTUDO" e "qtd. 30 dias";
   - os três primeiros itens marcados OK e a nota "imprimindo...";
   - a pergunta grande "Quanto custa um mês de preparação de verdade?".
2. **Continuação:**
   - os outros recursos marcados OK;
   - duas linhas de humor em vermelho ("Tempo procurando o que estudar: 0 h", "Itens cobrados à parte: 0");
   - "calculando o total...".
3. **Total:**
   - o preço grande por mês, com o total do período e o valor por dia;
   - a faixa "MENOS QUE UM ALMOÇO";
   - Pix ou cartão e a garantia de 7 dias, com reembolso pelo botão;
   - código de barras, ortoquestoes.com.br e "VOLTE SEMPRE";
   - a chamada "Grátis para começar. O caminho está no perfil."

**Regras de conteúdo:**
- **Preço:** antes de usar, confira o preço em `src/dados/planos.ts`. Na aprovação, o anual era R$ 239,90, ou seja, R$ 19,99/mês e cerca de R$ 0,66 por dia. Se o preço mudar, recalcule as três cifras. Não invente desconto nem preço de almoço.
- **Itens:** só recursos que existem no site, conferidos na página de vendas (`src/paginas/Assinatura.tsx`). Não cite o número total de questões.
- **Garantia:** copie o texto da página de vendas: até 7 dias após a cobrança, reembolso integral pedido por botão na conta.
- **Variações:** dá para trocar os itens e a ordem, ou fazer a versão semestral ou mensal. Mantenha 3 telas, conteúdo entre y=250 e y=1700 e nenhuma figurinha.

**Acabamento:**
- **Fundo:** verde-noite da marca (#123a35) com pontos sutis.
- **Papel térmico:** creme, em "DejaVu Sans Mono" (fonte do sistema), com tracejados entre os blocos e serrilha no fim.
- **Cores dos destaques:** o OK em verde-petróleo e as chamadas fora do papel em Source Serif, com o destaque em ouro (#f4cf7c).

## Como reutilizar

1. Leia `docs/marketing/orientacoes.md`. Para o Snellen, escolha uma questão nova conferindo `publicadas.md` e use enunciado, alternativas e gabarito idênticos aos do acervo, com explicação tirada do comentário.
2. Copie o modelo para `marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html`. A profundidade das pastas é a mesma, então os caminhos de fontes continuam valendo.
3. Troque tudo o que for da referência: `data-question`, as linhas da tabela, os textos da lupa, a escada e o vermelho e verde.
4. Para combinar os dois num post, junte as seções num único `post.html`.
5. Gere as imagens:
   ```bash
   node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
   ```
6. Abra cada PNG e confira quatro coisas:
   - texto cortado, sobreposição (em especial o cabo da lupa) e vazio embaixo do quadro;
   - acentos;
   - legibilidade da linha 20/20;
   - preço e garantia iguais aos do site.
7. Escreva `LEGENDA.md` com no máximo 5 hashtags, sem link e levando para o perfil. Registre o post em `historico.json`, com os estilos `snellen` e `cupom-fiscal`, e o id em `publicadas.md`. Entregue também a legenda como texto.
