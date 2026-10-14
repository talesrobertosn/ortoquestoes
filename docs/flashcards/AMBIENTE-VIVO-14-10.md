# Jardim e fauna — 14/10/2026

Ideias 49 e 50. O Jardim Suspenso passa por manhã, entardecer, noite e amanhecer: uma etapa a cada dois minutos enquanto visível. É um ciclo de fantasia, independente do horário real. O intervalo pausa com movimento reduzido; sair do Jardim o encerra. Nenhum tempo, semente, dano, recompensa ou ordem de flashcards é alterado.

A fauna é arte própria de `scripts/sprites/animais.py`, desenhada por máscaras numpy em tiras RGBA de dois quadros. Floresta e Jardim recebem pássaro e coelho, que recolhem à noite e na chuva. O peixe salta no Jardim a cada nove segundos; a posição deriva da mesma projeção do lago pintado, incluindo o recorte do formato retrato. Os vaga-lumes noturnos já existiam e foram preservados. São enfeites, sem adicionar monstros, anatomia ou personagens de combate.

`pintarFauna` reutiliza o loop limitado do ambiente; cache de três imagens sob demanda, sem novos loops de animação, pedidos por quadro ou dados persistidos. Falha de uma imagem apenas omite aquele animal. O ciclo repinta o cenário uma vez por etapa, não por quadro. Sem SQL.

## Validação

- `npx tsc -b`, `npm test`, build.
- Fixture `testar_ambiente_vivo.mjs`: ciclo completo, duração por etapa, ausência de fauna em cenas internas/chuva, cache de imagens, animais diurnos recolhidos à noite e peixe restrito ao intervalo de salto/projeção do lago.
- Playwright `scripts/flashcards/testar_ambiente_vivo.mjs`, computador 1400×860, celular 390×844 e 844×390: recursos reais carregados, quatro etapas do céu sem alterar a partida, intervalo desligado por movimento reduzido e ao sair do Jardim, sem erros JavaScript. O teste aciona manualmente os callbacks do intervalo de dois minutos, sem modificar o motor.
- Capturas `capturas/ambiente-vivo-14-10/`, dia e noite nos três formatos.

Monstros novos permanecem em pausa. Falta medir FPS em aparelho físico; a medição sintética não substitui essa etapa. Próximo bloco permitido: pinturas de novas paisagens e aparência opcional do herói.
