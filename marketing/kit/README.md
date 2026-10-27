# Kit de posts do Orto Questões

Para fazer um post do Instagram sem editar HTML: cada post é um JSON, e um comando gera os PNGs nos
modelos aprovados pelo Tales. Feito para Claude, Codex ou qualquer agente seguir sem improvisar.
As regras da marca continuam em [docs/marketing/orientacoes.md](../../docs/marketing/orientacoes.md);
o kit já confere a maior parte delas sozinho.

## O ciclo (siga na ordem)

1. **Escolher.** `node marketing/kit/proximo.mjs` mostra o próximo post da fila (o primeiro não entregue)
   e os comandos. A fila inteira está em [fila/INDICE.md](fila/INDICE.md).
2. **Ler o JSON** indicado (`marketing/kit/fila/post-NN.json`). Ele já traz a questão copiada do acervo,
   os textos dos slides, a legenda e as hashtags. Só mude texto criativo se precisar; **nunca** mude
   `questao` (enunciado, alternativas, gabarito, comentário). Se a situação for "falta capturar as telas",
   rode antes o comando de `conteudo.captura`.
3. **Gerar:** `node marketing/kit/renderizar.mjs marketing/kit/fila/post-NN.json`
   (atalho: `node marketing/kit/renderizar.mjs NN`). O comando confere o post antes; com ERRO, ele para:
   corrija o que a mensagem pede e rode de novo.
4. **Saída:** `marketing/kit/saida/post-NN/` (fora do git): os PNGs (feed 1080×1350, stories 1080×1920)
   e a `LEGENDA.txt` com a ordem de publicação e a legenda pronta.
5. **Conferir cada PNG aberto** (não basta o comando rodar sem erro): texto cortado ou sobreposto, imagem
   inteira e nítida, acentos, contador de slides, rodapé. Leia os AVISOS que o comando imprimiu
   ("reduzido a 9x%" = texto um pouco longo; encurte no JSON se ficou pequeno).
6. **Entregar ao Tales:** os PNGs e a legenda do feed **como texto na conversa** (copiar da `LEGENDA.txt`).
   Nos stories de propaganda, mande também o `link_figurinha`.
7. **Registrar:** `node marketing/kit/registrar.mjs marketing/kit/fila/post-NN.json` (anota o estilo em
   `estilos/historico.json`, o id em `publicadas.md` e marca o JSON como entregue). Depois
   `node marketing/kit/indice.mjs` e commit desses arquivos. Não publique nada em rede social.

## Comandos

| Comando | Para quê |
|---|---|
| `node marketing/kit/proximo.mjs` (ou `todos`) | O próximo post da fila (ou a lista) |
| `node marketing/kit/renderizar.mjs NN [--saida pasta]` | Gera os PNGs e a LEGENDA.txt (`--forcar` só para rascunho com erro) |
| `node marketing/kit/conferir.mjs NN` (ou `todos`) | Só confere: acervo, publicadas, legenda, hashtags, intervalo de estilo |
| `node marketing/kit/questao.mjs <id>` | Copia o bloco `questao` do acervo, sem mudar nada |
| `node marketing/kit/questao.mjs buscar <palavra> [--imagem] [--area mao]` | Procura questões TEOT/TARO ainda não publicadas |
| `node marketing/kit/renderizar.mjs modelo <estilo>` | Gera o exemplo aprovado de um modelo (referência visual) |
| `node marketing/kit/registrar.mjs NN` e `node marketing/kit/indice.mjs` | Registra a entrega e refaz o índice |

Primeira vez numa máquina nova: `npm ci` e, se o Chromium de `/opt/pw-browsers` não existir,
`npx playwright install chromium`.

## Os modelos (estilos aprovados)

| Estilo (`estilo` no JSON) | Formato | Use quando | Guia |
|---|---|---|---|
| `snellen` | feed, 5 | uma palavra miúda do enunciado decide | [SNELLEN-E-CUPOM](../instagram/estilos/SNELLEN-E-CUPOM.md) |
| `var` | feed 5 + stories 3 | alternativas em pares ou combinações | [VAR-DA-QUESTAO](../instagram/estilos/VAR-DA-QUESTAO.md) |
| `cofre-duas-chaves` | feed, 6 | duas identificações que precisam coincidir, com imagem | [COFRE-E-MECANICA-FINA](../instagram/estilos/COFRE-E-MECANICA-FINA.md) |
| `cupom-fiscal` | stories, 3 | questão curta primeiro, propaganda leve no fim | [SNELLEN-E-CUPOM](../instagram/estilos/SNELLEN-E-CUPOM.md) |
| ~~`mecanica-fina`~~ (aposentado em 27/10/2026; o kit recusa: trocar o estilo dos posts 06, 12, 18, 24 e 30 da fila) | stories, 6 | identificar na imagem: origem, inserção, trajeto, posição | [COFRE-E-MECANICA-FINA](../instagram/estilos/COFRE-E-MECANICA-FINA.md) |
| `treine-gratis` | story de propaganda, 1 | convite para criar a conta (figurinha de link com utm) | [TREINE-GRATIS](../instagram/estilos/TREINE-GRATIS.md) |

Os modelos ficam em [modelos/](modelos/) e têm o **CSS dos modelos aprovados sem mudança** (conferido
pixel a pixel: o exemplo de cada um sai idêntico ao aprovado). Os campos de cada um estão em
[modelos/CAMPOS.md](modelos/CAMPOS.md). Os outros estilos do arsenal (jornal, cinema, receita, GPS...)
continuam pelo caminho antigo: [docs/prompts/codex-instagram.md](../../docs/prompts/codex-instagram.md).

## Regras que o kit não decide por você

- Questão real do acervo, sem repetir as publicadas; todo texto médico vem do comentário dela.
  Comentários com `conferido=false` ou com `alerta` aparecem como aviso: leia antes.
- Sem imagem gerada por IA, sem desenho de anatomia, sem emoji, sem mencionar IA, sem preço
  (só a pedido do Tales), sem citar o total de questões, sem nome de curso preparatório.
- Stories de questão sem figurinha; só o Treine grátis leva a figurinha de link.
- Legenda sem endereço do site e sem a palavra "link"; leva para o perfil; no máximo 5 hashtags.
- Mesmo estilo só depois de 2 dias livres; no máximo 2 feeds por dia.

## Quando a fila acabar

1. Escolha a questão: `node marketing/kit/questao.mjs buscar <tema> --imagem` (varie a área; prefira TEOT/TARO).
2. Copie um JSON da fila do mesmo estilo para `fila/post-NN.json`, troque `post`, `data`, `horario`,
   `slug`, `assunto`, `gancho`, `legenda`, `hashtags` e todo o `conteudo`.
3. Troque o bloco `questao` pela saída de `node marketing/kit/questao.mjs <id>`.
4. `node marketing/kit/conferir.mjs NN`, depois o ciclo acima. Por fim, `node marketing/kit/indice.mjs`.

## Estrutura

```
marketing/kit/
  README.md          este ciclo
  assets.md          paleta, fontes, marca, mascote, ícones, telas e imagens (com caminho e quando usar)
  renderizar.mjs     JSON -> PNGs + LEGENDA.txt (Playwright)
  conferir.mjs  questao.mjs  proximo.mjs  registrar.mjs  indice.mjs  lib/comum.mjs
  modelos/           um HTML por estilo + base.js + CAMPOS.md
  fila/              post-01.json ... post-30.json e INDICE.md
  saida/             PNGs gerados (fora do git)
```
