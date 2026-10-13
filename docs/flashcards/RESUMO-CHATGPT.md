# Resumo para o ChatGPT: beta público dos flashcards (13/10/2026, noite)

Projeto OrtoQuestões, repositório `talesrobertosn/ortoquestoes`. Roteiro executado:
`docs/flashcards/LANCAMENTO-BETA.md`. Branch `claude/sharp-goodall-pl7kp7`, PR para a base
`claude/pdfs-questoes-tp64dr` (o merge publica no GitHub Pages).

## Implementado (no código, testado localmente)

- **Central `#/flashcards`** (página do site): arte própria, selo Beta, "Abrir flashcards" (vai para a
  entrada temática do jogo, agora em `#/flashcards/entrada`), "Revisar sem o jogo", aviso do beta,
  Revisões de hoje / Errei / Hesitei / Nunca estudados / Por assunto, como funciona em 3 passos,
  cartões Revisar, Modo jogo e Meu desempenho, links para cronograma, ranking, Torre e opinião.
- **Pedido do Tales durante o trabalho:** começar como "Flashcards", não "masmorra"; a Cripta entra
  depois, como modo jogo. Na página inicial, no computador, o quadro dos flashcards ocupa a coluna da
  direita do herói (onde ficavam Sequência, Acerto e Respondidas); no celular vira uma faixa abaixo.
- **Menu:** "Flashcards" + selo Beta no topo, na barra do celular e no Menu.
- **Arte:** `scripts/cenarios/promo.py` compõe a capa (floresta, entrada da masmorra ao fundo, herói
  em primeiro plano, baú iluminado, golem) e três cartões, só com elementos do jogo, sem IA.
- **Aprendizagem:** eventos deduplicados (recarregar, clique duplo, reenvio), diário por dia local,
  acerto na primeira resposta só para flashcards respondidos pela primeira vez nesta versão (nada
  retroativo), "Sabia" separado do acerto objetivo, Cripta contando para a revisão sem presumir confiança.
- **Meu desempenho** (`#/flashcards/desempenho`): únicos, respostas, pendentes, dominados; período de
  7/30/90 dias com denominadores escritos; distribuição Errei/Hesitei/Sabia; respostas por dia; por assunto.
- **Meu cronograma** (`#/flashcards/cronograma`): data-alvo (sugere a do TEOT), assuntos, dias, ritmo;
  avisos de data passada, sem flashcards, concluído, acima do ritmo e revisões acumuladas;
  "Começar a sessão de hoje".
- **Ranking:** aba Cripta em `#/ranking` (Normal e Difícil separados, empate por quem chegou primeiro,
  só nome público, Fácil fora, Torre sem ranking).
- **Opinião:** janela com as 5 perguntas e as categorias, só confirma quando o servidor grava; no fim
  da sessão e da partida; convite discreto depois de 3 sessões.
- **Planos:** cartão dos flashcards com as regras reais (sem preço novo) e a linha "Flashcards por dia".
- **Desempenho, Revisão e Cronograma de questões:** atalho discreto para os flashcards, sem misturar números.
- **SQL parte 18** (ranking por dificuldade + opiniões): rodado pelo Tales no Supabase.
- **Testes:** `fixtures/testar_aprendizagem.mjs` (contagem única, deduplicação, agendamento, fuso,
  estatísticas, cronograma). `npm test`, `tsc` e `build` passando.

## Ainda não validado / planejado

- Som no celular: corrigido no código, **falta o Tales testar num iPhone e num Android**.
- Cauda do dragão fora da tela no celular, escudo grande do herói lendário e cortes em telas pequenas:
  ficam para a rodada seguinte de refinamentos.
- O cronograma de flashcards fica no aparelho (não sobe para a conta ainda).
- Cadastro por e-mail ainda perde o destino de volta (o login com Google mantém).

---

# Resumo para o ChatGPT: Cripta do Residente (13/10/2026)

Projeto OrtoQuestões, repositório `talesrobertosn/ortoquestoes`. O jogo fica na rota escondida
`#/flashcards`; o merge na base `claude/pdfs-questoes-tp64dr` publica no GitHub Pages. Tudo abaixo está
mesclado e publicado. Não há PR aberto.

## O que foi feito nesta rodada

### Direção criativa, Etapas 1 a 8 (PRs #219 e #220)

1. **Cenários pintados offline**, com camadas de fundo, meio, frente e luz, sem custo no celular.
   - **Floresta das Fises Antigas** (andar 1), com a clareira de pedras, vaga-lumes, folhas e borboletas.
   - Masmorra, Covil do Dragão e Biblioteca (modo Estudo).
   - Não chove mais dentro de cenas internas.
2. **Alternativas 1 a 4 redesenhadas:** pergaminho, moldura de bronze, medalhão com o número e 8 estados (normal, hover, selecionada, certa, errada, eliminada etc.).
3. **Modo Estudo com o mesmo acabamento da Batalha:**
   - biblioteca;
   - alternativas antes de virar o flashcard;
   - placas Errei, Hesitei e Sabia;
   - painéis.
4. **Celular deitado** com layout próprio, em três colunas.
5. **Herói em 6 estágios** com crescimento corporal real, do aprendiz infantil à lenda adulta.
6. **Chefes:**
   - **Dragão de Ossos redesenhado:** crânio maior, costelas em arco, asas rasgadas e fogo-fátuo;
   - **Guardião do Acetábulo:** tabardo e escudo-taça.
7. **Interface mais leve:**
   - menos selos na placa do adversário;
   - o topo fica acima dos personagens;
   - o botão "Ver imagem" fica sempre visível.
8. **Salas de evento entre os andares:** ferreiro, curandeira, baú com armadilha, sala secreta e quatro encontros. Há também sinergias entre pares de relíquias.
9. **Trilha original** da floresta, da masmorra, do covil e das salas.
10. **Bestiário:** nove adversários passaram para o desenho em volume (variantes do golem, do guardião, da serpente e da gosma). A Gosma de Cimento foi modelada do zero.

### Revisão automática (Codex) nos PRs #219 e #220

Cinco apontamentos, todos corrigidos, respondidos e resolvidos:
- o reforço de cargas respeita o máximo de cada poder;
- temperar a armadura não cura em dobro;
- as relíquias do baú e da sala secreta saem pelo peso de raridade;
- o cenário não repinta com a cena antiga;
- o corte do celular deitado é o mesmo no CSS e no código.

### Dificuldades da Batalha: Fácil, Normal e Difícil (PR #220)

- A escolha fica na entrada da Cripta e vale para as partidas novas. Uma partida em andamento mantém a dela; as antigas abrem como Normal.

| | Fácil | Normal | Difícil |
|---|---|---|---|
| Vida do herói | ×1,3 | ×1 | ×0,85 |
| Vida do adversário | ×0,8 | ×1 | ×1,25 |
| Dano recebido | ×0,65 | ×1 | ×1,35 |
| Pontos | ×0,5 | ×1 | ×1,5 |
| Flashcards | mais fáceis | mistura atual | mais difíceis |
| Ranking e recordes de andar | não contam | contam | contam |

- **Flashcards:** muda só a proporção de fáceis, moderados e difíceis no sorteio. Nenhuma questão, gabarito ou comentário foi alterado.
- **Selo:** um selo colorido no topo da partida mostra a dificuldade.
- **Equilíbrio:** em simulação com 75% de acerto, o andar médio é 11,5 no Fácil, 4,8 no Normal e 2,9 no Difícil.

### Testes

- `npm test`, `npx tsc --noEmit` e `npm run build` passaram. A verificação automática do GitHub ("verificar") ficou verde.
- Testes novos:
  - salas de evento;
  - reforço de cargas: o teste falha sem a correção;
  - dificuldades: vida, dano, mistura e ranking.
- Playwright na Batalha e no Estudo, em 1400×860, 390×844, 844×390, 600×360 e 568×320: sem erros e sem nada fora da tela.

## O que falta (em ordem)

1. **Bestiário:** passar raptor, mímico e esqueleto para o desenho em volume, porque aparecem cedo. Depois, os demais adversários que ainda usam o desenho antigo.
2. **Torre e Salão:** pintá-los como a floresta; hoje ainda são gerados em código.
3. **Dragão:** criar as variantes escarlate e ancestral.
4. **Herói lendário (estágio 6):** reduzir o escudo, que cobre demais o corpo.
5. **Cauda do dragão:** ela sai da tela no celular.
6. **Faixa "sala":** revisar a emenda.

**Do pedido de direção criativa, ainda não começado:**
- **Cenários:** deserto, pântano, observatório, jardim, fortaleza e trono do dragão.
- **Personagens jogáveis:** aparências alternativas.
- **Equipamentos visíveis no herói.**
- **Torre do Título:** marcos nos andares 10, 25, 50, 75 e 100, e o mapa da subida.
- **Sons:** revisão completa dos efeitos.
- **Ranking:** separar Normal e Difícil no servidor quando ele for ligado. Hoje ele está desligado.

## Restrições que continuam valendo

- **Publicar:** só na rota escondida `#/flashcards`. Nada de banner, menu, ranking público, divulgação ou página de vendas.
- **Não mexer:** assinaturas e limites; questões, gabaritos e comentários; dados de usuários.
- **Preservar:** as feature flags e o progresso salvo. As partidas antigas continuam abrindo.
- **Arte:** só pintura original feita em código, sem imagem baixada nem gerada por IA.

## Como qualquer agente continua

O guia completo está em `docs/flashcards/CONTINUAR.md`. O `AGENTS.md`, na raiz, aponta para ele, e o Codex
lê esse arquivo automaticamente. Lá estão a mensagem pronta para colar no agente, os comandos de teste e a
regra de abrir uma branch nova a partir da base, com PR.
