# Prompt para Claude Code — Flashcards HD-2D: o Arquivo da Vila

Tales autorizou redesenhar e implementar a central de Flashcards (`#/flashcards`) e as páginas irmãs (`#/flashcards/desempenho`, `#/flashcards/cronograma`). Trabalhe no repositório real e entregue a implementação pronta e verificada. Não reduza o escopo a um mockup ou a uma troca de cores.

A página precisa parecer do mesmo mundo da homepage autenticada, do Salão dos Cem e da Torre do Tempo do cronograma, e continuar sendo uma ferramenta de revisão clara, rápida e honesta.

O conceito central é **o Arquivo da Vila**: o prédio público de registros, ao lado da praça da torre do relógio, com o grande fichário de madeira onde ficam os flashcards de cada área. No fundo do salão, uma escada desce para a **Cripta do Residente** (o jogo). A cena dá identidade e diz "aqui se revisa". Os números de hoje, os atalhos de estudo e o botão principal continuam sendo a interface.

## 1. Leia antes de editar

**Documentos do projeto.** Abra `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/design/WORKFLOW.md`, `docs/design/OBJETOS-ANIMADOS.md` e `.claude/skills/arte-hd2d/SKILL.md`.

**Documentos de flashcards.** Leia `docs/flashcards/DECISOES.md` (a fonte de verdade, com as decisões datadas do Tales), `docs/flashcards/README.md`, `JORNADA-UNICA.md`, `CRONOGRAMA.md`, `RANKING.md`, `FILTRO-ASSUNTOS.md`, `ARTE.md` e `docs/design/ideias/2026-10-31-shadcn-hd2d/README.md` (ideia guardada: interface sem cor e toda a cor vindo da arte).

**Regra de arte.** A direção artística mais recente do Tales prevalece:
- cenário e objetos em pixel art HD-2D original, gerados por código ou desenhados pelo Tales;
- nada baixado da internet, nada de IA de imagem, emoji como arte, símbolo religioso, personagem protegido, anatomia em CSS/SVG ou texto rasterizado;
- nomes, números, datas e botões sempre em HTML.

**Implementação atual, para ler antes de mexer:**
- `src/paginas/Flashcards.tsx` (o roteador interno);
- `src/paginas/CentralFlashcards.tsx` (`CentralFlashcards`, `DesempenhoFlashcards`, `CronogramaFlashcards`, `JanelaOpiniao`, `Abas`, `AVISO_BETA`);
- `src/paginas/CronogramaFlashcards.tsx` (`usarCronograma`, `CartaoCronograma`, `Ajustes`, `resumoDeHoje`, `linkSessaoCronograma`);
- `src/paginas/RankingCripta.tsx`;
- `src/flashcards/` (`componentes/Entrada.tsx`, `Arena.tsx`, `Estudo.tsx`, `Cartao.tsx`, `FiltroAssuntos.tsx`, `ClimaEstudo.tsx`, `aprendizagem.ts`, `progresso.ts`, `cronograma.ts`, `servidor.ts`, `continuidade.ts`, `opiniao.ts`, `fundo.ts`);
- `src/estado/revisao.ts`;
- `src/estilos/paginas/CentralFlashcards.css`, `CronogramaFlashcards.css`, `FiltroFlashcards.css`, `BibliotecaEstudo.css`;
- `src/estilos/componentes/Flashcards.css` (o jogo).

Veja também como foram resolvidos cenário, camadas e texto em:
- `src/componentes/cronograma/CenaTorre.tsx` e `VisitaCronograma.tsx`;
- `src/estilos/paginas/CronogramaTorre.css`;
- `src/componentes/inicio/jornada/Jornada.tsx`;
- `src/componentes/cem/SalaoCem.tsx`;
- `src/estilos/paginas/InicioJornada.css`.

**Antes de começar:** confira o `git status` e os worktrees. Outros trabalhos podem estar em andamento: preserve alterações que não são suas e trabalhe num worktree próprio.

**Referências visuais locais, para olhar de verdade antes de desenhar:**
- `public/pixel/cronograma/torre-tempo-{manha,tarde,noite}.webp` e `torre-tempo-chao.webp`: a vila, a praça e a calçada que este prédio continua. Use o mesmo céu, as mesmas casas e a mesma luz. Script: `scripts/gerar_cena_cronograma.py`.
- `public/pixel/inicio/secao-biblioteca.webp` (`scripts/gerar_cena_biblioteca.py`): a escala das lombadas e da luz de vela que já foi aprovada.
- `public/pixel/inicio/cena-tarde.webp` e `public/ranking/cem/salao-fundo.webp`: profundidade, luz separada e texto legível.
- `public/flashcards/promo/capa-larga.png` e os cenários do jogo (`src/flashcards/efeitos/pintura.ts`): a identidade da Cripta, que precisa se reconhecer na escada do fundo.
- Capturas atuais: rode `scripts/capturar_telas.mjs /flashcards antes --com-dados` (com `CHROMIUM` apontando para o Chrome local), em 390 e 1440 px, claro e escuro, antes de mudar qualquer coisa.

## 2. Estado atual e problema concreto de UX

A central tem muita funcionalidade valiosa, e toda ela precisa continuar existindo:
- as abas Central, Meu desempenho e Meu cronograma;
- o topo com a frase pessoal (nome e até duas observações, nunca um número abaixo de 10);
- o botão "Estudar flashcards", com subtítulo que muda: "N revisões vencem hoje" / "Suas revisões de hoje" / "Biblioteca · estudo calmo";
- os atalhos "Jogar o Torneio" e "Seguir cronograma";
- o convite de opinião depois de 3 sessões;
- o painel "Revisões de hoje", com os 4 atalhos (Revisões de hoje, Errei, Hesitei, Nunca estudados) e o "Por assunto" ("Escolha a área", "Estudar 20", "Escolher um assunto específico");
- o cartão "Meu cronograma" (hoje, feito hoje, amanhã, previsão, "Seguir cronograma · faltam N", "Ver cronograma");
- "Como funciona" (3 passos);
- "Por onde seguir" (Estudo, Jogo, Progresso, Ranking dos flashcards);
- o aviso "Estamos construindo os próximos flashcards com você", com a janela de opinião.

**O problema concreto:**
1. **São cerca de 15 chamadas para poucos destinos.**
   - A Biblioteca aparece em 6 lugares (botão principal, 4 atalhos, "Estudar 20", "Escolher um assunto", cartão "Revisar flashcards").
   - O cronograma aparece em 4 lugares.
   - Há dois blocos de opinião na mesma página.
   - A pessoa não sabe qual é *a* ação de hoje.
2. **A mesma coisa tem seis nomes:** Torneio de Flashcards, Cripta do Residente, Batalha, "Biblioteca do Torneio", Biblioteca de Flashcards e Modo Estudo.
   - "Jogar o Torneio" vai para `/cripta`, enquanto "Entrar no Torneio" vai para `/entrada`.
3. **O "estudo calmo" abre dentro do pop-up do jogo**, com as abas "Batalha | Estudo", música e cenário. Um toque em "Batalha" começa a Cripta.
4. **Os prazos nos botões de avaliação só valem no primeiro degrau.**
   - "Hesitei · volta em 3 dias" e "Sabia · volta em 10 dias" não valem depois: os próximos degraus são 7/21/45 e 30/90/180 dias.
   - A nota do fim de sessão repete o mesmo erro.
5. **O visitante vê a central zerada**, e o clique cai em "Crie sua conta para ver **as questões**", sem falar de flashcards.
6. **Duas definições de "dominado"** (Biblioteca e Desempenho) podem dar percentuais diferentes.
7. **Erro de rede ao carregar o acervo não aparece.** Com rede ruim, os links diretos simplesmente não abrem a sessão.
8. **A página inicial promete "chaves, rodadas e o seu nome no topo"**, o que o jogo não tem (é um roguelike de andares com chefes).
9. **Código morto:** `src/flashcards/componentes/RankingCripta.tsx`, `CartaoCripta.tsx` (confirme se não tem uso), o comentário sobre a Torre em `Flashcards.tsx`.

Sem apagar nenhum recurso, torne a central focada:
- **uma** ação principal clara (a revisão de hoje, ou o cronograma quando o plano está ativo, sem disputar com a outra);
- os outros caminhos agrupados por intenção (revisar, escolher assunto, jogar, ver progresso);
- um nome só para cada coisa.

Proposta de nomes, para o Tales confirmar antes de trocar texto em massa:
- "Flashcards" fora do jogo;
- "Biblioteca" para o estudo;
- "Torneio de Flashcards" para o jogo, com "Cripta do Residente" como subtítulo dentro dele.

## 3. Direção de arte: o Arquivo da Vila

Crie **uma cena original nova para o topo da central** com Python + numpy/PIL e sementes fixas. Reaproveite os pincéis e a montagem de luz de `scripts/gerar_cena_vila.py`, como `scripts/gerar_cena_cronograma.py` faz (importando e ajustando `H`, as grades e o padrão do ruído; veja o comentário dele sobre o tamanho do ruído fixado na importação).

A referência externa é a **linguagem visual HD-2D de Octopath Traveler**: pixels nítidos, profundidade, luz volumétrica e materiais ricos. Jamais copie imagem, personagem, composição ou asset do jogo.

**Formato e entrega:**
- base de 480×200 pixels lógicos, ampliada 3× (1440 px), com versão de 960 px;
- variantes manhã, tarde e noite com a geometria idêntica entre elas;
- WebP de cerca de 200 KB ou menos;
- `srcSet`/`sizes`, `fetchPriority="high"` só na imagem do período em uso, dimensões explícitas.

**O lugar.** É o interior de um salão de arquivo cívico de pedra e madeira, com pé-direito alto, ao lado da praça. Nada de mosteiro, capela, vitral religioso, altar ou cruz: é um arquivo público, com balcão, fichários e estantes.

**Composição no palco 480×200** (ajuste depois de ver os recortes reais):
- **x 0-205:** a parede calma, com estantes ao fundo em baixo contraste e a janela grande por onde se vê a praça e, longe, a torre do relógio (continuidade com o cronograma). É onde ficam o título e a frase em HTML.
- **x ~230-400:** o objeto principal, **o grande fichário de madeira**.
  - Dezenas de gavetinhas com puxadores de latão e a plaquinha de cada gaveta **sem texto** (só a moldura).
  - Uma gaveta aberta, com as fichas (os flashcards) em pé, e algumas fichas soltas no balcão.
  - Uma lamparina pousada em cima, que é a luz quente principal.
  - O fichário precisa ler como "fichas de estudo" em 390 px.
- **x ~400-470:** no fundo à direita, **a escada que desce para a Cripta**: arco de pedra baixo, degraus que somem no escuro e uma luz fria azulada subindo (a mesma paleta noturna do jogo). É o convite discreto ao Torneio; não pode competir com o fichário.
- **Detalhes:**
  - escada de biblioteca encostada nas estantes, com degraus de madeira gastos;
  - lombadas de livros uma a uma (3 a 7 tons, como em `gerar_cena_biblioteca.py`);
  - mesa de leitura com pena e tinteiro;
  - poeira no feixe da janela, piso de tábuas com tapete gasto, teias discretas no canto alto.

**Luz por pixel, não por gradiente genérico:**
- **manhã:** feixe de sol entrando pela janela em diagonal até o balcão;
- **fim da tarde:** ocre e rosa lateral, com as sombras longas das estantes;
- **noite:** a lamparina do fichário e as velas na mesa quentes, o luar frio na janela e a luz azul da Cripta subindo da escada.

Calcule as sombras projetadas coerentes com cada fonte de luz. O latão dos puxadores e o vidro da lamparina recebem o ambiente da hora, com brilhos de 1 a 3 pixels e bloom moderado.

**Profundidade HD-2D em cinco distâncias:**
1. a praça vista pela janela (desfocada);
2. as estantes do fundo;
3. o fichário e o balcão em foco;
4. o piso e o tapete;
5. no primeiro plano, a borda de uma mesa ou uma pilha de livros sutilmente desfocada.

Paleta de sombras azul e verde, highlights âmbar, vinheta leve e grão delicado.

**Vida na cena.** Proponho três movimentos contidos:
- a chama da lamparina tremulando;
- a poeira no feixe (de dia) ou vaga-lumes e partículas azuis subindo da escada da Cripta (à noite);
- raramente, uma ficha que sai da gaveta aberta, gira e volta (sprite original recortado da cena com a luz da hora, como o sino da torre).

Tudo com `transform`/`opacity`, pausado fora da tela com `IntersectionObserver` e desligado com `prefers-reduced-motion`.

**Personagens.** A coruja bibliotecária (`CorujaPixel`) é a dona natural do Arquivo: pode estar pousada no alto do fichário, olhando. Use as falas de `CONCEITOS_CORUJA` com `proximaFala`. Antes de mostrar qualquer personagem ou balão, meça se o espaço está livre (como `VisitaCronograma` faz: retângulos de texto e controles); se não houver lugar, ele não aparece. Arte decorativa com `aria-hidden`; personagem interativo vira botão HTML nomeado.

**Easter egg** (o Tales pediu no cronograma e vale repetir aqui): de vez em quando o gato laranja (`GatoPixel`) dorme em cima de uma pilha de fichas ou senta num botão, e fala uma preguiça (`FALAS_GATO`) quando tocado. Só onde há espaço livre, nunca os dois bichos juntos.

Faça pelo menos **quatro rodadas honestas de inspeção e refinamento da arte**. Abra os WebPs em 100% e no recorte de 390 px. Procure:
- fichário sem volume ou que não lê como fichário;
- gavetas repetidas mecanicamente;
- luz sem causa;
- escada da Cripta forte demais;
- saturação excessiva;
- qualquer silhueta religiosa;
- choque com o vidro do texto.

Registre no resultado final o que foi refinado em cada rodada.

## 4. Estrutura da página e hierarquia

**O que o Tales aprovou no cronograma (31/10 e 01/11) e vale aqui também:**
1. A cena fica no topo, com o texto num vidro escuro do lado calmo da arte.
2. **Embaixo da cena, a página continua no mundo:** o piso do Arquivo (tábuas de madeira pintadas, ladrilho sem emenda, como `torre-tempo-chao.webp`), com luz quente e "ray tracing" (poças de luz da lamparina e das janelas, um feixe lento atravessando, as caixas projetando sombra no piso).
3. **As caixas de texto continuam brancas** no tema claro (e escuras no escuro), como na página inicial. Nada de caixas pretas.
4. **Formato redondo da página inicial:**
   - cartões de raio 20 e controles de raio 12;
   - selos e chips em pílula;
   - bordas finas e sombras macias, sem as sombras deslocadas "de bloco" (`5px 5px 0`) da temporada pixel.
5. Só os títulos que ficam direto sobre o piso ganham tinta clara com sombra.
6. Escope tudo numa classe da página (como `.cr--torre`), para não vazar para o jogo, a Revisão ou o cronograma de questões.

**Primeira dobra no computador (1440 px).** Topo com a cena ampla. No vidro:
- o selo "Flashcards";
- o título com a frase pessoal ("{Nome}, N revisões esperam por você", com a mesma regra de números de `mensagemPessoal`);
- uma linha do que é o produto (cartões tirados das questões comentadas das provas reais e dos OrtoQuestões Simulados, com revisão espaçada);
- **o botão principal**, que diz exatamente o que faz:
  - "Revisar agora · 37 flashcards · ~20 min" quando há revisões;
  - "Seguir cronograma · faltam N" quando o plano está ativo e as revisões já foram feitas;
  - "Começar pelos que mais caem" na primeira visita;
- um botão secundário de contorno ("Escolher assunto");
- o Torneio como link discreto, com a escada da Cripta da arte apontando para ele.

O fichário fica livre à direita. Logo abaixo, no piso, o painel "Hoje", que junta revisões e cronograma num lugar só.

**Primeira dobra no celular (390 e 320 px):**
- janela de arte curta (cerca de 190 a 230 px), com o fichário inteiro;
- texto e o botão principal logo abaixo, na mesma moldura;
- as abas Central / Desempenho / Cronograma numa linha só, com rolagem lateral e o item ativo visível (como `TrocaCronograma`);
- testar com a barra móvel e o aviso de cookies presentes;
- nunca gerar overflow horizontal.

**Painel "Hoje"** (substitui "Revisões de hoje" e o cartão "Meu cronograma", sem perder dado):
- uma frase do dia;
- os 4 grupos (Revisões de hoje, Errei, Hesitei, Nunca estudados) como linhas com número (fonte pixel, como os números da página inicial) e "Estudar →", com o estado vazio "Nada por aqui" e o carregando "…";
- a meta do cronograma (feito hoje / alvo, chips de assunto com a cor da área, "Amanhã", previsão "No ritmo de 20 por dia…", "Seguir cronograma · faltam N" / "Adiantar N do próximo dia", "Ver cronograma");
- "Por assunto" ("Escolha a área", "Estudar 20", "Escolher um assunto específico").

A cor da área vem de `coresAreas.ts` e sempre acompanha um rótulo.

**Depois do painel:**
- **"Por onde seguir":** Biblioteca, Torneio e Meu desempenho, cada um com o seu objeto pixel animado em vez de caixa de texto (por exemplo: o fichário abre ao passar o mouse, a escada solta uma faísca azul, o medidor enche). Inclui o link do ranking ("Ranking dos flashcards").
- **"Como funciona":** 3 passos, recolhível depois da primeira visita.
- **Opinião:** um bloco só (o convite depois de 3 sessões substitui o aviso fixo enquanto estiver visível), com a mesma `JanelaOpiniao` e os mesmos campos.

Toda função e informação continua alcançável em no máximo um clique ou expansão clara, e nada fica invisível só por hover.

**Meu desempenho e Meu cronograma** recebem o mesmo piso, as caixas brancas redondas e um topo curto (a mesma cena numa faixa baixa, com a lamparina à vista, como o formulário do cronograma), sem gastar uma dobra antes do conteúdo. Preserve:
- números, chips de 7, 30 e 90 dias, gráfico empilhado, "Como você se avaliou", "Pontos fracos" com "Treinar", "Por área";
- trilho, "Hoje", "Esta semana", a fila dos assuntos, "Ajustar o plano" (10, 20, 30, 50, 80 ou Outro; dias com meta; assuntos; data da prova) e o aviso de que o plano fica neste aparelho.

**O jogo (Entrada, Cripta, Biblioteca) não é escopo de redesenho aqui.** Mexa nele só para:
- alinhar nomes (depois do OK do Tales);
- corrigir os prazos dos botões de avaliação (veja a seção 6);
- avaliar, com o Tales, se o estudo calmo pode abrir fora do pop-up do jogo.

Se propuser essa última mudança, faça um protótipo e capturas, e espere o OK antes de mudar a rota.

## 5. Estados de produto que precisam funcionar

**Assinante:**
- primeira visita (tudo zerado exceto "Nunca estudados"; plano sugerido; "A barra começa no primeiro flashcard");
- com revisões pendentes (1 a 9 e 10 ou mais, com as regras de texto diferentes);
- sem pendentes ("Nada vence hoje…");
- meta do cronograma pendente, feita e folga;
- plano concluído;
- carregando (o acervo usa o `BARALHO_DEMO` enquanto isso);
- **erro de rede ao carregar o acervo**: hoje é silencioso; crie um estado visível e gentil, com "Tentar de novo";
- convite de opinião ativo.

**Não assinante:**
- o limite grátis (10 flashcards a cada 24 h na Biblioteca; 1 vida a cada 24 h na Cripta) é do servidor (`paywall_ativo`, `VITE_FLASHCARDS_LIMITE`); não mude regra, preço nem limite;
- a mensagem de limite e o "Ver os planos" continuam iguais;
- a regra da Cripta "não aparece escrita no site" por decisão do Tales (comentário em `servidor.ts`): não a escreva sem perguntar.

**Visitante sem conta:**
- a central abre e convida;
- os destinos do jogo mostram `ExigeConta`; proponha um texto específico de flashcards ("Crie sua conta para treinar flashcards…") sem mexer no componente compartilhado das questões (passe o texto por propriedade).

**Tema claro e escuro × manhã/tarde/noite:** são independentes (`estado/aparencia.ts` para a cena e `estado/tema.ts` para a interface).

## 6. Regras funcionais que não podem mudar

O motor não muda:
- `registrarEstudo`, `INTERVALOS` (`chute` [1, 3, 7, 14], `duvida` [3, 7, 21, 45], `seguro` [10, 30, 90, 180]);
- a ordem da fila (errados → pendentes → nunca vistos → resto);
- a seleção da Cripta (jornada única: acertadas, maior acerto da turma, erradas, novas);
- o cronograma de flashcards (20 novos por dia, segunda a sábado, revisões antes dos novos, teto de 60, 30 s por flashcard);
- a sincronização (`sincronizarProgresso`, `continuidade.ts`), os limites e o ranking pelo maior andar.

Não invente outro contador, não compute números em CSS e não grave nada no exemplo do visitante.

**A correção que é permitida e necessária: o texto dos prazos.** "Hesitei · volta em 3 dias" e "Sabia · volta em 10 dias" devem mostrar o prazo real do degrau daquele cartão (calcule com `proximoRegistro`/`INTERVALOS` para o registro atual), por exemplo "Sabia · volta em 30 dias". A nota do fim de sessão também deve ficar verdadeira ("cada um volta no prazo do próprio degrau"). Cubra com teste.

**Uma definição só de "dominado"** para o que aparece na tela: escolha com o Tales qual vale e use a mesma na Biblioteca e no Desempenho, sem mudar a regra da revisão.

**Consumidores compartilhados a proteger:**
- `AtalhoFlashcards`, `FlashcardsDeHoje` (Revisão), `QuadroFlashcards` (página inicial), `LeitorResumo` (ligação com os resumos), `SecaoFlashcards` (planos);
- o item "Flashcards" do cronograma de questões e o ranking (`RankingCripta.tsx`, `AbasRanking`).

Escope os seletores. Reuse componentes e helpers reais. Não adicione pacotes. Não use ícone em emoji.

Remova o código morto confirmado (`src/flashcards/componentes/RankingCripta.tsx` e o que mais o inventário apontar), com `rg` antes de apagar.

## 7. Movimento, desempenho e acessibilidade

**Animações e carregamento:**
- animações leves, só com `transform`/`opacity`;
- `prefers-reduced-motion` desliga tudo o que não é essencial, inclusive o feixe do piso e as poças que respiram;
- pausar fora da tela; nada de timer por segundo nem vários `ResizeObserver` permanentes;
- carregar só a cena do período em uso; o piso é um ladrilho pequeno (menos de 30 KB);
- layout estável, com dimensões nas imagens.

**Acessibilidade:**
- contraste nos dois temas;
- foco visível; Tab, Enter, Espaço e Escape na `JanelaOpiniao`;
- `aria-live` só para o que importa (um balão que a pessoa pediu, o resultado de "Tentar de novo");
- alvos de 44 px, zoom de 200%, 320 px, texto longo;
- a arte nunca intercepta clique, rolagem ou foco.

**Visual:**
- use `--porcelana`, `--superficie`, `--grafite`, `--verdete`, ouro e os tokens reais de `tokens.css`;
- o dourado sinaliza CTA, marco e celebração, não cada borda;
- não troque rótulos por terminologia de RPG fora do jogo: o mundo está na pintura, o estudo nas palavras.

**Armadilha conhecida (aconteceu no cronograma).** A regra `.empilha-2 > * + * { margin-top }` empurra qualquer camada absoluta que seja filha direta (`inset: 0`). Zere a margem dessas camadas e meça a posição dos personagens de novo quando a página assentar ou rolar.

## 8. Plano de execução obrigatório

1. **Inventário.** Faça o inventário de controles, links, números e estados das três páginas (há um inventário de 01/11/2026 na conversa que originou este prompt; confira contra o código atual). Monte uma checklist curta antes de editar e use-a depois de implementar.
2. **Arte.** Construa a arte num script reproduzível (`scripts/gerar_cena_flashcards.py`):
   - manhã, tarde e noite em 960 e 1440 px;
   - o piso do Arquivo (ladrilho);
   - o sprite da ficha que gira, se usado.

   Examine cada arquivo em tamanho real e no recorte de 390 px e refine de 4 a 6 vezes. Documente o comando de regeneração na skill de arte.
3. **Topo e painel.** Implemente o topo, o painel "Hoje" e a hierarquia nova. Preserve os handlers, as rotas, os parâmetros (`?categoria=`, `?area=`, `?assunto=`, `?n=`, `?opiniao=`) e as chaves de armazenamento.
4. **Piso e caixas.** Aplique o piso, as caixas brancas redondas e a luz em Desempenho e Cronograma.
5. **Correções.** Corrija os prazos dos botões de avaliação, o estado de erro de rede e o texto do visitante, e remova o código morto. Os nomes e o "dominado" só mudam depois do OK do Tales.
6. **Capturas reais da interface nova.**
   - Em 390×844 e 1440×900, claro e escuro, manhã, tarde e noite, nos estados: primeira visita, com revisões, sem revisões, meta feita, erro de rede, visitante e não assinante.
   - Confira também 320, 360, 430, 768, 1024 e 1920 px quanto a overflow, recorte do fichário e dos bichos, sobreposição, legibilidade e botões (no cronograma, o título quebrava em 1024 px).
   - Compare lado a lado com a homepage e com o cronograma.
7. **Testes.** Rode `npm run build`, `npm test` e os testes de flashcards (`testar_aprendizagem`, `testar_cronograma_sequencia_flashcards`, `testar_filtro_flashcards`, `testar_continuidade_flashcards`, `e2e_filtro_flashcards` se o ambiente permitir) e crie um teste para a central e para os prazos dos botões. Faça a inspeção manual de teclado e de movimento reduzido. Não marque como feito o que não executou.
8. **Entrega.** Resumo claro com:
   - o que mudou na arte (e as rodadas de refinamento) e na UX;
   - a checklist de funções preservadas;
   - arquivos e scripts;
   - capturas com o caminho;
   - testes e resultados;
   - limitações e pendências.

   **Não publique sem o "pode subir" do Tales.**

## 9. Critérios de aceite

- A primeira dobra diz o que revisar hoje, quanto falta e qual é a única ação principal.
- O Arquivo da Vila é reconhecível como parte do mundo Orto Questões (a torre do relógio vista pela janela, a mesma luz) em 390 e 1440 px.
- O piso continua a cena embaixo, com as caixas brancas redondas como na página inicial.
- Todo controle anterior foi localizado e funciona. As rotas e os parâmetros abrem as mesmas sessões. O limite, o paywall, a sincronização e o ranking se comportam como antes.
- Os prazos dos botões de avaliação mostram a verdade.
- O erro de rede aparece com "Tentar de novo".
- Nenhum texto ou número foi pintado nos WebPs. Sem emoji, símbolo religioso, imagem externa ou anatomia vetorial.
- Tema claro/escuro e movimento reduzido passam.
- Nenhuma regressão na Revisão, na página inicial, nos resumos, nos planos, no ranking ou no jogo.
- A arte foi inspecionada e refinada em várias rodadas. As capturas da interface e os testes sustentam a entrega.
- Se houver tensão entre uma ideia visual e uma regra do produto, preserve a regra e ajuste a arte.
