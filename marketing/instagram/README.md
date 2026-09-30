# Instagram do OrtoQuestões

Modelos em HTML para os posts do @ortoquestoes. Cada `<section id>` de um HTML vira um PNG:

```
node marketing/instagram/gerar.mjs marketing/instagram/casos/01-tcg/caso.html
```

Os PNGs saem em `saida/`, ao lado do HTML (fora do git). As fontes (Plus Jakarta Sans e
Inter, licença OFL) estão em `fontes/`.

Regras da marca: sem emoji; não mencionar IA nos posts (só nos Termos e no Sobre); telas
com dados de exemplo levam a nota "Tela ilustrativa".

## Apresentação da plataforma (`apresentacao.html`)

7 stories (1080×1920): capa, Treinar, Comentários, Revisão, Desempenho, Ranking e chamada
final com espaço para a figurinha de link. As telas do celular vêm de `telas.mjs`, que abre
o site com uma conta de exemplo (Supabase simulado) e salva capturas em `telas/`:

```
npm run build && npx vite preview --port 4175   # em outro terminal
node marketing/instagram/telas.mjs '' treinar dados revisao ranking
```

## Stories do Cronograma (`cronograma.html`)

6 stories de venda (1080×1920), com visual claro de agenda, diferente do feed: contagem
regressiva, o que é o cronograma em três passos, a tela real (celular), "primeiro o que mais
cai" (só as três primeiras áreas visíveis), semana a semana com o ranking e a chamada para a
prévia grátis com o preço do anual. As telas vêm de `telas.mjs` (conta de assinante com
cronograma montado):

```
node marketing/instagram/telas.mjs cronograma ranking
node marketing/instagram/gerar.mjs marketing/instagram/cronograma.html
```

No último story, colocar a figurinha de link para o site no espaço abaixo do endereço.

## Série "Caso para detetive"

Uma questão com imagem vira investigação: 4 alternativas = 4 suspeitos, cada pista
descarta um, até o veredito.

**Carrossel do feed (7 slides, 1080×1350):**

1. Capa: "Quatro suspeitos. Um culpado.", ficha da paciente e a primeira imagem.
2. Os suspeitos: as alternativas com um "perfil" curto; pede o palpite nos comentários antes de arrastar.
3. Pista 1: descarta o primeiro (carimbo "DESCARTADO").
4. Pista 2: descarta mais dois (carimbos "FORA") e mostra o placar de suspeitos restantes.
5. Pista 3: a prova final (ex.: lâmina) que entrega o culpado.
6. Veredito: carimbo "CULPADO" e o retrato falado para nunca mais errar.
7. Placar: "Em qual pista você cravou?", três níveis, pedido de comentário e marcação e o site.

**2 stories (1080×1920):** A mostra o caso com espaço livre para a figurinha de Quiz (4
opções, marcar a correta); B traz a resposta e o porquê das erradas, postado horas depois.

O conteúdo sai do comentário do site da questão (`public/acervo/comentarios/<tema>.json`).
Se o comentário estiver com `"conferido": false`, conferir o texto médico antes de postar.

Para um caso novo: copiar `casos/01-tcg/` para `casos/NN-nome/`, trocar `IMAGEM`, `W` e
`H` no script do fim do HTML, ajustar os recortes `data-crop="x y largura altura"` (em
pixels da imagem original) e os textos.

### Casos

| Nº | Questão | Prova | Ideia do jogo | Situação |
|---|---|---|---|---|
| 01 | `tumores-0065` | TEOT 2022 | Mulher, 30 anos, joelho: osteossarcoma, condroblastoma, condrossarcoma ou TCG. Pistas: idade, radiografia, RM e lâmina. | Publicado |
| 02 | `pediatria-0327` | TEOT 2025 | Radiografia de criança com seta: infecção, maus-tratos, tumor ou osteogênese imperfeita (resposta: maus-tratos). Pistas: onde está, o formato e o mecanismo. | Pronto (`casos/02-maus-tratos/`) |
| 03 | `pediatria-0449` | TEOT/TARO | Epifisiólise com a linha e o sinal desenhados: Klein, Scham ou Trethowan (resposta: Klein e Trethowan). | Próximo |
| 04 | `ombro-cotovelo-0309` | TECOC/SBCOC | Sinal radiográfico e diagnóstico: lightbulb, crescente, Mercedes ou Moloney (resposta: quebra da linha de Moloney, luxação posterior). Conferir se a imagem cadastrada corresponde à questão. | Ideia |
| 05 | `tumores-0203` | TEOT/TARO | Adolescente, 15 anos, dor no ombro: os mesmos suspeitos do caso 01, outro culpado (condroblastoma). Bom para retomar o retrato falado do TCG. | Ideia |

Outras candidatas: `pediatria-0102` (osteocondrose: Köhler), `pediatria-0194`
(Sinding-Larsen-Johansson e o mecanismo).

### Legendas

**Caso 02 (carrossel):**

> Uma seta. Uma denúncia.
>
> TEOT 2025: a banca aponta para um único detalhe na radiografia do joelho de uma criança pequena. Infecção, maus-tratos, tumor ou osteogênese imperfeita?
>
> Crave a letra nos comentários antes de arrastar. São três pistas até o veredito.
>
> Salve para revisar e marque quem da sua residência precisa ver esta.
>
> Mais questões comentadas: ortoquestoes.com.br
>
> #ortopedia #TEOT #residenciamedica #ortopediapediatrica #traumatologia

**Stories do Cronograma:** sem legenda; no último, figurinha de link para o site.
