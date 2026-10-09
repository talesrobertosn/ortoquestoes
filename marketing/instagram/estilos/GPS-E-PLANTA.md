# Modelos GPS do nervo (feed) e Planta de engenharia (stories)

Aprovados pelo dono em 09/10/2026 ("ficou bem bonito"). Funcionam em **dupla, no mesmo dia e no
mesmo tema**: o feed segue um ramo do nervo e os stories seguem o outro, um chamando o outro. Os dois
fazem papel de **propaganda**: além de ensinar, convidam a criar conta grátis.

Modelos completos (copie e troque só o conteúdo, nunca o visual):

- Feed: `estilos/gps/modelo.html` (exemplo publicado: `posts/2026-10-10-gps-interosseo-posterior/`)
- Stories: `estilos/planta/modelo.html` (exemplo publicado: `posts/2026-10-10-planta-ramo-superficial/`)

```
node marketing/instagram/estilos/sortear.mjs criar gps <slug>      # feed
node marketing/instagram/estilos/sortear.mjs criar planta <slug>   # stories
node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
```

## Como escolher as questões

1. **Feed (GPS):** uma questão **oficial** do TEOT ou do TARO sobre **trajeto**: nervo, artéria,
   tendão, via de acesso ou ponto de compressão. Melhor se tiver imagem (vira a "câmera ao vivo do
   trecho"). Exemplos de bons temas: nervo radial e interósseo posterior, ulnar no cotovelo e no
   punho (Guyon), mediano (pronador, túnel do carpo), axilar no espaço quadrangular, ciático nas vias
   do quadril, fibular comum no joelho.
2. **Stories (Planta):** uma questão dos **OrtoQuestões Simulados** (campo `sim` no índice), de
   preferência de **anatomia**, sobre a **mesma região** do feed. As imagens dos Simulados de
   anatomia são do dono (redesenhadas) e podem ser usadas.
3. Conferir `marketing/instagram/publicadas.md` e buscar o id em `posts/`: **não repetir questão**.
4. Todo conteúdo médico sai do comentário da questão (`public/acervo/comentarios/<tema>.json`).
   Enunciado, alternativas e gabarito copiados exatamente.

## Feed GPS: os 6 slides (1080x1350)

O visual imita um aplicativo de navegação **genérico** (sem marca real): mapa escuro só com ruas
(feito em CSS, já pronto no modelo), linha azul da rota, faixa **verde** de instrução no topo e uma
**folha branca** no rodapé.

1. **Capa** (`p1-capa`): faixa "Iniciando rota · Siga pelo nervo X"; título grande "A banca quer
   saber onde o nervo está. Ative o GPS."; rota azul com pino vermelho no fim; folha com a prova e o
   ano ("TEOT 2023 · acesso de Thompson") e "Arraste para começar a rota". O pino não pode encostar
   no título.
2. **Questão** (`p2-questao`): a imagem da prova num quadro "Câmera ao vivo do trecho" (ou, sem
   imagem, só o cartão); enunciado e as 4 alternativas; "Comente a sua letra antes de seguir a rota".
3. **Rota completa** (`p3-rota`): faixa verde com a manobra-chave ("Em 200 m · Pegue a saída do ramo
   profundo") e uma lista de 4 a 6 trechos, cada um com ícone de seta (frente, saída, túnel, curva,
   bandeira de chegada) e uma frase curta tirada do comentário. O último trecho (chegada) fica com
   fundo verde-claro.
4. **Você chegou** (`p4-chegou`): bandeira verde, "Você chegou: <resposta>", "RESPOSTA C" e, na
   folha, o porquê em 2 ou 3 frases.
5. **Outras rotas** (`p5-erradas`): "As outras rotas levam para longe"; um cartão por alternativa
   errada, com a letra em vermelho e um apelido de trânsito ("outra avenida", "a outra saída",
   "outro bairro"); na folha, "Rota recalculada" com o gancho para os stories.
6. **Prova e chamada** (`p6-prova`): cartão amarelo "Acidente no trecho: se lesar" (o que acontece
   clinicamente), cartão verde "Para a prova" (uma frase) e, na folha, **"Crie sua conta no Orto
   Questões"** em letra grande, citando a engenharia reversa e os Simulados.

## Stories Planta: os 3 stories (1080x1920)

Fundo azul de planta técnica com grade (já pronto no modelo), letras brancas e destaques em
**dourado** (`#f4cf7c`). Nada importante nos 210 px de cima nem nos 300 px de baixo.

1. **Engenharia** (`s1-engenharia`): **"ENGENHARIA REVERSA" gigante** (150 px, "REVERSA" em dourado);
   faixa com borda dourada: "Questões autorais no **padrão da prova original**"; os 3 passos (Lemos a
   prova / Desmontamos / Montamos de novo); nota manuscrita "Agora com <assunto>. Teste no próximo
   story."
2. **Questão** (`s2-questao`): título grande "<Assunto> no **padrão TEOT**"; a imagem numa prancha
   branca com cota lateral ("VISTA ANTERIOR"); enunciado e alternativas em caixas tracejadas; nota
   "A resposta está no próximo story".
3. **Resposta e chamada** (`s3-resposta`): cartão claro com a resposta e o porquê; chamada gigante
   "Treine <assunto> para o TEOT **com o Orto Questões**"; **botão dourado "Crie sua conta
   grátis"**; "Conheça a plataforma: ortoquestoes.com.br"; nota com o gancho para o feed.

**A pessoa precisa entender a propaganda só batendo o olho:** engenharia reversa, padrão da prova,
crie sua conta grátis. Esses textos são sempre os maiores da tela.

## Regras que valem aqui (e onde agentes externos costumam errar)

- **Nada de imagem gerada por IA** (ultrarrealista, foto, 3D, ilustração). Tudo é HTML e CSS a partir
  do modelo. O mapa do GPS é abstrato (ruas), **nunca um desenho de anatomia**; a única anatomia é a
  imagem real da questão.
- Não inventar conteúdo médico; não trocar o gabarito; não citar o número total de questões; sem
  emoji; sem mencionar IA; nome por extenso "Orto Questões"; stories sem figurinha nem link (o site
  vai escrito).
- Não redesenhar o modelo: copiar o `modelo.html`, trocar os textos e a imagem, gerar, **abrir os PNGs
  e conferir** se nada encosta ou sai da tela antes de entregar.
- Legenda do feed: **no máximo 5 hashtags** e **sem endereço do site nem a palavra "link"**; a chamada
  leva para o perfil ("Treine grátis: o caminho está no nosso perfil, @ortoquestoes").
- Ao entregar: a legenda do feed como texto, os PNGs, e anotar no `estilos/historico.json` e no
  `publicadas.md`.
