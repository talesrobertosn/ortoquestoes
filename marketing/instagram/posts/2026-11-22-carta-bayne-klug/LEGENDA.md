# Domingo, 22/11: Carta de domingo (stories com alternativas)

```bash
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-22-carta-bayne-klug/stories.html
```

Modelo: `marketing/instagram/estilos/STORIES-COM-ALTERNATIVAS.md`. Questão `mao-0406` (**TEOT 2025**), gabarito oficial **D (tipo IV)**. Planejado com o Tales em 18/11/2026 (semana de 19 a 23/11).

| Horário | Arquivo | O que é |
|---|---|---|
| 8h ou 9h | `dom22-1-questao.png` | A carta com a radiografia presa com clipe e as alternativas para marcar; **colocar a enquete A, B, C, D** na área livre |
| 13h | `dom22-2-resposta.png` | A carta-resposta: D, a Fig. 38.1 do Green (tipos 2, 3 e 4) com legenda, o trecho do Green e do Tachdjian e a escala "conte os ossos" |
| 19h30 | `dom22-3-convite.png` | P.S. da carta: "Cada comentário é uma miniaula", telas reais (comentário, Atlas 3D, Resumos, Cronograma), as outras funções e "Comece a treinar grátis" |

Na enquete, as opções são só as letras A, B, C e D. Sem figurinha de link. Stories não levam legenda.

## Conferência

- Enunciado, alternativas e gabarito literais do acervo (`mao-0406`); trechos e números tirados do comentário (`conferido: false`, nada nas peças diz que foi revisado).
- Fontes: Green 7ª ed., cap. 38, Tabela 38.2, p. 1329 e Fig. 38.1, p. 1330; Tachdjian 6ª ed., cap. 12, p. 341.
- Área livre de pelo menos 450 px abaixo da dica no story 1; `conferir_pngs.py` sem problemas.

## Versão 2 (22/11/2026)

Refeita do zero a pedido do Tales: cantos arredondados, letra de leitura fácil (Plus Jakarta e Inter; a letra de mão
só no cumprimento e na assinatura), carta organizada em blocos, e um 3º story de propaganda. As telas do story 3 são
capturas reais já existentes, com a conta de exemplo ("Telas ilustrativas"): o comentário (`posts/2026-11-13-errata-metastases`),
o Atlas 3D (`posts/2026-10-27-atlas-3d`), a Biblioteca (`resumos-biblioteca`) e o cronograma (`marketing/kit/telas`).
"Até 20 questões comentadas por dia": `LIMITE_GRATIS_ATUAL = 20` em `src/config.ts` (verdade com o limite ligado ou desligado).
