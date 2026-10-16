# Plano de ideias: Flashcards e Cripta do Residente

Este é o caderno de ideias do jogo. Ele serve ao Tales e a qualquer agente de IA
(Claude Code, Codex, ChatGPT ou outro).

**Como usar:**
- marque `[x]` no que ficou pronto e diga em que PR entrou;
- acrescente ideias novas no fim da seção certa, com número novo (nunca reaproveite números);
- se uma ideia for descartada, escreva ~~riscado~~ e o motivo;
- o estado detalhado do código está em [flashcards/CONTINUAR.md](flashcards/CONTINUAR.md).

**Ordem de prioridade do Tales:**
1. Visual e experiência acima de tudo.
2. Referência principal de arte e música: **Stardew Valley** (pixel art quente, cenários felizes).
3. Arte só autoral: nada gerado por IA, baixado ou copiado.
4. Não mexer em questões, gabaritos, comentários, assinaturas, limites nem dados de usuários.

Legenda: `[x]` feito · `[~]` em andamento · `[ ]` a fazer · (T) depende do Tales

---

## A. Golpes e efeitos de combate

1. [x] Golpe do herói em pixel art (lâmina de energia), com a cor mudando pelo combo: azul, ouro, fogo e arcano no golpe duplo.
2. [x] Crítico do herói: a espada gigante em pixel art cruza a tela na diagonal e rasga o ar (tela escurece, pausa de impacto, corte em X).
3. [x] Cada vilão com golpe comum e golpe crítico próprios (`src/flashcards/efeitos/ataques.ts`).
4. [x] Investida no crítico: o vilão cresce, vem até o meio da tela e bate; o terremoto sacode a arena.
5. [x] Golem: no comum, pedra girando; no crítico, um pedregulho musgoso cai do céu e racha o chão (rachadura, poeira, onda de choque).
6. [x] Serpente: no comum, cusparada de veneno; no crítico, o bote (duas presas descem) e uma nuvem tóxica com caveirinha.
7. [x] Mímico: no crítico, a tampa do baú com dentes fecha na tela inteira.
8. [x] Dragão: no comum, bola de fogo; no crítico e no golpe carregado, um sopro de chamas em pixel art atravessa a arena (fátuo, escarlate e ancestral).
9. [x] Gosma: no crítico, a gosma escorre do alto da tela.
10. [x] Raptor, corvo e aranha: no crítico, rasgos gigantes de garra; guardião e esqueleto: pancada que racha o chão.
11. [x] 47 tiras de efeito pintadas por `scripts/sprites/vfx.py` (prévias em `docs/flashcards/conceitos/vfx-previa-*.png`).
12. [x] Golpe do herói muda com o estágio: a partir do estágio 4, a lâmina é de ouro.
13. [x] Efeito de bloqueio do escudo em pixel art (hoje ainda usa o projétil antigo).
14. [x] Efeitos de cura em pixel art (corações subindo) também na Batalha, não só no veneno.
15. [x] Golpe final: o vilão derrubado some num "puf" de fumaça em pixel art, com estrelas, maior no chefe.
16. [x] Número de dano em fonte pixel (bitmap própria), com quique e contorno.
17. [x] Som próprio para cada golpe novo (14/10): `espada-gigante`, `mandibula`, `pedregulho` e o `sopro` com crepitar, em `efeitos/sons.ts`, tocados por `ataques.ts` e pela Arena.
18. [x] Variante do pedregulho por golem: cristal, obsidiana, rubro e cimento.

## B. Superpoderes dos vilões (mecânica)

19. [x] **Envenenado** (serpentes, aranha, leviatã): cada flashcard arde até o herói acertar 5 seguidos; um erro recomeça a conta; o veneno nunca derruba. Há testes no motor.
20. [x] **Em chamas** (dragões): depois do Sopro, 3 flashcards com dano leve; um acerto difícil apaga o fogo (testes no motor).
21. [x] **Grude** (gosmas): depois de acertar o herói, o próximo erro dói 50% a mais (aparece na intenção); um acerto desgruda.
22. [x] **Tremor** (golem): o crítico tira 1 carga de um poder equipado (ele cai da mochila).
23. [x] **Hipnose** (basilisco): embaralha a ordem das alternativas uma vez (só visual, sem mudar o gabarito).
24. [x] **Roubo** (mímico): mantém o roubo de carga de poder; energia voa do poder para o baú. Correção aprovada pelo Tales em 14/10: não rouba ouro.
25. [x] Mostrar o superpoder na placa do vilão: Picada venenosa, Sopro que queima, Grude e Tremor, com explicação ao passar o mouse.

## C. Biblioteca (estudo passivo, mais divertido)

Pedido do Tales em 14/10: mudar o humor da fase conforme a pessoa acerta ou erra.

26. [x] **Nome em chamas:** 3 seguidas acende fogo laranja; 6, fogo azul; 9, chama arcana.
27. [x] **Glória:** com 20 seguidas, tudo brilha em ouro (raios de luz, cintilas, moldura dourada).
28. [x] **Chuva:** 3 erros seguidos fazem chover, com um aviso explicando o motivo.
29. [x] **Tempestade:** 5 ou mais erros seguidos escurecem a tela, trazem relâmpagos e trovão. Mensagem calma: "leia o verso sem pressa".
30. [x] **Névoa da dúvida:** 3 "Hesitei" seguidos, ou mais de 30 s sem virar o flashcard.
31. [x] **Arco-íris:** o primeiro acerto depois da chuva.
32. [x] Velas da sessão: uma acende a cada "Sabia" (10 por fileira, com contador ×N).
33. [x] Gato da Biblioteca em pixel art: dorme com Zzz, acorda quando você acerta e fica feliz (rabo em pé e coração) com o fogo azul e na glória.
34. [x] Livros que voam para a estante a cada flashcard dominado.
35. [x] Página de "diário da sessão" no fim: clima de cada trecho, melhor sequência, área mais forte.
36. [ ] Selos colecionáveis da Biblioteca: primeira glória, 100 flashcards na semana, sem tempestade.
37. [x] Modo "Leitura tranquila": chuva calma de fundo de propósito, para quem gosta de estudar com chuva.
38. [x] Música da Biblioteca que muda de camada com o humor (chuva abafa, glória abre um coral).
39. [x] Pequenos fantasmas leitores que passam ao fundo quando o estudo passa de 15 min (sem assustar).
40. [x] Estações do ano na Biblioteca conforme o mês (folhas no outono, neve em julho).

## D. Cenários (mais felizes, estilo Stardew Valley)

41. [x] Floresta verdejante (fase do golem) com céu, montanhas nevadas, pinheiros e flores.
42. [x] **Andar a céu aberto dentro da cripta** (como em Sword Art Online): uma porta leva a um bosque com céu azul, lago e borboletas.
43. [x] Vilarejo de pedra e madeira, com trilha, árvore grande e cerca (referência enviada pelo Tales).
44. [x] Ruínas de templo na floresta, com ponte de madeira e água.
45. [x] Vila vista de cima, com hortas, caminhos de pedra e rio.
46. [x] Campo florido ao pôr do sol (andar de descanso).
47. [x] Praia com farol (andar secreto).
48. [x] Jardim dos curandeiros: estufa de vidro com plantas medicinais.
49. [x] Ciclo de dia e noite no andar a céu aberto.
50. [x] Animais vivos nos cenários: pássaros, coelhos, peixes pulando no lago e vaga-lumes à noite.
51. [x] Pintura dos cenários atualmente usados pelo jogo. Biomas apenas propostos para o futuro: Deserto das Dunas Douradas (substitui o antigo tema com ossos), pântano da necrose, observatório e fortaleza das placas. O **Salão do Trono** ficou pronto em 14/10 (`scripts/cenarios/salao.py`): colunas de capitel dourado, vitral redondo com feixes coloridos, tapete vermelho até o trono, estandartes e cortinas. A **Caverna dos Cristais** também (`scripts/cenarios/caverna.py`): rocha em névoa azul, cristais violeta e ciano, lago subterrâneo, cogumelos luminosos e a fenda de luz. E o **Laboratório do Alquimista** (`scripts/cenarios/laboratorio.py`): prateleiras de frascos, caldeirão verde, alambique, esfera armilar de latão e o negatoscópio com o molde de uma placa e parafusos (só o implante, sem anatomia). E a **Catacumba das Velas** (`scripts/cenarios/catacumba.py`): portão de ferro com luz verde, sarcófagos de pedra, urnas, velas, teias e névoa, sem ossos nem caveiras. E o **Templo do Sol** (`scripts/cenarios/templo.py`): teto aberto para o céu, disco solar esculpido, colunas com hera, espelho d'água com lótus e peixinhos e braseiros. E a **Passarela das Nuvens** (`scripts/cenarios/passarela.py`): ponte de pedra sobre um mar de nuvens, montanhas nevadas, torre com bandeira e lanternas. E a **Forja dos Implantes** (`scripts/cenarios/forja.py`): fornalha de tijolo com coifa, bigorna com uma placa de osteossíntese em brasa, parede de ferramentas, prateleira de placas e parafusos, barril fumegando e fagulhas. E o **Coliseu da Consolidação** (`scripts/cenarios/coliseu.py`): arquibancada em arcos ao entardecer com o público em pontinhos de cor, toldo listrado, portão com grade, tochas, escudos de bronze e a areia com o círculo de luta. Concluídos também treino (Pátio dos Estandartes), arquivo (Arquivo dos Mapas) e torre (Terraço do Horizonte), com quatro camadas nos dois formatos. Detalhes e revisão: [cenários pendentes](flashcards/CENARIOS-PENDENTES-14-10.md). PR draft [#247](https://github.com/talesrobertosn/ortoquestoes/pull/247), a revisar.

## E. Vilões novos (o Tales manda o estilo antes)

52. [x] (T) Referências do Tales recebidas em 14/10 e descritas em [flashcards/MONSTROS-NOVOS.md](flashcards/MONSTROS-NOVOS.md), com o estilo de cada família e a receita.
53. [x] Folha nova para o raptor (15/10): `scripts/sprites/raptor.py`, com as variantes sombrio e alfa, no estilo detalhado das folhas novas (goblin, aranha). No mesmo dia ganharam folha o corvo, o morcego, o escaravelho, o Slime Sinovial e os três cavaleiros (Tala, Fíbula, Artrodese).
54. [x] Variantes escarlate e ancestral do Dragão (15/10): `VARIANTES` em `scripts/sprites/dragao.py`, folhas `dragao-escarlate` (Dragão Rubro da Artrose) e `dragao-ancestral` (andar 100 da Torre). O jogo já pegava a folha `<arquétipo>-<variante>` sozinho.
55. [x] Cogumelo saltitante: o **Cogumelo da Necrose** (14/10) mora no Jardim, anda aos pulinhos e envenena com esporos (`scripts/sprites/cogumelo.py`).
56. [ ] Slime de mel e abelhas (andar do jardim).
57. [ ] Fantasma bibliotecário (chefe da Biblioteca secreta).

## F. Rankings

58. [x] **Ranking da Cripta temático:** lápides, tochas, pódio de pedra e brasões.
59. [x] **Ranking geral refeito do zero:** top 3 em pódio com o herói chibi, coroa, medalhas animadas e brilho.
60. [ ] Mostrar o estágio do herói e o título de cada pessoa no ranking.

## G. Botões, interface e experiência

61. [x] Revisão geral dos botões (14/10), medida com Playwright em 390×844:
    - **Área de toque:** os botões redondos do topo e as abas passaram a ter cerca de 44 px de área de toque, sem mudar o desenho.
    - **Foco no teclado:** contorno de foco visível em todos os botões do topo, também fora da arena.
    - **No toque:** o "flutuar" do hover não fica mais preso depois do dedo sair.
    - **No iPhone:** o "afundar" do pressionado funciona.
    - **Som:** os botões já tocavam o próprio som e não precisaram de mudança.
62. [x] Transições entre telas com "cortina de pixels".
63. [x] Tutorial de 30 segundos jogável na primeira entrada (o Preceptor explica).
64. [x] Indicador claro de "o que este golpe vai fazer" (intenção) com ícone do superpoder.
65. [x] Acessibilidade: modo sem tremor, alto contraste e texto maior.

**Bloco de interface (14/10):** 62 e 65 concluídos no PR #250 draft a revisar: sem tremor, contraste, leitura ampliada e cortina que respeita movimento reduzido. [Detalhes e capturas](flashcards/ACESSIBILIDADE-14-10.md).

## H. Otimização

66. [x] PNGs em paleta sem perda (`scripts/otimizar_png.py`).
67. [x] Canvas de efeitos só ligado enquanto há efeito vivo; a pixel art usa uma camada própria.
68. [x] Carregar as tiras de efeito sob demanda por andar (hoje: todas na entrada, 196 KB).
69. [x] Música em OGG/Opus com fallback (hoje: MP3 a 112 kbps, 6 MB).
70. [~] Medir FPS no celular durante o crítico (alvo: 50+).

## I. Mods e personalização

71. [ ] "Pacotes de aparência" (skins) do herói: Arcanista, Caçadora e Paladino, sem vantagem.
72. [ ] Editor simples de paleta do herói (cor da capa e da pluma).
73. [ ] Desafios da semana ("modificadores"): só flashcards de imagem, vilões com o dobro de vida, cura desligada.
74. [ ] Sementes compartilháveis: jogar a mesma Cripta que um colega.

## J. Música e som (referência Stardew)

75. [x] Trilha calma e alegre para os andares a céu aberto (violão e flauta).
76. [x] Transição suave entre músicas (crossfade).
77. [x] Ambiente de chuva e trovão para a Biblioteca.
78. [x] (T) Confirmar o som num celular real.

## K. Pendências antigas

79. [x] Bestiário antigo atualizado com as artes novas.
80. [x] Contador da rota de estudo.
81. [ ] Áreas do baralho de demonstração.
82. [x] Emenda da faixa "sala" da música.
83. [x] (T) Colar a parte 19 do SQL no Supabase.
84. [x] PR #224 (abrir o jogo por cima do site, botão Menu, correção da barra no celular): trazer para a base.

---

## Registro do que foi feito

- **14/10/2026:** PR #227 mesclado (herói chibi, portas da encruzilhada, floresta verdejante, painel do admin, PNG otimizado). Depois disso, golpes em pixel art e o Envenenado (ideias 1 a 11 e 19), no PR #228.
- **14/10/2026:** Humor da Biblioteca (ideias 26 a 31), no PR #228. Fica em `src/flashcards/componentes/ClimaEstudo.tsx` (limiares em `HUMOR`), as chamas são `chama-*` em `vfx.py` e há aviso flutuante no celular.
- **14/10/2026:** Rankings: pódio em pixel art refeito do zero (`scripts/cenarios/podio.py` e `src/componentes/PodioPixel.tsx`), com cena de festa no ranking das questões e cena de cripta no dos Flashcards, além da página dos Flashcards com tema de pedra e tochas (ideias 58 e 59). Prévia sem servidor: `#/ranking?demo=1` e `#/ranking?aba=flashcards&demo=1`, só no modo de desenvolvimento.
- **14/10/2026:** Jardim Suspenso (ideia 42): andar a céu aberto dentro da cripta, com paredes em ruína, abóbada partida, cachoeira, lago com vitórias-régias e cerejeira. Fica em `scripts/cenarios/jardim.py` (cena `jardim`, também usada pela Gosma de Cimento e pelo Escaravelho). Os chefes do jardim continuam lá.
- **14/10/2026:** PR #228 mesclado. Depois: escudo em pixel art (o golpe do vilão bate na bolha e ela se estilhaça), corações na cura, "puf" de vitória e lâmina de ouro a partir do estágio 4 (ideias 12 a 15).
- **14/10/2026:** Em chamas (ideia 20). Os três dragões têm `queima`; em `regras.ts` ficam `QUEIMADURA`, `Partida.queimadura` e os eventos `chamuscado`, `arde` e `apagou`. Na tela: chamas no pé do herói e selo laranja.
- **14/10/2026:** Grude e Tremor (ideias 21 e 22), com testes no motor, mais as etiquetas de superpoder na placa do vilão (ideia 25).
- **14/10/2026:** Gato da Biblioteca e velas da sessão (ideias 32 e 33), pintados em `vfx.py` (`gato-*` e `vela`).
- **14/10/2026:** O Tales confirmou o som no celular (ideia 78) e colou a parte 19 no Supabase (ideia 83). O #224 foi trazido para a base pelo #237 (ideia 84). O top 3 do ranking foi refeito com largura cheia e cartões legíveis (#235).

- **14/10/2026:** Combate (16, 18, 23, 24 e 64), PR draft [#248](https://github.com/talesrobertosn/ortoquestoes/pull/248), a revisar. Numerais próprios, pedregulhos, hipnose apenas visual após o primeiro Olhar acertado e carga voando para o mímico. [Detalhes e testes](flashcards/COMBATE-14-10.md).
- **14/10/2026:** Desempenho (68 e 69), PR draft [#249](https://github.com/talesrobertosn/ortoquestoes/pull/249), a revisar: tiras por adversário, música Opus com MP3 de reserva. [Testes e medidas](flashcards/DESEMPENHO-14-10.md).

- **14/10/2026, integração autorizada pelo Tales:** PRs #247 a #250 reúnem os quatro blocos solicitados, com testes da versão conjunta e publicação pelo workflow do site. Nenhum SQL novo. Os registros de rascunho acima são históricos.

- **14/10/2026, continuidade da Biblioteca:** 34, 35, 37 e 77: livros por “Sabia”, diário de clima/área, chuva voluntária e ambiente procedural. Auditoria confirmou 76 (fades sobrepostos em `sons.ts`), 79 (`Ator` no bestiário) e 80 (contador da sessão) já implementados. Ver [relatório de continuidade](flashcards/PENDENCIAS-14-10.md).

- **14/10/2026, tutorial e medição:** 63 concluída com demonstração isolada; 70 tem benchmark local reproduzível, mas a meta em aparelho físico continua pendente. [Relatório](flashcards/TUTORIAL-DESEMPENHO-14-10.md).

- **14/10/2026, música e clima:** 38, 75 e 82: chuva abafa a trilha, Glória recebe coral sincronizado sob demanda, Passeio ao Sol traz violão/flauta aos cenários abertos, e a emenda das salas é suavizada. [Relatório](flashcards/MUSICA-CLIMA-14-10.md).
- **14/10/2026, estações:** 40: ornamentos nativos sazonais nas margens da Biblioteca; hemisfério sul, neve em julho e movimento reduzido. [Relatório](flashcards/ESTACOES-14-10.md).

- **14/10/2026, ambiente vivo:** 49 e 50: ciclo visual do Jardim, pássaros/coelho diurnos, peixe no lago e vaga-lumes existentes, sem mudar a partida. [Relatório](flashcards/AMBIENTE-VIVO-14-10.md).
- **14/10/2026, paisagens:** 43–48: vilarejo, ruínas, vila vista de cima, campo florido, praia e estufa integrados às paradas existentes. [Relatório](flashcards/PAISAGENS-14-10.md).

- **14/10/2026, leitores:** 39: manto e livro nas estantes depois de quinze minutos visíveis, sem persistência, combate ou animação com movimento reduzido. [Relatório](flashcards/LEITORES-14-10.md).
