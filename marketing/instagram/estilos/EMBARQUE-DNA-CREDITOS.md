# Embarque, Exame de DNA e Créditos finais: modelos aprovados

Tales aprovou os três em 16/10/2026 ("salve esse como modelo"). Valem para Claude, Codex e outros agentes. Fazem parte do arsenal, não são padrão obrigatório. Respeite o intervalo de 2 dias entre usos do mesmo estilo e confira `historico.json` antes (registre como `embarque`, `exame-dna` e `creditos-finais`).

Primeira entrega: `posts/2026-10-16-embarque-musculocutaneo/`. Feed com `ombro-cotovelo-0632` (musculocutâneo), stories com `mao-1666` (arco palmar profundo), ambas dos OrtoQuestões Simulados de anatomia, e três stories de propaganda.

| Estilo | Formato | Modelo |
|---|---|---|
| Embarque | feed, 3 slides de 1080×1350 | [embarque/modelo.html](embarque/modelo.html) |
| Exame de DNA | stories, 3 telas de 1080×1920 | [exame-dna/modelo.html](exame-dna/modelo.html) |
| Créditos finais | stories de propaganda, 3 telas de 1080×1920 | [creditos-finais/modelo.html](creditos-finais/modelo.html) |

Os três modelos têm o mesmo CSS (o do post original); cada um traz só as suas seções. Gere com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/<estilo>/modelo.html`.

Pedido que originou o formato: pouco texto e imagem forte no feed e nos stories de questão; a "enxurrada de texto" fica só nos stories de propaganda, depois de entregar a questão (regra "entregar antes de pedir").

## Embarque (feed)

**A ideia.** A estrutura é um passageiro que embarca por um caminho. Funciona melhor para nervo ou tendão que **atravessa**, perfura ou passa por um túnel: musculocutâneo no coracobraquial, mediano entre as cabeças do pronador, ulnar no canal de Guyon, interósseo posterior na arcada de Frohse.

**Roteiro.**
1. **Capa:** painel de partidas em letras amarelas (Jersey 10), a imagem real da questão dentro de uma janela de avião oval, recortada na seta, e uma pergunta-gancho de duas linhas, com a palavra que decide em amarelo. Sem entregar a resposta.
2. **Questão:** a imagem inteira à esquerda, com a fonte, e à direita o enunciado real e as alternativas como bilhetes (letra em azul, picote tracejado). Faixa amarela "Comente a sua letra antes de passar".
3. **Resposta:** cartão de embarque com Passageiro (a resposta), Embarque (origem), Rota (o ponto que decide) e Destino; no canhoto, a letra do gabarito; carimbo "EMBARQUE OK" abaixo do destino. Abaixo, as erradas como "Negado", uma linha cada, e a faixa "Para a prova". A marca fica no rodapé.

**Acabamento.** Fundo azul-noite com halo; amarelo #FFC93C, verde #5CE08A, azul do bilhete #1B5FAE e papel #F6F3EA. Para ajustar a janela, mude `width`, `left` e `top` do `.janela img` até a seta ficar no centro.

## Exame de DNA (stories)

**A ideia.** A brincadeira do programa de auditório: "quem é o pai?". Funciona melhor quando a pergunta é **de quem vem** algo: contribuição principal de um arco, inervação, irrigação ou origem. Também serve quando as alternativas se parecem muito e só uma é a "verdadeira".

**Roteiro.**
1. **Pergunta:** faixa vermelha "EXAME DE DNA", título "Quem é o pai do ...?", a imagem real, o enunciado real (em serifa) e os quatro "candidatos" com as alternativas do acervo. "Escolha a sua letra. O resultado sai no próximo story."
2. **Resultado:** laudo com Investigado, a resposta e o detalhe que decide; o carimbo "POSITIVO"; a resposta com a letra; uma frase de explicação; os candidatos com o certo em destaque e os outros apagados.
3. **Os outros:** por que cada errada "não é o pai" (uma frase do comentário para cada) e o cartão escuro "Para a prova", com a marca e o site no pé.

**Cuidado.** Nada de porcentagem de exame ("99,9%"): o laudo usa "POSITIVO" para não parecer dado médico inventado. As explicações vêm do comentário da questão.

**Acabamento.** Fundo creme com pautas e halos rosa e azul; vermelho #D6274F e tinta #1C2230. Área útil entre y=230 e y=1800.

## Créditos finais (stories de propaganda)

**A ideia.** Depois da questão, os "créditos" do site rolam como no fim de um filme: rótulo à esquerda, descrição à direita, em Playfair itálica e dourado sobre preto. É o lugar do texto longo.

**Roteiro.**
1. **"Tudo o que você usa de graça":** só recursos do plano gratuito (confira a tabela "Gratuito ou assinante" da página de assinatura) e o selo "Conta grátis · sem cartão".
2. **"Participação especial: o plano até a prova":** os recursos do assinante, com o Cronograma primeiro (a lista de cada dia, o que mais cai primeiro, dia de plantão, ajuste sozinho, reta final), depois Temas que mais caem, Resumão, a turma, Simulado Nacional, liga e relatório. Sem preço.
3. **"A próxima cena é sua":** quatro passos, o botão dourado "Treine grátis", "Crie sua conta pelo link aqui embaixo" e a seta. O espaço entre a seta e o site (y≈1620 a 1740) fica vazio para a figurinha de link.

**O link.** Só o terceiro story leva figurinha, com utm próprio (troque o `utm_campaign` a cada uso):

```
https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=treine-gratis-creditos#/conta?modo=criar&voltar=%2Ftreinar
```

**Cuidado.** Os recursos mudam: antes de reutilizar, confira a tabela da página de assinatura e o `config.ts` (por exemplo, flashcards só entram se estiverem na venda). Nada de preço, número do acervo, emoji ou menção a IA.

## Como reutilizar

1. Leia `docs/marketing/orientacoes.md`, confira `historico.json` e `publicadas.md`.
2. Escolha a questão no acervo (`public/acervo/temas/<area>.json`) e leia o comentário (`public/acervo/comentarios/<area>.json`). Enunciado, alternativas e gabarito iguais ao acervo.
3. Copie o modelo para `posts/AAAA-MM-DD-<slug>/post.html` (os caminhos de fontes e imagens valem na mesma profundidade) e troque os textos e a imagem, mantendo o visual.
4. Gere, olhe cada imagem (texto cortado, sobreposição, carimbo encostando, área segura dos stories) e escreva o `LEGENDA.md`.
5. Registre o estilo em `historico.json` e o id em `publicadas.md`.

## Revisão antes de entregar

- [ ] A imagem é a original da questão, com a fonte; nenhum desenho de anatomia.
- [ ] A capa e o primeiro story não entregam a resposta.
- [ ] Explicações tiradas do comentário da questão, sem número inventado.
- [ ] Stories de questão sem figurinha; só o último story de propaganda tem o espaço livre para o link.
- [ ] Legenda com no máximo 5 hashtags, sem link e sem endereço do site.
