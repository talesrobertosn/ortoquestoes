# Combate: ideias 16, 18, 23, 24 e 64

14/10/2026. Bloco independente para revisão em PR draft, sem publicação.

- Numerais 5×7 autorais em SVG, contorno por pixels e quique; não carregam fontes. Movimento reduzido mantém os números legíveis, sem quique.
- Quatro tiras de pedregulho: cristal, obsidiana, rubro e cimento. `vfx.py --novos` grava somente imagens ausentes e atualiza o índice sem regravar as tiras existentes. O crítico usa a tira correspondente à variante do golem.
- Hipnose do basilisco: **depois do primeiro Olhar petrificante que atingir o herói**, como decidido pelo Tales. Um escudo que bloqueia ou um golpe comum não ativa. A próxima pergunta ganha uma permutação de posições visuais, uma única vez no confronto. `Jogada.ordem`, gabarito e validação permanecem iguais; teclado, seleção, pistas e marcações usam a posição canônica. A semente visual não avança a semente do combate. Campos opcionais preservam partidas antigas e a permutação é serializável.
- **Decisão do Tales para o mímico:** manter o roubo de carga, não criar roubo de ouro. A carga vira uma esfera de energia que voa do poder até o baú. Portanto a ideia 24 usa energia, sem uma moeda que sugeriria perda de ouro inexistente.
- Intenção mostra um ícone de escudo, cartas, chama, frasco, bolsa ou espadas conforme o golpe e o adversário. Continua usando o dano calculado pelo motor.

Teste de hipnose em `fixtures/testar_flashcards.mjs`: compara todas as posições com/sem permutação, valida acerto/erro, eventos, vida, pontos e preservação do flashcard; cobre escudo, golpe comum, repetição e JSON. Teste do mímico assegura ouro intacto. Playwright em 1400×860 e 390×844 confirma número em bitmap, intenção e resposta correta pela tecla da posição visual.

Validação: `npx tsc -b`, `npm test`, build e capturas em `capturas/combate-14-10/`. Nenhuma alteração em questões médicas, conteúdo do acervo, plano, SQL ou dados de usuário existentes. Os novos campos só acompanham a partida em curso.
