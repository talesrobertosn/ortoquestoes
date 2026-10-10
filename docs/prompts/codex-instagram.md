# Prompt para agentes externos (ChatGPT Codex): posts do Instagram do Orto Questões

Roteiro para outro agente fazer os posts exatamente como eles são feitos aqui. Siga na ordem.
Não pule etapa. Antes de tudo, leia as regras em
[docs/marketing/orientacoes.md](../marketing/orientacoes.md).

---

## O mais importante: como as imagens são feitas

**As imagens NÃO são geradas por IA de imagem.** Nada de imagem ultrarrealista, foto inventada,
ilustração gerada, render 3D ou desenho de anatomia.

Cada post é um arquivo **HTML com CSS** (texto, cores, caixas, fontes) que um script transforma em PNG:

- cada `<section id="...">` do HTML vira uma imagem;
- feed: 1080×1350; stories: 1080×1920;
- o visual vem de **tipografia e layout**: papel, jornal, receita, cartaz, cartas, caderno;
- a única imagem médica permitida é a **imagem real da questão** do acervo
  (`public/imagens/<tema>/<id>-N.jpeg`), quando a questão tem figura;
- o símbolo da marca já está pronto dentro de cada modelo (`<symbol id="sim">`): copie, não redesenhe.

Se você se pegar pensando em "gerar uma imagem", pare: o caminho é editar o HTML de um modelo.

---

## 1. Ler antes de começar

1. `docs/marketing/orientacoes.md` (público, horários, frequência, regras da marca).
2. `marketing/instagram/README.md` (regras permanentes no topo).
3. `marketing/instagram/estilos/ESTILOS.md` (o catálogo de estilos e quando cada um serve).
4. `marketing/instagram/estilos/historico.json` (o que foi postado e quando).
5. Um post pronto do estilo que você vai usar, com o `post.html` e a `LEGENDA.md`:
   - jornal: `marketing/instagram/posts/2026-10-07-diario-segond/`
   - receituário: `marketing/instagram/posts/2026-10-08-receita-fratura-exposta/`
   - cartaz de cinema (stories): `marketing/instagram/posts/2026-10-07-cartaz-triade-terrivel/`

---

## 2. Escolher o estilo

- Modelos prontos em `marketing/instagram/estilos/<estilo>/modelo.html`: `jornal`, `receita`,
  `cinema` (só stories), `radar-premium` (só stories), `cartas`, `plantao`, `ache-o-erro`, `linhas`,
  `stories`, `museu`, `gps` (feed) e `planta` (só stories). O Radar premium usa cartões translúcidos
  com cantos amplos, fundo verde-noite suave e uma varredura abstrata. **GPS e Planta andam em dupla no mesmo dia:** antes de usar,
  leia o passo a passo em `marketing/instagram/estilos/GPS-E-PLANTA.md`.
- **Não repita um estilo usado nos últimos 2 dias** (confira o `historico.json`, feed e stories).
- O feed e os stories do mesmo dia podem usar o mesmo estilo (teaser de manhã, resposta à noite).
- Estilo novo é bem-vindo, mas só com tipografia e layout (veja a seção 1).

---

## 3. Escolher a questão

1. Use uma questão **real** do acervo, de preferência do TEOT ou do TARO e de um tema diferente do
   post anterior. Para procurar:

```
python3 - <<'PY'
import json, re, glob
for f in sorted(glob.glob("public/acervo/temas/*.json")):
    for q in json.load(open(f))["questoes"]:
        if q.get("simulado") or not re.search("TEOT|TARO", q.get("prova") or ""): continue
        t = q["enunciado"] + " " + " ".join(a["texto"] for a in q["alternativas"])
        if re.search(r"PALAVRA-CHAVE", t, re.I):
            print(q["id"], q["prova"], q.get("ano"), q["gabarito"], len(q.get("imagens") or []))
            print("  ", q["enunciado"][:200])
PY
```

2. Leia o comentário da questão em `public/acervo/comentarios/<tema>.json` (mesmo id). **Todo
   conteúdo médico do post sai desse comentário.** Não invente número, mecanismo nem conduta.
3. Copie o enunciado, as alternativas e o gabarito **exatamente** como estão no acervo.
4. Boas questões para post: uma pegadinha clara, duas decisões (par 2 por 2), um epônimo famoso ou
   uma imagem marcante.

---

## 4. Montar o post

```
mkdir -p marketing/instagram/posts/AAAA-MM-DD-<slug>
cp marketing/instagram/estilos/<estilo>/modelo.html marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
```

Edite **só o conteúdo** (textos, a imagem da questão, os ids das seções). Mantenha o CSS e a
estrutura do modelo. Atualize o comentário do topo do HTML com a data, a questão (id, prova, ano,
gabarito) e o comando de gerar.

Estrutura que funciona no feed (5 slides):

1. **Capa:** gancho que não entrega a resposta.
2. **A questão como caiu:** enunciado e alternativas reais, com "Comente a sua letra antes de arrastar".
3. e 4. **A explicação em passos** (uma decisão por slide).
5. **A resposta:** a letra, por que as outras erram e uma frase "Para a prova". No rodapé,
   ortoquestoes.com.br.

Stories: o primeiro faz a pergunta e diz que a resposta sai no próximo story ou no post; o segundo
dá a resposta. **Sem figurinha nenhuma** (nem quiz, nem enquete, nem link) e sem retângulo reservado
para figurinha. Conteúdo importante entre 250 e 1700 px de altura (fora das barras do Instagram).

---

## 5. Gerar e conferir as imagens

```
npm ci                                    # se ainda não instalou
npx playwright install chromium           # só na primeira vez, se o gerador reclamar do navegador
node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
```

As imagens saem em `marketing/instagram/posts/AAAA-MM-DD-<slug>/saida/` (fora do git).
**Abra cada PNG e confira**: texto cortado ou fora da folha, sobreposição (carimbo em cima do texto),
espaço vazio demais, acentos, o contador 1/5, 2/5... Corrija no HTML e gere de novo até ficar limpo.

---

## 6. Legenda e registro

1. Crie `LEGENDA.md` na pasta do post, no formato dos posts anteriores:
   - ordem de publicação com horário (feed às 7h; story de resposta ao meio-dia ou às 19h);
   - a legenda do feed: gancho, o que a questão cobra, "comente a sua letra (A, B, C ou D)", "salve
     e mande para..." e uma chamada para o **perfil**, sem endereço do site e sem a palavra "link"
     ("Treine grátis: o caminho está no nosso perfil, @ortoquestoes"); no fim, **no máximo 5
     hashtags** (o Instagram recusa mais que isso);
   - conferência: id da questão, gabarito oficial e de onde veio o conteúdo.
2. Acrescente o post em `marketing/instagram/estilos/historico.json` (`data`, `estilo`, `post`).
3. Se criou um estilo novo e ele foi aprovado, registre em `ESTILOS.md` e copie o HTML para
   `marketing/instagram/estilos/<estilo>/modelo.html`.
4. Commit só da pasta do post, do `historico.json` (e do `ESTILOS.md`, se mudou).
5. Na resposta ao dono, mande as imagens e **a legenda do feed como texto** (no celular é mais fácil
   de copiar).

---

## Lista rápida do que NÃO fazer

- Gerar imagem com IA, foto realista, ilustração, 3D ou desenho de anatomia.
- Inventar conteúdo médico ou mudar enunciado, alternativas e gabarito.
- Figurinha de quiz, enquete ou link nos stories.
- Repetir o estilo dos últimos 2 dias; mais de 2 posts de feed por dia.
- Emoji; mencionar IA; citar o número total de questões; citar cursos preparatórios.
- Entregar sem abrir e conferir cada imagem.

---

## Pedido para colar no Codex

```
Siga à risca o roteiro docs/prompts/codex-instagram.md deste repositório.
Faça o post do Instagram para <data> de manhã: feed (5 slides) e 2 stories, no estilo que o roteiro
permitir (sem repetir os últimos 2 dias). Use uma questão real do TEOT ou do TARO <de tal tema, se quiser>.
Nada de imagem gerada por IA: só os modelos em HTML do repositório e o gerador gerar.mjs.
No fim, me mostre as imagens e a legenda do feed em texto.
```
