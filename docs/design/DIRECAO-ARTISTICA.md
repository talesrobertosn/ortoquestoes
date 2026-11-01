# Direção artística do OrtoQuestões

Guia único para quem cria arte ou mexe em telas: Claude, Codex (ChatGPT) ou qualquer pessoa. Este documento reúne o que
o Tales (dono do projeto) aprovou, recusou e pediu até 01/11/2026.

- **Prioridade:** em caso de dúvida, vale o pedido mais recente do Tales.
- **Leitura junto:** [DESIGN.md](../../DESIGN.md) (tokens de cor, tipografia e componentes),
  [PRODUCT.md](../../PRODUCT.md), [WORKFLOW.md](WORKFLOW.md), [OBJETOS-ANIMADOS.md](OBJETOS-ANIMADOS.md) e a skill de
  arte [.claude/skills/arte-hd2d/SKILL.md](../../.claude/skills/arte-hd2d/SKILL.md).

---

## 1. A ideia em uma frase

O site é um **mundo de RPG em pixel art HD-2D** (no estilo Octopath Traveler) em volta de uma **interface calma e
legível**.
- **A arte:** cenários, personagens, fogo e luz são o assunto e o encanto.
- **A interface:** texto, números, botões e listas precisam ser fáceis de ler e de usar.
- **Os dois papéis não se misturam:** a arte fica em molduras grandes (o topo das páginas e os quadros), e a interface,
  em superfícies claras e limpas.

As páginas formam uma jornada:

| Página | Lugar no mundo |
|---|---|
| Página inicial | Floresta com acampamento e fogueira, com o castelo ao fundo |
| Ranking | **Salão dos Cem**, dentro do castelo |
| Biblioteca de resumos | Salão de leitura do castelo |
| Menu | **Portal do Aventureiro** |
| Revisão | **Estufa da vila**: regar no dia certo o que você plantou |
| Caderno de erros | **Campo de treino** ao pé da muralha: o lugar da revanche |
| Favoritas | **Gabinete das relíquias**: o que vale guardar para rever |
| Telas de espera | O **Gato Aventureiro** vivendo cenas curtas |

## 2. Regras que nunca mudam

1. **Arte por código ou do Tales.** Os cenários e sprites saem de scripts Python (numpy + PIL) do repositório, com
   sementes fixas.
   - **Arte do Tales:** ele também cria personagens e cenários no PixelLab e autoriza o uso. Esses arquivos ficam no
     repositório junto do script que os trata.
   - **Sprites pelo ChatGPT (Tales, 01/11/2026: "o ChatGPT está fazendo sprite muito bem, dá para pedir com mais
     frequência"):** quando faltar personagem, pose ou folha de animação, escreva um prompt pronto para ele colar no
     ChatGPT (folha em grade fixa, fundo liso uniforme, sem texto, mesma linha de chão, objetos consistentes em todos
     os quadros) e peça que ele mande o arquivo numa mensagem só com ele. Depois, recorte, limpe e trate por script,
     como a arte do PixelLab.
   - **Nunca:** nada baixado da internet, nada de imagem de terceiros e nenhum personagem protegido.
2. **Proibido:**
   - emoji como arte;
   - símbolos religiosos (cruz, altar, imagem de igreja, monge encapuzado);
   - anatomia desenhada em CSS ou SVG;
   - texto em inglês na arte, como "1st/2nd/3rd" (os números vão em português, em HTML).
3. **Texto nunca é rasterizado.** Nomes, números e frases são HTML por cima da arte.
4. **Nada cobre o mascote, os bichos ou os balões de fala deles.** Também nada cobre texto ou botão. Quem se mexe
   (gato, coruja) confere se o lugar está livre antes de pousar.
5. **A tela começa limpa.** O extra (mapa, placar, atalhos) é opção visível para a pessoa ligar, nunca ligado de
   entrada.
6. **Toda funcionalidade continua.** Redesenho nunca tira botão, regra, número ou função.
7. **Brainstorm interno em todo pedido.** Decida e faça. Só devolva opções quando o Tales pedir "brainstorm"; nesse
   caso, apresente 3 ou 4 caminhos com uma recomendação e espere.
8. **Prints antes de entregar:**
   - celular (390 px) e computador (1440 px), claro e escuro;
   - larguras de 320 a 1920 sem rolagem lateral;
   - "menos movimento" sem animação.
9. **Qualidade antes de pressa.** "Se for fazer algo preguiçoso, melhor nem fazer." Itere olhando a imagem pelo
   menos de 4 a 6 rodadas.

## 3. O pipeline HD-2D (o "ray tracing" que o Tales pede)

Exemplos aprovados para imitar:
- `scripts/gerar_cena_inicio.py`: o acampamento. O Tales disse: "agora está do jeito que eu sempre quis".
- `scripts/cenarios/salao_cem.py`: o Salão dos Campeões do ranking, com pedestais ray-traced.
- `scripts/cenarios/escadaria_cem.py`: a escadaria do Tales, relida em luz dourada.
- `scripts/gerar_cena_salao.py`: o salão da Biblioteca.

Passo a passo:
1. **Pintar pequeno**, em pixel art de 480×270 ou 480×200, camada por camada (fundo, meio, objetos, frente).
   - Use de 3 a 7 tons por material, contorno de 1 px e texturas de pedra, madeira, tecido e metal.
   - Use sementes fixas.
2. **Ampliar 3×** e calcular a luz pixel a pixel:
   - luzes quentes pontuais (tochas, fogueira, velas), com queda em faixas;
   - sombras projetadas e oclusão de contato;
   - feixes volumétricos com poeira (sol entrando por janela ou vitral);
   - bloom e mapeamento de tom, sem estourar o branco;
   - altas luzes quentes e sombras frias, vinheta leve e grão;
   - profundidade de campo: fundo levemente desfocado e foco no meio.
3. **Composição para a interface:** o lado do texto (em geral os 40% da esquerda) fica calmo e mais escuro. O foco
   (personagens, luz forte) vai do centro para a direita.
4. **Exportar em WebP**, em 1440 px de largura e em 960 px para o celular, com qualidade de 82 a 85 e menos de
   ~230 KB / 120 KB.
   - Escreva também um `.json` com os pontos-âncora: onde ficam os pedestais, as tochas, os estandartes e a área de
     texto.
5. **Camadas extras quando houver personagem por cima:**
   - `*-luz.webp`: o feixe, aplicado com `mix-blend-mode: screen`, para iluminar o personagem também;
   - `*-frente.webp`: o que fica na frente do personagem.
6. **Celular:** defina o recorte que aparece no celular, por exemplo de x=196 a x=476 da arte. Tudo o que importa
   fica dentro dele.

**Pixels limpos:**
- Use `image-rendering: pixelated`, com escala inteira sempre que possível.
- Um sprite animado anda com `steps(N, jump-none)` para N quadros, nunca `steps(N-1)`.
- Ao extrair arte do PixelLab, recupere a grade original (em geral cada pixel ocupa 4×4 na imagem enviada) e limpe
  a franja clara do fundo.

## 4. Paleta

Base em [DESIGN.md](../../DESIGN.md). Para o mundo de jogo:

| Papel | Cor |
|---|---|
| Verde-floresta (identidade, progresso) | `#0C3C34` |
| Esmeralda | `#17675B` |
| Ouro quente (conquista, 1º lugar) | `#E4B85C`; tinta clara `#F0C46A` |
| Marfim (leitura) | `#F6F7F3`; tinta do vidro `#FFFAF0`, texto 2 `#E4D8BD` |
| Azul-noite (sombras, atmosfera) | `#171C30` |
| Bronze (3º lugar) | `#AE7854` |
| Prata (2º lugar) | prata com detalhes azuis frios (`#8FA3B5`) |
| Vidro escuro sobre a arte | `rgba(9, 13, 14, 0.74)` + `backdrop-filter: blur(10px)` |
| Pergaminho dos balões | `#FBF3DF`, tinta `#1B1208`, contorno de 2 px |

O Tales **recusou**:
- roxo dominante;
- visual de cassino;
- neon;
- castelo gótico escuro demais;
- borda dourada em tudo;
- filete grosso colorido na lateral ou no topo de cartão arredondado;
- gradiente decorativo na interface;
- texto com gradiente.

## 5. Personagens

### O mascote: o esqueletinho de armadura
- **Arquivos:** `scripts/gerar_mascote.py`, que gera `public/pixel/mascote/esqueleto.png`, e o componente
  `<Mascote />`.
- **Rosto aprovado (modelo E):** três-quartos para a esquerda, **sem boca nem dentes**, órbita grande com aro de osso.
- **Recusados:**
  - touca;
  - sorriso;
  - bochecha rosada;
  - versão vetorial "chapada";
  - rosto de frente com dentes.
- Em outubro, ele usa a fantasia de Halloween automaticamente.

### O gato laranja (mascote oficial, o **preguiçoso**)
- **Arquivos:** `scripts/gerar_gato_fofo.py`, que gera `public/pixel/mascote/gato-fofo.png` (64×48, 14 poses), e o
  componente `<GatoPixel estado="..." />`.
- **Visual:** chibi, cabeça grande, olhos verdes.
- **Cenas da espera:** `scripts/gerar_gato_cenas.py` → `gato-cenas.png`, com as 12 cenas e os 4 segredos do Gato
  Aventureiro.
- **Personalidade:** preguiçoso e engraçado. Quer dormir, fala de sono, repouso e preguiça.

### A coruja bibliotecária (a **sábia**)
- **Desenho:** do Tales, feito no PixelLab.
- **Arquivos:** `scripts/sprites/coruja_nova.py`, que gera `public/pixel/mascote/coruja-nova.png` (quadros de 44×32,
  5 por linha), e o componente `<CorujaPixel estado="..." />`.
- **Movimentos:** parada, andando, voando, pousando, lendo, dormindo, acenando e olhando.
- **Personalidade:** sábia. **Cada toque explica um conceito que cai na prova**, numa frase.

### Os cavaleiros do pódio (ranking)
- **Desenho:** do Tales (PixelLab), usado "100% igual". O Tales recusou os cavaleiros antigos do Torneio.
- **Arquivo:** `scripts/sprites/cem_cavaleiros.py` → `cavaleiros.png`, com quadros de 75×88 e os pés em (37, 84).
  - linhas 0 a 2: espera;
  - linhas 3 a 5: saudação.
- **As três cores:**
  - **1º:** o original, de penacho vermelho e ouro;
  - **2º:** penacho azul, prata e azul;
  - **3º:** penacho vinho, bronze e cobre.
- **Animação:**
  - espera: respiração de 1 px, penacho balançando e um brilho passando na armadura;
  - saudação: a espada sobe uma vez, só quando o líder muda de verdade.

## 6. Falas dos bichos

- **Onde ficam:** `src/componentes/mascote/falasBichos.ts`, um lugar só para todas as páginas.
- **`CONCEITOS_CORUJA`:** 40 conceitos que mais caem. Exemplos: Salter-Harris II, Garden, Gustilo IIIB/IIIC, Weber,
  Monteggia, sinal de Hawkins, Ponseti (CAVE), Ewing t(11;22), Mirels ≥ 9, síndrome compartimental.
  - Cada conceito tem uma frase curta e correta.
  - Ao acrescentar, confira o conteúdo médico.
- **`FALAS_GATO`:** cerca de 20 frases preguiçosas e engraçadas, por exemplo "Eu não durmo: faço revisão espaçada de
  sonecas.".
- **`proximaFala(chave, lista)`:** embaralha uma vez por sessão e não repete até passar por todas.
- **Comportamento:**
  - balão de pergaminho que some sozinho (coruja em uns 11 s, gato em uns 5 s) ou com um toque;
  - leitor de tela recebe o texto (`role="status"`).

## 7. Onde os bichos aparecem e como se comportam

| Lugar | Coruja | Gato |
|---|---|---|
| **Página inicial** (logado e sem conta, `CenaDiorama.tsx`) | Pousa no primeiro poleiro livre e à vista: placa de madeira, alto da barraca, lampião, arco de pedra ou caixotes. Muda de lugar se algo (texto, cartão, esqueleto, balão) passar a cobri-la. Na página sem conta, no computador, pousa na borda do cartão "Experimente agora". | Passeia pelos cantos do chão. Cada toque traz uma frase; no 6º toque seguido aparece com a tala ("Tala ok. Retorno em 3 semanas."). |
| **Menu** (`portal/Visitantes.tsx`) | Pousa logo ao abrir, em toda abertura, à esquerda do X. Cada toque explica um conceito; de vez em quando, uma dica do menu. | Aparece depois de 1 s parado, em toda abertura, no rodapé. Cada toque traz uma frase preguiçosa. |
| **Ranking** (`cem/SalaoCem.tsx`) | Um dos dois em toda visita (nunca os dois): no capitel do pilar, olhando o campeão. Toque: um conceito. | No chão perto da mata, dormindo. Toque: uma frase. |
| **Biblioteca** (`biblioteca/sala`) | No poleiro do salão. Toques: conceitos, com uma dica da Biblioteca e o convite para o tour a cada 4. | Os segredos da Biblioteca, como derrubar um livro. |
| **Espera** (`EsperaPixel`) | — | O Gato Aventureiro, que não segura o carregamento. |

**Regras gerais:**
- Celular e computador sempre.
- Com "menos movimento", ninguém voa nem anda.
- A animação pausa com a aba escondida ou fora da tela.
- Acessíveis (01/11/2026): na inicial e no Salão dos Cem, gato e coruja são botões de verdade ("Falar com o gato",
  "Falar com a coruja"), fora do `aria-hidden` da arte, com anel de foco claro (#ffe3a3) e alvo de toque de 44 px;
  no código vêm depois do texto e da ação principal. O resto da cena continua `aria-hidden`.
- A fala nunca cobre texto, botão, cavaleiro, esqueleto ou outro bicho: desliza, desce ou estreita; sem lugar livre
  (celular estreito), sai da vista e fica só para o leitor de tela.
- **Pausa na fogueira** (inicial): o próprio fogo é o botão ("Descansar na fogueira", `aria-pressed`). Luz âmbar,
  o esqueleto senta (`fogueira`), o gato ronrona e vem uma fala de `FALAS_PAUSA_FOGUEIRA` (originais; só uma
  piscadela de "fogueira de descanso"). Com a sequência zerada, o fogo continua apagado e a fala só convida. Acaba
  sozinha em 20 s ou com outro toque; não conta dia nem mexe na sequência.
- Halloween só em outubro (`fantasiaDoMes`, `epoca`): nada de teias, abóboras ou morcegos fixos nas artes do dia a
  dia (as teias do observatório, do gabinete do Atlas e da prateleira "Cap. 404" saíram em 01/11/2026). A Cripta e os
  monstros dos Flashcards são identidade, não sazonalidade.

## 8. Telas já no padrão (use como referência)

- **Página inicial:** cena HD-2D grande sem moldura, título branco sobre a cena, missão num vidro escuro à esquerda,
  chão da sequência com as tochas, barra branca de atalhos e o progresso numa superfície branca dividida por linhas
  finas.
- **Ranking, o Salão dos Cem:**
  - **topo:** o salão com título e relógio, a jornada no vidro escuro à esquerda e, no chão do salão, as placas do Top 3
    com as medalhas;
  - **barra branca:** abas, período, placar e Liga;
  - **Escadaria da Ascensão:** a arte do Tales;
  - **Classificação dos Cem:** cada pessoa num cartão branco suave, com 6 px de respiro, sobre fundo porcelana. No
    celular, a linha tem duas camadas: número e movimento à esquerda, nome e emblemas ao lado.
  - Os emblemas ficam grandes o bastante para ver o desenho: 30 a 36 px.
- **Menu (Portal do Aventureiro):** pop-up branco, busca universal, "Continue sua jornada", os seis atalhos sem fogo
  (01/11/2026) e os visitantes.
- **Biblioteca:** estante e lista, busca com sugestões, salão de leitura com a coruja e o gato.
- **Revisão, Caderno de erros e Favoritas (01/11/2026):** o mesmo topo pintado, `componentes/vila/TopoVila.tsx`
  (pontos de cada cena em `componentes/vila/cenas.ts`). A cena da hora do dia sai de `scripts/gerar_cena_estufa.py`,
  `scripts/gerar_cena_treino.py` e `scripts/gerar_cena_gabinete.py` (480 x 160, recorte do celular a partir de x 184).
  O título e o botão de cristal (a ação de começar) ficam sobre a parte calma; os números, em placas de latão na
  bancada logo abaixo. A coruja pousa num ponto firme (toque: conceito; a cada 4 toques, uma dica da página; pousada
  alto, o balão abre para baixo) e o gato fica no chão livre. Para uma página nova da vila, pinte a cena com o mesmo
  contrato e acrescente uma `CenaVila`.
- **Treinar (01/11/2026, "mesa de estudo leve"):** sem cena no topo; cabeçalho compacto, "Começar agora", os quatro
  passos numa superfície clara e o resumo; as cores são as da página inicial (tokens `--mundo-*` e o botão `.cristal`). Nem toda página tem cena: a matriz de onde a arte
  é protagonista, apoio ou fica de fora está em [TREINAR-MESA-LEVE.md](TREINAR-MESA-LEVE.md).

## 9. Arte enviada pelo Tales

- **Quando o Tales manda imagem:** ela precisa chegar como **arquivo**, numa mensagem só com ela. Imagens enviadas
  enquanto o assistente está no meio de uma resposta chegam só como visualização.
- **Pasta do Mac:** a pasta dele (`/Users/talesroberto/OrtoQuestoes-Biblioteca/imagens`) não é acessível pela sessão
  na nuvem. Peça o arquivo.
- **Ao usar:**
  1. Recupere a grade de pixels.
  2. Guarde a fonte limpa em `scripts/.../*-fonte.png`.
  3. Escreva um script que recorte, pinte as variações e monte a folha.
  4. Mostre a prancha e o GIF antes de integrar.
- **Fontes guardadas até agora:**
  - `scripts/sprites/cem/saudacao-base.png` (cavaleiro);
  - `scripts/sprites/cem/estandarte-fonte.png` (estandarte verde com ramo dourado);
  - `scripts/sprites/coruja/coruja-fonte.png`;
  - `scripts/cenarios/cem/escadaria-fonte.png`.

## 10. Verificação antes de publicar

- `npx tsc --noEmit -p .`, `npm test` e `npm run build`.
- Prints com `node scripts/capturar_telas.mjs <rota> <prefixo> --com-dados [--escuro] [--sem-conta] [--roteiro arq.mjs]`.
  - **Ranking:** cenários de teste com `RK_CENARIO`: lider, top3, top50, top100, fora100, empate, sem-historico, vazio,
    erro, excluido, poucos.
- **Publicação:**
  1. Abra um PR no ramo de trabalho, com base `claude/pdfs-questoes-tp64dr`.
  2. Espere o check "verificar" passar e faça o merge (squash).
  3. Publique só o que o Tales autorizou, sem misturar outras páginas.

## Cenários da página inicial (rodízio, 01/11/2026)

O topo da página inicial troca de cenário ao longo do dia (`src/componentes/inicio/cena/cenarios.ts`): o dia é
dividido em fatias iguais, uma por cenário (5 cenários, 4h48 cada), e a ordem anda um passo por dia, para cada
cenário aparecer de manhã, de tarde e de noite em dias diferentes. Para testar, `?cenario=forja` na URL ou
`sessionStorage['inicio:cenario']`.

| Cenário | Script | Partículas | Destaque |
|---|---|---|---|
| Acampamento | `scripts/gerar_cena_inicio.py` | vaga-lumes | a espada fincada na fogueira (easter egg, `scripts/sprites/espada_fogueira.py`) |
| Forja do ferreiro | `scripts/cenarios/inicio_forja.py` | faíscas | fornalha como luz principal, peças de ortopedia em ferro |
| Cais do lago | `scripts/cenarios/inicio_cais.py` | vaga-lumes | reflexo na água |
| Observatório da torre | `scripts/cenarios/inicio_observatorio.py` | estrelas | céu, via láctea e aurora |
| Refúgio da neve | `scripts/cenarios/inicio_neve.py` | neve | neve acesa pelo fogo e pelas janelas |

Contrato de todo cenário novo (arte 480 x 200, saída 1440 x 600 e 960 x 400 nas três horas):
- o fogo animado na caixa x 220-260, y 104-152 (a luz principal sai de 240,146), sem chama pintada;
- o esqueleto em pé em x 262-308 com os pés em y 163, chão aberto;
- o lado esquerdo (x < 190) calmo e escuro para o texto; no celular só aparece x 140-340;
- os pontos do gato (canto de cima à esquerda da caixa de 36 x 22) e da coruja (o ponto dos pés, sempre pousada em
  algo firme) ficam em `scripts/cenarios/cena-<id>.json` e são copiados para `cenarios.ts`.
Na cena, um bicho fala de cada vez, e o balão procura um lugar livre (se não couber perto, o gato anda até um canto
onde caiba).
