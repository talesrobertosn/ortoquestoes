# Stories com alternativas (modelo aprovado)

Aprovado pelo Tales em 18/11/2026 ("salva isso no repositório como alternativa, stories com alternativas. Sempre
quando eu pedir, fazer algo parecido. A temática também adaptar"). É o formato de stories que **mais gerou
interação**: a questão com as alternativas escritas e a **enquete A, B, C, D do Instagram** colocada pelo Tales por
cima, numa área livre. Nasceu do story do osteoma osteoide (`png/referencia-osteoma-instagram.png`, 65% acertaram a
C) e virou modelo com a versão "tela do celular" da incidência de HEINIG.

**Quando usar:** sempre que o Tales pedir "stories com alternativas", "story com enquete", "com a caixinha do ABCD"
ou "igual àquele que deu certo". Fica **fora do rodízio** de `ORDEM.md`: entra a pedido. É a exceção aprovada à
regra "stories sem figurinha" (só a enquete das letras; figurinha de link continua proibida).

Modelo executável (3 stories, questão `trauma-0753`, TEOT 2025, variante "tela do celular"):

```
node marketing/instagram/gerar.mjs marketing/instagram/estilos/stories-com-alternativas/modelo.html
```

Prévias aprovadas em `estilos/stories-com-alternativas/png/`; post original em `posts/2026-11-18-vidro-heinig/`.

## O que não muda (a estrutura)

De 2 a 3 stories, nesta ordem:

| Story | Horário | O que leva |
|---|---|---|
| 1. A questão | 7h | Prova e ano (TEOT ou TARO de 2023 a 2025 de preferência), a imagem da questão, o enunciado igual ao acervo e **as quatro alternativas escritas por extenso**, com a letra em destaque. Embaixo, a **área livre para a enquete** e uma dica curta ("Vote na sua letra", "a resposta chega às 12h"). |
| 2. A resposta | 12h | A alternativa certa em dourado, **um trecho real do comentário com o livro** ("Segundo o Rockwood", "De acordo com o Campbell", "No Green"), a figura do comentário quando ajudar e uma linha por alternativa errada. |
| 3. O convite | 19h | O site gratuito: "Treine grátis", ortoquestoes.com.br escrito na imagem, "o caminho está no nosso perfil" e o que o site tem, com os nomes reais das páginas. Pode ir junto do story 2 quando o Tales pedir só 2. |

## A área da enquete (o ponto mais importante)

- **Nada desenhado.** Sem caixa, sem moldura, sem tracejado, sem cantos marcados e sem as letras "fantasmas":
  o Tales achou feio ("o Instagram nunca consegue preencher da maneira correta"). Só o **espaço vazio** e,
  em cima dele, a dica discreta com uma setinha.
- **Tamanho:** a enquete de 4 opções ocupa cerca de **480 × 450 px** no story de 1080 × 1920 (medido no print do
  osteoma). Deixe pelo menos **450 px de altura livre** abaixo da dica (no modelo, de 1440 a 1900 px), sem texto nem imagem
  importante por baixo; o fundo pode continuar (degradê, cenário).
- O Tales escolhe onde soltar a enquete; as alternativas escritas ficam **acima** da área, para que a enquete não
  cubra nenhuma delas.
- Na enquete do Instagram, as opções são só as letras **A, B, C e D**.

## O que muda a cada vez (a temática)

A temática **se adapta à questão e ao pedido**, sem repetir a mesma duas vezes seguidas. Exemplos:

- **Tela do celular** (o modelo): papel de parede em degradê nas cores do site (verde-noite, verdete, menta e um
  brilho creme-dourado), tela de bloqueio às 7:00 com a questão como **notificação** do Orto Questões (ladrilho
  como ícone, figura como anexo) e as alternativas como botões de vidro; central de notificações às 12:00 com a
  resposta e um aviso agrupado "Por que não as outras"; central de controle com os blocos das páginas reais
  (Treinar, Revisão, Caderno de erros, Simulados, Resumos, Flashcards, Cronograma, Atlas 3D). Sem logotipo ou nome
  de outra empresa.
- **Negatoscópio / filme de raio X** (o do osteoma): filme pendurado com prendedor, alternativas em tira de filme.
- Outras ideias que combinam: cartão de embarque, cardápio, placar, receituário, prontuário, painel de aeroporto.
  Qualquer estilo do arsenal (`ESTILOS.md`) serve de moldura, desde que a área livre da enquete exista.

Quando o Tales não pedir uma temática, use as **cores do site** com acabamento de vidro suave e degradê de cores
(nunca fundo branco chapado com manchas: ele achou feio) ou a tela do celular. Pixel art HD-2D só se ele pedir.

## Regras que continuam

- Questão real do acervo (`node marketing/kit/questao.mjs buscar <tema> --imagem`), inédita em `publicadas.md`, com
  enunciado, alternativas e gabarito iguais ao acervo. A busca do modelo: TEOT de 2023 a 2025, com imagem, quatro
  alternativas curtas e comentário citando um livro.
- Citação só do que está no comentário (livro, edição, capítulo e página quando houver). Comentário com
  `conferido: false` não é apresentado como revisado.
- Figura da prova pequena: use a mesma figura do livro, em alta, com a fonte escrita embaixo ("Figura da prova, a
  mesma do Rockwood…, Fig. 32-13A").
- Sem emoji, sem IA, sem número total de questões, sem figurinha de link, sem desenho de anatomia.
- O que importa entre 250 e 1580 px de altura (o topo e a barra de resposta do Instagram cobrem as pontas).

## Conferência antes de entregar

1. `node marketing/instagram/gerar.mjs <post>/stories.html` e `python3 scripts/design/conferir_pngs.py <post>/saida --formato story`.
2. Abrir cada PNG no tamanho real: alternativas legíveis, área da enquete vazia e com 450 px ou mais, nada cortado,
   sobreposto ou órfão (palavra sozinha na linha).
3. Copiar os PNGs para a pasta do post, escrever a `LEGENDA.md` (ordem, horários, "colocar a enquete A, B, C, D na
   área livre"), registrar o id em `publicadas.md` e `{"estilo": "stories-com-alternativas"}` em `historico.json`.
