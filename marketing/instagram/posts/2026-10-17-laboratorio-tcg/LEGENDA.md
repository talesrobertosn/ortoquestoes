# Laboratório do TCG (feed) · Raspadinha de Southwick (stories)

Gerar: `node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-17-laboratorio-tcg/post.html`

"Faltam 85 dias" vale para 17/10/2026 (prova teórica do TEOT e do TEPOT em 10/01/2027), e as telas do Cronograma (`marketing/kit/telas/t-*-cronograma-17-10.png`) foram capturadas no mesmo dia (mostram "Faltam 85 dias"). Se postar em outro dia, troque o número no `post.html` (procure "Faltam") e recapture as telas:

```
npm run build && npx vite preview --port 4175   # em outro terminal
E='.cp-tour,.aviso-termos,.status-sincronia,[class*=sincron],[class*=sync]'
ESCONDER="$E" TEMA=escuro LARGURA=1100 ALTURA=688 ESCALA=2 node marketing/instagram/telas.mjs 'lap-cronograma=cronograma@main'
ESCONDER="$E" TEMA=escuro node marketing/instagram/telas.mjs 'cel-cronograma=cronograma@main'
# copie para marketing/kit/telas/ com um nome novo (ex.: t-lap-cronograma-DD-MM.png) e troque data-mac e data-tela no post.html
```

## Ordem e horários

| Quando | O quê | Arquivos |
|---|---|---|
| 7h às 8h | Feed, carrossel de 3 | `f1-lamina`, `f2-laudo`, `f3-prova` |
| 7h às 8h | Story com a pergunta | `s1-raspadinha` |
| 12h | Story com a resposta | `s2-premio` |
| 18h às 19h | Story de chamada, com a figurinha de link na área livre abaixo da seta | `s3-treine` |

Figurinha de link do `s3-treine` (texto: "Treine grátis"):

```
https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=treine-gratis-raspadinha#/conta?modo=criar&voltar=%2Ftreinar
```

Os stories `s1` e `s2` vão sem figurinha.

## Legenda do feed

Que tumor está nessa lâmina?

Mulher de 40 anos, fratura do rádio distal. Radiografia, ressonância e histologia de uma questão do TARO 2026. Comente a sua letra antes de abrir o laudo.

Para a prova: adulto, lesão epifisária que chega ao osso subcondral e células gigantes espalhadas por igual pela lâmina: pense em tumor de células gigantes.

A prova teórica do TEOT e do TEPOT é em 10 de janeiro de 2027. Fique pronto: treine grátis com as questões das provas oficiais comentadas. O caminho está no nosso perfil, @ortoquestoes.

#ortopedia #residenciamedica #teot #tumoresosseos #ortoquestoes

## Conferência

- Feed: `tumores-0309` (TARO 2026). Enunciado e alternativas iguais ao acervo; gabarito D, tumor de células gigantes. Pistas tiradas do comentário da questão.
- Stories: `pediatria-0120` (TARO 2022). Gabarito C, Southwick. Explicações do comentário da questão.
- O cronograma é recurso do assinante: o texto fala do cronograma sem dizer que é grátis; o "Treine grátis" vale para a conta gratuita.
- Imagens reais das questões; nenhum desenho de anatomia.
