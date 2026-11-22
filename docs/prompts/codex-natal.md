# Modo Natal: continuar no Codex (local)

Cole o bloco abaixo no Codex, aberto na pasta do repositório (`~/ortoquestoes` ou a sua cópia local).

```text
Projeto Orto Questões (repositório talesrobertosn/ortoquestoes; branch base claude/pdfs-questoes-tp64dr).
Você continua o MODO NATAL do site, que vinha sendo feito pelo Claude. Trabalhe só no que está abaixo.

LEIA ANTES DE QUALQUER COISA
- CLAUDE.md e AGENTS.md (regras do projeto), DESIGN.md e PRODUCT.md.
- docs/design/MODO-NATAL.md: o plano inteiro, o que já está no ar, o que o Tales recusou e por quê.
- .claude/skills/arte-hd2d/SKILL.md: o padrão de arte (pixel art HD-2D pintada por código, luz calculada, "nunca preguiçosa").

REGRA MAIS IMPORTANTE (Tales, 21/11/2026)
Nada de Natal vai para o site sem ele ver os prints e dizer "pode subir". Para cada peça: faça, confira, mande os prints
(computador 1440 e celular 390, tema claro e escuro, e as três horas do dia quando for cenário), espere o OK e só então
abra o PR, rode os testes e faça o merge. Uma primeira tentativa foi recusada ("horrível": exagero em cima, nada
embaixo, escala diferente da cena, cara de adesivo, guirlanda escondida atrás de uma caixa). O que ele aprovou:
pouca coisa, muito bem feita, distribuída pela página, pintada na técnica das cenas, e tudo o que acende ilumina em
volta (luz caindo na pedra, na madeira, na grama, na água).

O QUE JÁ ESTÁ NO AR (não refaça)
- A chave única: src/natal/modoNatal.ts (MODO_NATAL: de 21/11 a 6/1, ligado, noAr; prévia com ?natal=1 / ?natal=0).
  Teste: fixtures/testar_modo_natal.mjs.
- Etapa 1, a página inicial: fio de lâmpadas na borda do topo, árvore plantada na barra de atalhos, guirlanda no canto
  esquerdo da barra, boneco de neve com caneca e lanterna junto do cartão do Instagram.
  Código: src/natal/EnfeitesInicio.tsx e src/estilos/natal/NatalInicio.css. Arte: scripts/natal/fio_topo.py,
  arvore.py, guirlanda.py, boneco.py, com a montagem comum em scripts/natal/hd2d.py.
- Etapa 2, os bichos: gato de gorro (scripts/gerar_gato_fofo.py --natal), coruja com o xale tingido de cachecol
  vermelho (scripts/natal/coruja_cachecol.py; o desenho é do Tales, nunca mude o traço), esqueleto com cachecol de
  tricô (scripts/gerar_mascote.py --natal). As folhas ficam em *-natal.png, com mapas de luz
  (scripts/sprites/luz_bichos.py), e trocam em src/componentes/mascote/sprites.ts e
  src/biblioteca/sala/CorujaPixel.tsx.
- Etapa 3, o primeiro cenário: o Acampamento com o Natal pintado dentro da cena (scripts/natal/cenario_acampamento.py
  gera public/pixel/inicio/cena-natal-{manha,tarde,noite}[-960].webp). No site, cada cenário de
  src/componentes/inicio/cena/cenarios.ts pode ter `pinturaNatal: '<prefixo>'`; com o modo no ar, CenaDiorama.tsx
  usa essa pintura no lugar da normal.

SUA TAREFA: ETAPA 3, OS OUTROS CENÁRIOS DO TOPO
Forja, Cais, Observatório, Neve, Abrigo e Praça foram aprovados. As próximas entregas seguem as interações
e as demais páginas de `docs/design/MODO-NATAL.md`. O Tales pediu preparar todas as prévias sem interromper
a produção para pedir aprovações intermediárias. A publicação das novas peças espera o OK nos prints.
Tales (21/11/2026): "quanto mais natalino melhor, pode até exagerar as vezes". Os acentos podem ser mais fortes
onde a cena comportar, com a mesma escala, luz integrada e caixas dos personagens livres.

Faça um cenário de cada vez, nesta ordem, com prints e OK do Tales antes de subir cada um (ou junte os que ele aprovar
num PR só, para poupar minutos do GitHub Actions):
1. Forja (cena-forja), 2. Cais (cena-cais), 3. Observatório (cena-observatorio), 4. Neve (cena-neve),
5. Abrigo (cena-abrigo), 6. Praça (cena-praca; ela já tem um pinheiro de Natal, então só complete com equilíbrio).
O Vale e a Sala do chalé já são de Natal e não precisam de versão nova.
Se já existir um branch codex/natal-cenarios com algum desses pronto, continue a partir dele.

Como fazer cada um (siga scripts/natal/cenario_acampamento.py como modelo):
- Um script por cenário: scripts/natal/cenario_<id>.py, lendo public/pixel/inicio/<arquivo>-{periodo}.webp. As peças
  são pintadas numa Camada da mesma grade (480 x 200) e montadas em 3x, com a luz da hora (PERIODOS de
  scripts/gerar_cena_inicio.py ou do script do cenário), a luz da fogueira de lado e o brilho das lâmpadas, que também
  clareia a pintura em volta. Saídas: <arquivo>-natal-{manha,tarde,noite}.webp (1440 x 600) e as versões -960;
  qualidade 84, menos de ~200 KB cada.
- Meça antes, numa grade, onde há espaço livre. Não cubra: o fogo (âncora `fogo` ou x 220-260, y 104-152), o
  esqueleto (caixa `mascote` ou x 262-308, y 96-163), os pontos do gato (caixa de 36 x 22) e da coruja (33 x 24 acima
  dos pés) listados em cenarios.ts, nem os 40-45% da esquerda (área do texto).
- Ideias, sem virar molde: Forja (coroa na chaminé, sinos de ferro, fole com laço, presentes iluminados pelas brasas);
  Cais (cordão de luzes no barco ou no píer com o reflexo colorido na água, coroa num poste); Observatório (estrela
  na cúpula, pisca-pisca no corrimão, luneta com laço); Neve (pinheiro enfeitado, trenó com presentes); Abrigo
  (guirlanda na porta, meias, caneca fumegando, janela quente). Pouca coisa por cena.
- Revise olhando: amplie, critique com honestidade e repita de 4 a 6 rodadas, nas três horas do dia.
- Ligue no site: em cenarios.ts, acrescente `pinturaNatal: '<arquivo>-natal'` ao cenário. Confira com
  http://localhost:5173/?natal=1&cenario=<id>#/ (npm run dev).
- Prints para o Tales: antes e depois nas três horas e a página com o cenário no topo (computador e celular).

DEPOIS DOS CENÁRIOS (só se o Tales pedir)
- Etapa 4, as partes que conversam: a meta do dia acende o fio do topo lâmpada por lâmpada, a coruja visita a
  guirlanda, o trenó cruza o céu à noite, a neve do cenário se acumula na barra de atalhos.
- As outras páginas, na ordem do plano: Biblioteca, Menu, Resultado da sessão, Cronograma, as demais.

O QUE NUNCA FAZER
- Enfeitar a tela de responder questões, o simulado em andamento ou a correção: elas são sérias.
- Usar símbolo religioso, emoji ou imagem baixada ou gerada por IA. Cada pixel sai de script.
- Mudar as pinturas e as folhas originais (os arquivos sem -natal).
- Publicar sem o OK do Tales.

ANTES DE CADA PR
npx tsc --noEmit -p . ; node fixtures/testar_modo_natal.mjs ; node fixtures/testar_cenarios_inicio.mjs ;
npx vite build ; node fixtures/testar_orcamento_chunks.mjs ; npm test
Commits com mensagem em português; atualize a seção "Andamento" de docs/design/MODO-NATAL.md a cada etapa.
Ao terminar cada parte, responda ao Tales com o que foi feito, os prints e o que falta.
```
