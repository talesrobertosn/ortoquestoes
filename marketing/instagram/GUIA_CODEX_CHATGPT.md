# Guia para o Codex e o ChatGPT criarem posts do Instagram (@ortoquestoes)

Este guia é para quem vai continuar os posts do Orto Questões no mesmo padrão dos que já foram feitos.
Leia tudo antes do primeiro post e releia a seção "Antes de postar" a cada post.

## 1. Conheça o produto antes de escrever

Antes de criar qualquer post, abra o site https://ortoquestoes.com.br e navegue pelas páginas: Início,
Treinar, Revisão, Desempenho, Ranking, Cronograma, Temas que mais caem, Planos, O projeto (Sobre) e Termos.
No repositório (`talesrobertosn/ortoquestoes`, branch `claude/pdfs-questoes-tp64dr`), leia também:

- `marketing/instagram/README.md`: os modelos que já existem e como gerar as imagens;
- `marketing/instagram/relancamento/` e `marketing/instagram/cadastro.html`: os posts mais recentes, que
  são a referência visual;
- `src/paginas/Termos.tsx` e `src/paginas/CondicoesAssinatura.tsx`: o que o site promete e o que não promete.

O que o site é, em uma frase: um banco de questões de provas anteriores de ortopedia (TEOT, TARO, ENARE R4,
TECOC e Fellowship Quadril), organizadas por assunto, com comentário da alternativa certa e das erradas,
revisão das questões erradas, desempenho, ranking e um Cronograma que monta o estudo até a prova.

Fatos que podem aparecer nos posts (confira no site se mudaram):

- É preciso criar conta (grátis) para responder questões. O gratuito tem 20 questões por dia.
- Planos: mensal R$ 39,90, semestral R$ 179,90 e anual R$ 239,90 (cobrança integral por período).
- Prova teórica online do TEOT e do TEPOT 2027 (SBOT): 10 de janeiro de 2027. Quando falar em "faltam N
  dias", calcule no dia em que a imagem for gerada.
- Funções só do plano pago: Simulado Nacional mensal, plano até a prova, como a turma respondeu, liga da
  residência e relatório mensal. Comentários, revisão, caderno de erros e desempenho são para todos.

## 2. Identidade visual (sempre a nova)

O dono do projeto vai enviar as imagens da identidade visual. Elas são a referência final; o que está
abaixo é o resumo delas.

- **Nome:** sempre "Orto Questões", escrito por extenso, com o "Questões" em peso menor. Nunca usar a
  letra Q isolada, dentro de círculo ou como símbolo, nem abreviações como "OQ".
- **Símbolo:** três alternativas (um ponto e uma barra em cada linha); a do meio, a certa, em dourado.
  Copie o SVG de `src/marca/Simbolo.tsx` ou de `marketing/instagram/marca.html`. Não redesenhe.
- **Cores:** verde principal `#14655E`; verde escuro (tinta) `#0B3A35`; dourado `#F4CF7C` (dourado
  escuro `#C9952F`); creme `#FBF6EA`; acerto `#1F7A4D`; erro `#B3423A`; texto escuro `#12181A`.
- **Fontes:** Plus Jakarta Sans para títulos e para o nome (pesos 700 e 800); Inter para o texto corrido;
  Caveat só para anotações à mão no estilo caderno. Os arquivos estão em `marketing/instagram/fontes/`.
- **Estilos já usados (varie entre eles para a grade não ficar repetida):**
  - A, editorial claro: fundo creme, título grande em verde escuro com destaque sublinhado em dourado;
  - B, quiz escuro: fundo verde escuro com textura de pontos, alternativas em cartões brancos e a certa
    marcada em verde;
  - C, contagem dourada: fundo verde com número grande em dourado ("faltam N dias");
  - caderno pautado: linhas azuis, margem vermelha, fita adesiva e post-it, para resumos e o Cronograma;
  - "Caso para detetive": carrossel de questão com imagem, em que cada pista descarta um "suspeito".
- **Formatos:** feed 1080×1350 (retrato 4:5); stories 1080×1920 (deixe espaço livre para a figurinha de
  link ou de quiz). Margem interna de 80 px; texto mínimo de 28 px no feed.

## 3. Regras de conteúdo (não negociáveis)

1. Sem emoji, nem nas imagens nem nas legendas.
2. Não mencionar inteligência artificial nos posts. Esse assunto fica só nos Termos e no Sobre.
3. Não citar o número total de questões do acervo. O destaque é que são questões das provas oficiais,
   comentadas. O número só aparece na página de planos.
4. Não usar o nome de cursos preparatórios, apostilas, e-books ou concorrentes, nem imitar o visual
   deles. Não usar a sigla da sociedade de quadril: a prova se chama "Fellowship Quadril".
5. Não sugerir vínculo com SBOT, ENARE, SBCOC ou qualquer banca. Pode citar o nome das provas (TEOT,
   TARO...) para dizer de qual prova é a questão, nada além disso.
6. Não prometer aprovação nem resultado. Não inventar função que o site não tem; na dúvida, abra o site.
7. Tela de celular com dados de exemplo leva a nota "Tela ilustrativa".
8. Conteúdo médico: use o comentário da própria questão no site (`public/acervo/comentarios/<tema>.json`).
   Se estiver com `"conferido": false`, ou se a questão mostrar "Resposta pela bibliografia" (sem gabarito
   oficial), avise o dono do projeto para conferir antes de postar.
9. Não usar imagens de terceiros (fotos de livros, de cursos, de bancos de imagem sem licença). As imagens
   das questões que já estão em `public/imagens/` podem ser usadas.

## 4. Como produzir

**Codex (gera as imagens prontas):** cada post é um HTML com uma `<section id="...">` por imagem, no
mesmo padrão de `relancamento/posts.html`. Crie uma pasta nova em `marketing/instagram/` (por exemplo
`marketing/instagram/posts/2026-10-08-tema/`), escreva `post.html` e `LEGENDA.md` e gere os PNGs com:

```
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-08-tema/post.html
```

As imagens saem em `saida/`, ao lado do HTML (essa pasta não vai para o git). Abra cada PNG e confira
cortes, textos e acentos antes de entregar. Para telas reais do site, use `telas.mjs` como descrito no
README.

**ChatGPT (sem acesso ao repositório):** use-o para ideias, roteiro dos slides e legendas. Geradores de
imagem costumam errar texto, acentos e o símbolo. Se for gerar a arte no ChatGPT, mande as imagens da
identidade junto, peça "sem texto inventado, sem emoji, sem letra Q isolada" e confira letra por letra.
Para a arte final, prefira passar o roteiro ao Codex.

## 5. Tipos de post que funcionaram

- **Questão comentada (2 slides, estilo B):** slide 1 com a pergunta e as alternativas e o pedido "crave a
  letra nos comentários antes de arrastar"; slide 2 com a certa marcada, as erradas apagadas e um resumo
  de três a cinco linhas do que cai na prova.
- **Caso para detetive (7 slides):** veja o roteiro no README e os casos em `casos/`.
- **Resumo de caderno (carrossel):** um tema que cai muito, em até 6 slides, terminando com o convite
  para treinar. Exemplo: `resumos/01-supracondiliana/`.
- **Contagem até a prova (imagem única, estilo C):** "faltam N dias" e uma frase sobre o Cronograma.
- **Função do site (stories):** uma função por sequência (Revisão, Cronograma, Caderno de erros...), com
  a tela real e "Tela ilustrativa" quando houver dados de exemplo.

## 6. Legenda (modelo)

```
Frase de abertura curta, que provoca ou pergunta.

Duas ou três frases sobre o conteúdo do post, sem exagero e sem promessa.

Chamada: crave a letra nos comentários / salve para revisar / marque quem da sua residência precisa ver.

Mais questões comentadas: ortoquestoes.com.br   (ou "Link na bio")

#ortopedia #TEOT #TARO #residenciamedica + uma ou duas do tema
```

Exemplos reais estão em `relancamento/LEGENDAS.md` e no README (caso 02).

## 7. Antes de postar (checklist)

- [ ] Nome "Orto Questões" por extenso e símbolo original, sem Q isolado.
- [ ] Cores e fontes da identidade; estilo diferente do post anterior na grade.
- [ ] Sem emoji, sem IA, sem número total de questões, sem nome de curso, sem sigla da sociedade de quadril.
- [ ] Conteúdo médico conferido com o comentário do site; gabarito oficial ou aviso ao dono do projeto.
- [ ] "Faltam N dias" calculado no dia; preços e funções conferidos no site.
- [ ] "Tela ilustrativa" nas telas com dados de exemplo; espaço para a figurinha nos stories.
- [ ] Acentos, cortes e legibilidade conferidos no PNG final, na tela do celular.
