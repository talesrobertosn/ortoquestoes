# Nomes em português do Atlas 3D

Sem tradução automática. A ordem de prioridade do nome mostrado (src/atlas3d/dados/nomes.ts, `nomeDe`):

1. **Escrito à mão:** ossos em `nomes.ts` (dicionário e regras fixas para falanges, metacarpos, metatarsos, costelas e
   vértebras); partes moles de interesse ortopédico em `nomesPt.ts`; nomes do banco anatômico conferido.
2. **Terminologia Anatômica (TA2) em português** (desde 11/11/2026): `public/atlas3d/v1/nomes-ta2.json`, gerado por
   `scripts/atlas3d/preparar_extras.mjs` a partir da coluna portuguesa do `TA2.csv` do Z-Anatomy. Cobre 2.898 das
   3.048 estruturas (órgãos, encéfalo, vasos, linfonodos, músculos da cabeça, regiões). O script descarta a coluna
   quando ela só repete o inglês ou o latim, e acerta a grafia brasileira (linfonodo em vez de "nódulo", "-oide" sem
   acento pelo Acordo de 1990, "livre" em vez de "libre", sistema digestório). Correções pontuais ficam em `MANUAL`.
3. **Inglês do catálogo**, com o latim embaixo e a nota de "nome em revisão" (cerca de 150 estruturas, quase todas
   sulcos e giros do encéfalo e ramos corticais de artérias).

A hierarquia mostrada na ficha ("Sistema muscular › Músculos do membro superior › Compartimento anterior do braço")
vem do Z-Anatomy (`arvore.json`), com os mesmos nomes da TA2. Revisão do Tales: pendente.
