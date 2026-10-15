# Prompt curto para o Codex (ou outro agente): post do Instagram pelo kit

Complementa [codex-instagram.md](codex-instagram.md) (que continua valendo para os estilos fora do kit).
Com o kit, o post já está pronto num JSON: o agente só gera, confere e entrega.

## Pedido para colar no Codex

```
Siga marketing/kit/README.md deste repositório, passo a passo, sem improvisar.
1. Rode: node marketing/kit/proximo.mjs  (ou use o post <NN> se eu indicar).
2. Leia o JSON indicado. Não mude o bloco "questao" nem o gabarito.
   Se a situação for "falta capturar as telas", rode antes o comando de conteudo.captura.
3. Gere: node marketing/kit/renderizar.mjs <NN>. Se der ERRO, corrija o que a mensagem pede e rode de novo.
4. Abra cada PNG de marketing/kit/saida/post-<NN>/ e confira: texto cortado ou sobreposto, imagem
   inteira, acentos, contador, rodapé. Se algo estiver ruim, encurte o texto no JSON e gere de novo.
5. Me mostre as imagens e a legenda do feed em texto (da LEGENDA.txt) e, se houver, o link da figurinha.
6. Rode node marketing/kit/registrar.mjs <NN> e node marketing/kit/indice.mjs e faça o commit.
Nada de imagem gerada por IA, emoji, preço ou publicação em rede social.
```

## Para criar um post novo (fila acabou)

```
Siga a seção "Quando a fila acabar" de marketing/kit/README.md.
Use o estilo <estilo> (ver a tabela de modelos) e uma questão TEOT ou TARO de <área> ainda não publicada
(node marketing/kit/questao.mjs buscar <palavra>). Copie um JSON da fila do mesmo estilo, troque o
bloco "questao" pela saída de questao.mjs e reescreva só o conteúdo criativo, tirando todo fato médico
do comentário do acervo. Depois conferir, gerar, abrir cada PNG e me mandar imagens e legenda.
```
