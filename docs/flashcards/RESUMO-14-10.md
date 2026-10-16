# Resumão dos flashcards em 14/10/2026

Feito para o Tales e para qualquer agente que continue o trabalho, seja Claude, Codex ou outro.

## O que existe e funciona

**Central `#/flashcards`:** é uma página do site, com o selo de beta. Tem três abas: Central, Meu desempenho e Meu cronograma.
- O título diz o essencial: "Treine flashcards de Ortopedia".
- As revisões de hoje ficam ao lado do cronograma, que aparece em destaque com a meta do dia, uma barra de progresso e o botão "Fazer a sessão de hoje".

**Biblioteca, o modo Estudo:**
- Treino por área, pelas revisões de hoje, pelos que a pessoa errou, hesitou ou nunca viu, e pelos temas que mais caem.
- Primeiro a pessoa responde nas alternativas; depois vira o flashcard e diz como foi: Errei (volta hoje), Hesitei (volta em 3 dias) ou Sabia (volta em 10 dias).

**Cripta do Residente, o modo jogo:**
- Cada acerto é um golpe e cada erro é um contra-ataque. A cada 3 andares há um chefe.
- O herói tem 6 estágios e muda a cada chefe vencido.
- Há portas, loja, salas de evento, Altar do Saber, Bestiário e ranking único.
- **Ordem dos flashcards:**
  1. maior acerto da turma;
  2. questões que a pessoa acertou;
  3. questões que ela errou;
  4. questões novas.

  Depois vem a mistura. Dentro de cada grupo o sorteio é aleatório.
- **Poderes de rota:**
  - Mapa do especialista: os próximos 10 flashcards vêm de uma área, ou de subtemas dela.
  - Desvio de área: os próximos 10 flashcards não são de uma área.
  - Os dois aparecem como recompensa, na loja e no Altar.

**Acesso** (valem quando o paywall está ligado no servidor):
- Assinante, cortesia e administrador não têm limite.
- **Biblioteca:** a conta grátis tem 10 flashcards a cada 24 horas.
- **Cripta (regra nova de 14/10):** a conta grátis tem uma vida a cada 24 horas e vai até onde conseguir. Morrer ou recomeçar abre outra vida, que só vale quando a janela de 24 horas virar. A Biblioteca segue à parte, com 10 por 24 horas. A regra **não aparece escrita no site**: a pessoa descobre jogando (diretriz do Tales).
  - É preciso colar no Supabase a parte 19: `supabase/colar-no-painel/sql-202610140900-parte19.sql` (substitui a versão das 3 tentativas).
  - Enquanto a parte 19 não for colada, a Cripta segue no limite antigo de 10 por 24 horas.

**Opiniões:**
- O botão "Enviar opinião" grava no banco (parte 18).
- Elas aparecem no painel do administrador, na aba **Opiniões dos flashcards**, com médias, filtro por categoria e o texto de cada uma.

**Som:**
- O volume geral começa em 20% na primeira vez. Depois vale o que a pessoa ajustou, salvo no aparelho.
- O som no celular ainda depende de um teste num aparelho de verdade.

**Arte:**
- Cenários pintados: Floresta, Biblioteca, Covil e Masmorra.
- Herói redesenhado em 14/10: cavaleiro adulto, com cabeça menor e alongada, protetores de face no elmo e pernas longas.
- Bestiário em volume: golem, guardião, serpente, gosma, dragão e variantes.
- Toda a arte é feita pelos nossos scripts, sem imagem baixada nem gerada por IA no jogo.

## O que ainda está fraco ou falta

1. **Bestiário:** em 15/10 ganharam folha nova o raptor (e variantes), o corvo, o morcego, o escaravelho, o Slime Sinovial e os três cavaleiros. Ainda no desenho antigo: mão, espectro, harpia, quimera, rei, leviatã e arconte.
2. **Cenários procedurais:** Torre e Salão ainda não são pintados offline.
3. **Dragão:** variantes escarlate e ancestral feitas em 15/10.
4. **Contador da rota:** feito em 16/10 (selo "Área N faltam" na mesa; veja CONTINUAR.md, Acabamento).
5. **Conquistas dos flashcards:** ligadas ao sistema de emblemas do site em 15/10/2026 (veja [CONQUISTAS.md](CONQUISTAS.md) e a seção de 15/10 em `docs/emblemas.md`).
6. **Áreas sobrando:** corrigido em 16/10 (Trauma adulto e Quadril, como no acervo).
7. **Faixa "sala" da trilha:** emenda corrigida em 15/10 (degrau de 5,5 para 2,4 dB).
8. **Som no celular:** precisa ser testado num aparelho físico.

## Conquistas: avaliação e proposta

**O que já existe:** 19 emblemas em 5 famílias, desligados.
- Profundezas da Cripta.
- Torre do Título. A Torre saiu da entrada, então esta família perde sentido.
- Flashcards únicos.
- Bestiário.
- Caçador de dragões, com conquistas secretas.

**Sugestão** (quando você der o sinal, ligamos no sistema de emblemas do site):

| Família | Ideia | Níveis sugeridos |
|---|---|---|
| Mestre da revisão | dias seguidos fazendo a meta do cronograma | 3, 7, 14, 30, 60 dias |
| Especialista | dominar flashcards de uma área: acertar todas as voltas da escada de revisão | 25, 100, 250 por área |
| Profundezas da Cripta | andar mais fundo | 6, 12, 21, 30, 45 |
| Bestiário | adversários diferentes vencidos | 8, 20, todos |
| Caçador de dragões (secreta) | Dragão de Ossos, depois os três dragões | 1, 3 |
| Sem errar | sequência de acertos na Cripta | 10, 25, 50 |
| Colecionador de lendários | flashcards lendários acertados (temas que mais caem) | 50, 200, 500 |

**Cuidados:**
- As conquistas da Cripta só valem com os recordes do servidor, das corridas validadas. Assim ninguém ganha emblema editando o aparelho.
- A arte dos emblemas deve ser pixel art nossa, sem anatomia.

## Aviso no topo do site

**Onde:** Admin › Ajustes › Aviso no topo do site.

| Campo | Valor |
|---|---|
| Texto | Novo: flashcards de Ortopedia, em beta aberto. Treine por área, com as questões das provas e revisão no tempo certo. Teste grátis e conte o que achou. |
| Link | `#/flashcards` |
| Texto do link | Treinar flashcards |
| Cor | Verde (novidade) |
| Fica no ar por | 7 dias |

## Como trabalhar

- **Base:** `claude/pdfs-questoes-tp64dr`. Um merge nela publica no GitHub Pages.
- **Testes antes de cada PR:**
  - `npm test`, `npx tsc --noEmit` e `npm run build`;
  - Playwright em 1400×860, 390×844 e 844×390.
- **Arte dos personagens:**
  - `python3 scripts/sprites/assar.py <nome> [--estagio N] [--variante V]`;
  - depois `python3 scripts/sprites/indice.py`.
- **Cenários:** `scripts/cenarios/*.py`. O passo a passo está em [ARTE.md](ARTE.md).
