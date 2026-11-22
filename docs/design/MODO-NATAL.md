# Modo Natal (plano, versão 2, 21/11/2026)

Pedido do Tales: enfeitar o site para "a época mais gostosa do ano", com sensação de conforto (chocolate quente,
friozinho, aconchego), começando pela página inicial. Na versão 2 ele pediu:
- ligar **desde já**;
- uma versão de Natal de **todos os cenários** que já existem;
- enfeites que **saem dos limites** das caixas (guirlanda grudada na caixa, pisca-pisca pendurado, árvore de Natal);
- partes do site que **conversam entre si sem se tocar**;
- e, depois do Natal, **desligar tudo** sem caçar código.

As referências que ele mandou (árvore com estrela e presentes, bichinhos de gorro e cachecol, Papai Noel, rena, boneco
de neve, presente, trenó sobre telhados nevados) são só inspiração: toda arte sai de script nosso, pixel art HD-2D com
luz quente (`.claude/skills/arte-hd2d/SKILL.md`), sem copiar nenhuma delas.

**Aprovado pelo Tales em 21/11/2026 ("pode começar tudo, por etapas, subindo aos poucos"). Toda peça que acende tem a sua camada de luz caindo no que está em volta (pedido dele).**

**Direção do Tales em 21/11/2026:** "quanto mais natalino melhor, pode até exagerar as vezes". Os cenários podem ser mais festivos onde houver espaço para a decoração. A grade, a luz da hora, a área de leitura e os encaixes dos personagens continuam valendo. Cada pintura espera o OK nos prints antes de subir.

## O que já existe

- Dois cenários de Natal no topo da inicial: o **Vale** e a **Sala do chalé**, em `src/componentes/inicio/cena/cenarios.ts`.
- Cinco poses de Natal do esqueleto (chocolate quente, tricô, castanhas, canção, cochilo), a nevasca animada
  (`Nevasca.tsx`, `clima.ts`) com troca para a pintura nevada, e o pisca-pisca do salão da Biblioteca em dezembro.
- A chave única **`src/natal/modoNatal.ts`** (pronta, com teste em `fixtures/testar_modo_natal.mjs`).

## 1. Ligar e desligar (um lugar só)

| O quê | Como |
|---|---|
| Período | **De hoje (21/11) até 6/1** em 2026; nos anos seguintes, de 21/11 a 6/1, sozinho. Desliga sozinho em 7/1. |
| Chave geral | `MODO_NATAL.ligado` em `src/natal/modoNatal.ts`. Com `false`, **nada** de Natal aparece, nem os cenários de Natal: um commit de uma linha. |
| Testar | `?natal=1` liga no aparelho, `?natal=0` desliga, `?natal=auto` volta à data. |
| Quem pergunta | `modoNatalAtivo()` no código; `<html data-natal="sim">` no CSS. Todo enfeite fica sob essa marca. |
| Peso | Imagens e CSS de Natal de cada página só descem com o modo ligado. |

## 2. Brainstorm da página inicial

### 2.1 Todos os cenários do topo com versão de Natal
Cada cenário ganha uma **pintura irmã enfeitada**, nas três horas do dia (manhã, tarde, noite), no mesmo mecanismo da
versão nevada que já existe (`cenarios.ts` passa a ter `natal: { arquivo }`). O script de cada cenário importa a
pintura original e pinta os enfeites por cima, com a luz calculada (as lâmpadas iluminam a pedra, a madeira e a neve
ao redor, sobretudo à noite). O rodízio continua com todos os cenários.

| Cenário | O que ganha |
|---|---|
| Acampamento | Pinheirinho ao lado da barraca com estrela, presentes embrulhados na pilha de livros, pisca-pisca entre as estacas, meias penduradas no varal, neve leve no chão. |
| Forja | Coroa de pinho na chaminé, ferraduras pintadas de dourado como enfeite, sinos de ferro pendurados, o fole com laço vermelho, brasas iluminando presentes. |
| Cais | Barquinho com cordão de luzes refletido na água, lanterna com fita, coroa no poste do píer, gelo fino na borda. |
| Observatório | Luneta com laço, estrela grande no alto da cúpula, pisca-pisca no corrimão, céu com mais estrelas e neve no parapeito. |
| Neve | Boneco de neve original (cachecol e gorro do site), árvore enfeitada no meio da neve, trenó parado com presentes. |
| Abrigo | Guirlanda na porta, meias na lareira, caneca de chocolate quente fumegando na mesa, janela com luz quente. |
| Praça do Pinheiro | O pinheiro inteiro aceso (já tem um toque), festões entre as casas, barraquinha de castanhas e chocolate quente. |
| Vale e Sala do chalé | Já são de Natal: ganham o trenó no céu (ver 2.4) e mais luzinhas na sacada. |

### 2.2 Os bichos agasalhados
- **Gato da vila de gorro vermelho com pompom** (o triângulo do rascunho), em todas as poses que aparecem no topo:
  acessório pintado por cima de cada quadro da folha, acompanhando o movimento da cabeça.
- **Coruja de cachecol vermelho**, com as pontas balançando no voo, sem mexer no desenho dela.
- **Esqueleto de cachecol listrado** (gorro não: o Tales recusou touca no esqueleto) e, no sorteio, as cinco poses de
  Natal que já existem passam a valer em todos os cenários.

### 2.3 Enfeites que saem dos limites (o rascunho)
Peças em PNG pintadas por código, posicionadas pelo CSS para **transbordar** a borda da caixa, sem cobrir texto,
número ou botão e sem criar rolagem lateral:
1. **Árvore de Natal saindo do topo para a barra de atalhos** (a seta do rascunho): uma árvore em pixel HD-2D com
   estrela, bolas, laços e presentes, com o pé apoiado na barra branca dos atalhos e a copa subindo por cima da trilha
   da sequência, no espaço livre entre o número de dias e as tochas. No celular, uma versão menor no canto.
2. **Pisca-pisca pendurado embaixo da barra de atalhos** (a linha ondulada): fio com lâmpadas de vidro em barrigas,
   preso nas bordas da caixa, caindo sobre a faixa de Planos. **Uma lâmpada para cada atalho** (Treinar, Revisão...),
   bem embaixo dele.
3. **Guirlanda no canto da caixa** (o círculo do rascunho): coroa de pinho com laço vermelho e fitas caindo, presa
   no canto de cima à direita da barra de atalhos, metade fora.
4. **Festão na borda de cima do topo**, com neve nas agulhas, e **neve acumulada** em cima das caixas (a barra de
   atalhos e a faixa do Simulado Nacional ganham um "telhado" de neve que escorre pela borda).
5. **Faixa de Planos** e **chamada do Simulado Nacional**: um laço de presente no canto de cada uma, como se fossem
   pacotes.

### 2.4 Partes que conversam sem se tocar
- **A neve que cai no topo se acumula na barra de baixo**: quando neva no cenário, a camada de neve em cima da barra
  de atalhos engrossa devagar.
- **Atalho e lâmpada**: passar o mouse (ou tocar) num atalho acende com mais força a lâmpada dele no pisca-pisca e
  ela balança.
- **A meta do dia acende tudo**: cada questão do dia acende uma lâmpada a mais do pisca-pisca; com a meta cumprida,
  o fio inteiro acende e a estrela da árvore brilha (ligado à comemoração que já existe, `usarFestaDaMeta`).
- **O gato e a lâmpada**: de vez em quando o gato do topo olha para baixo e dá uma patada no ar na direção da lâmpada
  pendurada mais próxima, que balança lá embaixo.
- **A coruja visita a guirlanda**: às vezes ela sai voando do cenário e pousa na guirlanda do canto da barra; depois
  volta.
- **A luz das lâmpadas pinta a borda do topo**: um brilho colorido fraco no pé do cenário, na cor das lâmpadas que
  estão acesas embaixo.
- **Estrela da árvore**: um toque nela solta um punhado de neve brilhante só em volta da árvore (segredo, como os da
  Biblioteca).
- **Trenó com renas** cruzando o céu à noite, uma vez por visita, saindo pela borda da caixa.
- **Chocolate quente**: uma caneca com vapor ao lado do número da sequência; o vapor fica mais forte quanto maior a
  sequência.

## 3. As outras páginas, na ordem
1. **Biblioteca**: guirlanda na estante, meias penduradas, a coruja bibliotecária de cachecol, xícara na mesa de
   leitura; o pisca-pisca do salão passa a obedecer à chave.
2. **Menu**: festão no alto da parede de madeira e vela no relógio.
3. **Resultado da sessão e aviso de fim de sessão**: a coruja de cachecol com chocolate quente ao lado do placar.
4. **Cronograma**: neve no telhado da Torre do Tempo, coroa de pinho no sino, a mesma linguagem de pisca-pisca.
5. **Flashcards, Desempenho, Conquistas, Indique e ganhe**: festão e guirlanda nas molduras.
6. **Páginas públicas** (planos, entrar, sobre): só o festão e a neve na borda, nada que atrapalhe a compra.

## 4. O que fica de fora
- **Sessão de questões, simulado em andamento e correção**: sérias, sem enfeite, mascote, neve ou luz piscando.
- Texto de resumo e comentário: sem enfeite dentro do texto.
- Nenhum símbolo religioso; sem emoji e sem música.

## 5. Riscos e cuidados
| Risco | Cuidado |
|---|---|
| Peso das pinturas | 7 cenários x 3 horas x 2 tamanhos = 42 webp novos (cada um < 200 KB), baixados só no modo Natal e só o da hora. |
| Celular | Enfeites que transbordam ficam menores e nunca passam da largura da tela; animações só de `opacity`/`transform`, paradas fora da tela. |
| "Menos animação" | Luzes acesas e paradas, sem neve caindo, sem trenó, sem balanço. |
| Claro e escuro | As peças fora das caixas ficam sobre o fundo da página: pintadas com contorno escuro e conferidas nos dois temas. |
| Cobrir conteúdo | Toda peça com `pointer-events: none` (menos as que são segredo) e posição conferida em 390, 1440 e acima de 2000. |
| Padrão HD-2D | Cada peça com estrutura, 5 a 7 tons, textura e luz calculada; ampliar e criticar em 4 a 6 rodadas. |
| Prazo | Ordem sugerida: chave ligada + festão, pisca-pisca, guirlanda e árvore (primeiro impacto) → gorro e cachecol → cenários de Natal um a um → conversas entre as partes → outras páginas. |

## Andamento
- [x] Chave única com teste (`fixtures/testar_modo_natal.mjs`). `MODO_NATAL.noAr` decide se o modo vai ao ar para todos.
- [x] Etapa 1, primeira tentativa (21/11/2026): festão, árvore, guirlanda, pisca-pisca sob a barra, neve e laços. O Tales
      achou "horrível" (exagero em cima, nada embaixo, guirlanda escondida atrás da caixa) e pediu para retirar (#1202).
      Regra desde então: **nada de Natal sobe sem os prints e o OK dele.**
- [x] Etapa 1 refeita e aprovada (21/11/2026): poucas peças, em zigue-zague pela página, todas na técnica das cenas
      (`scripts/natal/`: `fio_topo.py`, `arvore.py`, `guirlanda.py`, `boneco.py`, montagem comum em `hd2d.py`):
      fio de lâmpadas na borda do topo (a luz cai no cenário), árvore plantada na barra de atalhos (à direita),
      guirlanda pendurada no canto esquerdo da barra, boneco de neve com caneca de chocolate quente e lanterna junto da
      turma do cartão do Instagram.
- [x] Etapa 2 (aprovada em 21/11/2026): gorro vermelho no gato (`scripts/gerar_gato_fofo.py --natal`), o xale da
      coruja tingido de cachecol vermelho sem mudar o traço (`scripts/natal/coruja_cachecol.py`) e cachecol de tricô
      verde-azulado no esqueleto (`scripts/gerar_mascote.py --natal`); folhas em `*-natal.png`, com mapas de luz
      (`scripts/sprites/luz_bichos.py`), trocadas em `sprites.ts` e `CorujaPixel.tsx` quando o modo está no ar.
- [x] Etapa 3, primeiro cenário (aprovado em 21/11/2026): o Acampamento com o Natal pintado dentro da cena
      (`scripts/natal/cenario_acampamento.py` → `cena-natal-*.webp`: fio de luzes da barraca ao lampião, guirlanda na
      barraca, laço no lampião, presentes nos caixotes, pinheirinho na grama). Cada cenário ganha `pinturaNatal` em
      `cenarios.ts` e o `CenaDiorama.tsx` troca a pintura com o modo no ar.
- [x] Etapa 3, Forja, Cais e Observatório (pinturas aprovadas em 21/11/2026): painéis de manhã, tarde e noite, com
      pinheiros e luz própria. Os três cenários usam `pinturaNatal` para escolher a variante no rodízio.
- [x] Etapa 3, Neve (aprovada pelo Tales em 21/11/2026): festão aceso na cabana, pinheiro e trenó com presentes.
      As três horas foram conferidas na inicial em 1440 e 390 px, tema claro e escuro.
- [ ] Etapa 3, Abrigo e Praça: seguem na ordem depois da Neve, pelo pedido em `docs/prompts/codex-natal.md`.
- [ ] Etapa 4: as conversas entre as partes (a meta do dia acende o fio, a coruja visita a guirlanda, o trenó).
- [ ] Demais páginas.
