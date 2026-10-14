# Ideia 51: três cenários pendentes

14/10/2026. Implementação para revisão no [PR draft #247](https://github.com/talesrobertosn/ortoquestoes/pull/247), sem merge.

- `treino`: **Pátio dos Estandartes**, galeria de madeira, alvo de palha, banco, vasos e flâmulas em luz de manhã.
- `arquivo`: **Arquivo dos Mapas**, estantes, plantas arquitetônicas geométricas, mesa, mapas enrolados e lanternas.
- `torre`: **Terraço do Horizonte**, parapeito acima das nuvens, montanhas, estandartes e braseiros ao pôr do sol.

Cada script gera quatro camadas em 520×330 e 250×470, registradas em `CENAS_PINTADAS`. `acabamento.py` compartilha somente pequenas rotinas de materiais, lajes, vasos e luz; a composição de cada cena é própria. Toda arte foi desenhada por script com numpy e `pintor.Tela`.

A ideia 51 fica concluída quanto aos cenários já usados pelo jogo. Os biomas apenas propostos no plano continuam futuros. O tema antigo "deserto dos ossos" foi renomeado **Deserto das Dunas Douradas** e deve usar dunas, ruínas, tecidos e lanternas, sem anatomia.

Reproduzir: `python3 scripts/cenarios/treino.py`, `python3 scripts/cenarios/arquivo.py`, `python3 scripts/cenarios/torre.py`. Para ver no app: `window.__torneio.cena('treino')` (ou arquivo/torre).

Validação: `npx tsc -b`, `npm test`, build e captura das três cenas em 1400×860 e 390×844, com verificação de carregamento das oito camadas e ausência de rolagem horizontal. Capturas: `capturas/cenarios-14-10/`. Nenhuma mudança em monstros, conteúdo médico, plano, SQL ou dados de usuários.
