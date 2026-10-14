# Bom dia, Tales: o que foi feito na madrugada de 14/10/2026

Tudo foi para o ar pelos PRs #228 (já mesclado) e #229. A lista completa de ideias, com o que já foi feito marcado, está em [../PLANO-DE-IDEIAS.md](../PLANO-DE-IDEIAS.md).

## Golpes (o que você pediu primeiro)
- **Herói:** o golpe comum agora é uma lâmina de energia em pixel art. A cor muda com o combo: azul, ouro, fogo e arcano; a partir do estágio 4, sai sempre de ouro.
- **Crítico do herói:** a **espada gigante em pixel art** atravessa a tela na diagonal e rasga o ar.
- **Vilões:** cada um tem golpe comum e golpe crítico próprios. No crítico, o vilão **cresce, vem até o meio da tela e bate**, e a tela treme num terremoto. Os destaques:
  - Golem: um pedregulho musgoso cai do céu e racha o chão.
  - Serpente: o bote, com duas presas e uma nuvem tóxica.
  - Mímico: a tampa com dentes se fecha sobre a tela inteira.
  - Dragão: sopro de chamas em pixel art.
  - Gosma: gosma escorrendo do alto da tela.
  - Raptor e corvo: garras gigantes.
- **Escudo:** o golpe bate numa bolha hexagonal, que racha e voa em cacos.
- **Cura e vitória:** a cura sobe em corações; o vilão derrotado some num "puf" de fumaça com estrelas.

## Superpoderes dos vilões (mudam a partida)
- **Envenenado** (serpentes, aranha, leviatã): cada flashcard tira vida até você acertar 5 seguidos. Um erro recomeça a contagem. O veneno nunca derruba o herói.
- **Em chamas** (dragões): depois do Sopro, você queima por 3 flashcards. Acertar um flashcard difícil apaga o fogo.
- **Grude** (gosmas): o próximo erro dói 50% a mais, até você acertar.
- **Tremor** (golens): o crítico derruba 1 carga de um poder equipado.
- O superpoder aparece na placa do vilão. Todos os quatro têm testes no motor.

## Biblioteca mais divertida
- **Seu nome em chamas:** com 3 "Sabia" seguidos, fogo laranja; com 6, fogo azul; com 9, chama arcana.
- **Glória da Biblioteca:** com 20 seguidos, raios dourados na tela.
- **Clima pelos erros:** 3 erros seguidos fazem chover e 5 trazem tempestade, com relâmpago e trovão. Um aviso explica o que está acontecendo.
- **Névoa da dúvida:** aparece quando você hesita.
- **Arco-íris:** surge no primeiro acerto depois da chuva.
- **Gato laranja:** dorme com Zzz, acorda quando você acerta e fica feliz no combo.
- **Velas:** uma acende a cada "Sabia".

## Rankings
- **Pódio refeito do zero:** os três primeiros ficam em degraus de ouro, prata e bronze, cada um com o cavaleiro chibi.
  - **Ranking das questões:** dia de festa, com bandeirinhas.
  - **Ranking dos Flashcards:** salão de pedra com tochas e cristais.

## Cenário novo: Jardim Suspenso
- É um andar a céu aberto dentro da cripta, como você sugeriu a partir de Sword Art Online. O teto caiu, as paredes viraram ruínas e o arco da abóbada está partido.
- Tem cachoeira, lago com vitórias-régias, cerejeira florida e canteiros.

## Para outros agentes (Codex/ChatGPT)
- **Por onde começar:** `AGENTS.md`, depois `docs/flashcards/CONTINUAR.md` e `docs/PLANO-DE-IDEIAS.md`.
- **Efeitos visuais:** `python3 scripts/sprites/vfx.py` gera os efeitos e a prévia.
- **Cenários novos:** ficam em `scripts/cenarios/`.

## Depende de você
- Mandar o estilo visual dos monstros novos (ideia 52).
- Confirmar o som num celular real.
- Colar a parte 19 do SQL no Supabase.
