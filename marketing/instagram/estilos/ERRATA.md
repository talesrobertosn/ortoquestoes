# Errata: o gabinete de revisão (modelo aprovado)

Aprovado pelo Tales em 13/11/2026 ("salve esses modelos que você fez, pq ficou perfeito"; "salvar para uma
próxima"). É um **estilo de stories do arsenal** para questões em que o livro, a edição ou a página decidem a
resposta (uma edição nova que mudou um fato, dois livros que divergem, uma tabela de classificação revista). Segue o
[padrão aula](PADRAO-AULA.md) e a [régua da Oficina do encaixe](OFICINA-DO-ENCAIXE.md).

Modelo executável (4 stories, questão `tumores-0394`, metástases ósseas no Campbell 14 × 15):

```
python3 marketing/instagram/estilos/errata/arte_errata.py            # pinta toda a arte em estilos/errata/arte/
node marketing/instagram/gerar.mjs marketing/instagram/estilos/errata/modelo.html
```

Prévias aprovadas em `estilos/errata/png/`.

## O cenário

Um gabinete de revisão à noite, pintado em pixel art por código (`arte_errata.py`, 360 x 640 ampliado 3x, com luz
calculada): estante de nogueira com as lombadas uma a uma, janela em arco com a lua e a cidade, cortinas de veludo
verde, mesa com mata-borrão de couro, luminária de banqueiro acesa (a luz quente principal), tinteiro, óculos,
fichas de revisão e xícara. `fundo.png` tem a mesa embaixo; `fundo-mesa.png`, a mesa alta, para um aparelho em cima.

Objetos soltos (PNG transparente, 3 px por pixel): `volumes` (três lombadas em pé, 13ª, 14ª e 15ª, com a etiqueta
vazia para o texto do HTML), `livro-aberto` (as duas páginas para comparar edições), `livros-deitados`, `lapis`
(bicolor de revisão), `lupa` (lente vazada), `carimbo`, `balanca-litica` e `balanca-blastica` (o equilíbrio entre
tirar e repor osso), `prendedor`, `macbook` e `iphone` (tela vazada para a captura real do site).

## A interface

- **Etiqueta de couro verde com ouro** no topo (Cinzel em folha de ouro), no lugar da placa de latão da Oficina.
- **Prova tipográfica**: folha creme com a margem vermelha do revisor, presa por prendedores; "prova 1 de 4" no canto.
- **Marcas do revisor**: palavra riscada em vermelho com a correção em Caveat (‸), marca-texto amarelo no que a
  edição nova trouxe, post-it com o outro livro, marcador de papel com a edição antiga.
- **Ficha de couro** com a regra que não muda e etiquetas coloridas (blástica, lítica pura, mista, a que varia).
- Livro, edição, capítulo e página em cada tela; figura do livro só com recorte, ampliação e a fonte embaixo.

## Roteiro do modelo (adaptar à questão)

1. **Gancho e questão**: a pergunta que a edição decide ("Mama é blástica ou lítica?"), os volumes em pé e a questão
   como caiu, com "a resposta sai no story 4".
2. **O porquê**: o mecanismo (as duas balanças) e a figura do livro com a seta fora da imagem.
3. **A errata**: o livro aberto com a edição antiga corrigida à mão e a nova com marca-texto, o post-it do outro
   livro e a ficha da regra estável.
4. **A resposta**: carimbo, a alternativa certa com a ressalva da edição, por que cada errada erra, o detalhe que a
   prova cobra e um número que dá peso (o MIRELS).

## Variante de propaganda: "Como escrevemos o comentário"

No mesmo cenário, o post de 13/11/2026 (`posts/2026-11-13-errata-metastases/`) mostra o **comentário real num
iPhone** (capturas de `capturar.mjs`, sem montagem), uma seção por story: o aviso em vermelho, o Conceito-chave com a
tabela das edições, "Por que a B está certa" e "Por que as outras não servem", com papeletas numeradas e pinos
dourados ligados ao trecho da tela, e "Treine grátis" no último. O Tales pediu esse formato para propaganda
("o intuito é propaganda sobre como escrevemos os comentários"; "no MacBook ou no iPhone fica mais visível").
No iPhone, o texto do site fica legível no story; no MacBook a página inteira cabe, mas o texto fica pequeno demais.

## Revisão (o que foi corrigido e não pode voltar)

- Prendedor cobrindo o rótulo da folha: o prendedor é pequeno e o texto começa abaixo dele.
- Texto de legenda passando por baixo de figura; fonte das figuras sem fundo escuro em cima da mesa (use a plaqueta).
- Lupa mostrando um trecho diferente do que o pino aponta: confira a posição na captura antes.
- Barra de baixo do site encostando nos cantos do iPhone: a página fica entre a barra de status e a faixa do
  indicador de início.
