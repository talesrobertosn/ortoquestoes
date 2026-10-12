# VAR da questão: modelo aprovado

Tales aprovou este modelo em 12/10/2026 ("muito bom, salve no acervo de modelos"). Vale para Claude, Codex e os demais agentes. Ele faz parte do arsenal, mas não é padrão obrigatório. Respeite o intervalo de 2 dias entre usos do mesmo estilo e confira `historico.json` antes de usar.

Referência executável: [var-da-questao/modelo.html](var-da-questao/modelo.html), com o feed (5 slides de 1080×1350) e os stories (3 telas de 1080×1920) no mesmo arquivo. Primeira entrega: `posts/2026-10-12-var-piriforme/` (quadril-0077, TEOT 2023).

## Quando escolher

**A metáfora.** A questão é um lance polêmico, e o VAR revisa cada alternativa: três são "anuladas", cada uma com o motivo, e uma é o "gol validado". É o formato de comentar a questão alternativa por alternativa, com cara de transmissão esportiva.

**Funciona melhor quando:**
- as alternativas combinam itens, como pares de testes, nervos, classificações ou estruturas;
- alguns desses itens claramente "jogam em outro time", ou seja, pertencem a outro assunto;
- o erro de cada distrator pode ser dito em uma linha.

**Evite em:** questões de imagem em que o raciocínio dependa de apontar estruturas, porque o modelo não tem espaço para a figura. Também evite quando os distratores só se explicam com parágrafos longos.

## Roteiro

**Feed (5 slides):**
1. **Lance polêmico:**
   - placar com a marca, a prova e o ano, a área e "AO VIVO";
   - a chamada "Quatro testes em campo. Só dois jogam pelo piriforme" (adapte ao tema);
   - a "escalação" dos itens com "?" e "EM REVISÃO".
   
   Não entregue o gabarito nesta tela.
2. **O lance:** o enunciado integral e as alternativas dentro do monitor do VAR, mais "Antes do VAR: comente a sua letra."
3. **Replay em câmera lenta:** o conceito que decide a questão, em dois blocos ("Jogada 1", "Jogada 2"), e a "Leitura do VAR" com a regra para eliminar.
4. **Decisão:** cada alternativa com o selo ANULADO (vermelho) ou GOL VALIDADO (verde), e o motivo tirado do comentário do acervo.
5. **Súmula:**
   - tabela com cada item, o que ele avalia e um selo (o item certo, OUTRO TIME, NO BANCO para os itens corretos que não estavam nas alternativas);
   - o painel "Para a prova";
   - ortoquestoes.com.br e @ortoquestoes.

**Stories (3 telas):**
1. **VAR checando:** a pergunta curta e a questão no monitor, com a tarja "Sua letra? Comente. A decisão do VAR sai no próximo story."
2. **Impedimento:** as fichas dos itens errados, com a linha vermelha de impedimento na lateral, e "Tirando os dois, sobra uma só alternativa em jogo."
3. **Gol validado:**
   - a letra gigante em verde e a resposta;
   - os dois blocos explicativos e o painel "Para a prova";
   - a chamada leve para o perfil, sem preço.

## Acabamento

- **Fundo:** gramado em faixas verticais com um véu azul-noite por cima. A linha central e o círculo do meio-campo são só decoração.
- **Cores:** ouro (#ffd23f) para selos e tarjas, vermelho (#ff4d5a) para AO VIVO e ANULADO, verde (#35e08a) para GOL VALIDADO e roxo (#5b3df5) no rótulo do monitor.
- **Fontes:** Plus Jakarta Sans 800 nos títulos e no placar, Inter no corpo.
- **Layout:** o conteúdo do feed fica centralizado na vertical entre o placar e a tarja. Nos stories, o conteúdo fica entre y=370 e y=1560, e a tarja em y=1590.
- **Linha de impedimento:** fica à direita da ficha (o texto tem margem direita de 150 px), para nunca cortar a explicação.
- **Sem anatomia:** nada de desenho anatômico. Gramado, linhas e monitor são objetos de transmissão, não estruturas do corpo.

## Como reutilizar

1. Leia `docs/marketing/orientacoes.md`. Escolha uma questão oficial nova (confira `publicadas.md`) e leia o comentário completo.
2. Copie o modelo para `marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html`. A profundidade das pastas é a mesma, então os caminhos de fontes continuam valendo.
3. Troque tudo o que for da referência:
   - placar (prova, ano e área) e `data-question`;
   - escalação, lance, replay, decisões e súmula;
   - fichas do impedimento e decisão dos stories.
   
   Enunciado, alternativas e gabarito iguais aos do acervo.
4. Gere as imagens:
   ```bash
   node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
   ```
5. Abra cada PNG e confira:
   - texto cortado, a linha de impedimento sobre o texto e vazio embaixo;
   - acentos;
   - selos certos em cada alternativa.
6. Escreva `LEGENDA.md` com no máximo 5 hashtags, sem link e levando para o perfil. Registre o post em `historico.json` com o estilo `var` e o id em `publicadas.md`. Entregue também a legenda como texto.
