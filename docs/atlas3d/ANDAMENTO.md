# Atlas Ortopédico 3D: andamento

Rota `#/atlas[/<região>]?e=<id>&f=<proximal|diafise|distal>&lado=d|e&c=<camadas>`. Abre como pop-up por cima do
site (como os flashcards; `App.tsx` trata `atlas` como sobreposto e o X volta à página de origem). Menu: grupo
Estudar, "Atlas 3D · Beta". Código em `src/atlas3d/` (motor, carregador, dados, ui); estilos em
`src/estilos/paginas/Atlas3D.css` e `src/estilos/componentes/VerNoAtlas.css`.

## Como funciona
- Assets em `public/atlas3d/v1/` (GLB Draco do Anatomy Atlas 3D 0.1.3, licenças em `LICENCAS.md`), preparados por
  `scripts/atlas3d/preparar_assets.mjs`. Cada GLB é baixado só quando a camada é ligada e fica no Cache Storage
  (`atlas3d-v1`); a geometria decodificada fica na memória enquanto a pessoa navega.
- Motor (`motor/Motor.ts`): renderização sob demanda, resolução menor durante o giro, materiais compartilhados por
  camada, seleção por raycast (clicar de novo no mesmo ponto pega a estrutura de baixo), destaque só da faixa do osso
  longo (proximal, diáfise, distal), foco animado, vistas, cortes, margens de câmera para a ficha e a gaveta.
- Fichas (`dados/fichas.json`): parte do esqueleto → subtemas de lesão, termos de anatomia, seções de classificação
  dos resumos da Biblioteca (mostradas na ficha). `scripts/atlas3d/vincular_questoes.mjs` gera
  `public/atlas3d/v1/questoes.json` (questões de anatomia e de lesão de cada ficha). Rodar de novo ao importar questões.
- Questões dentro do atlas: `ui/PainelQuestoes.tsx` usa a `QuestaoDireta` (conta, limite e registro como no resto do site).
- Na questão: `ui/VerNoAtlas.tsx` (osso em pixel art abaixo do livro da Biblioteca) abre o atlas na ficha ligada.

## Acesso (pedido do Tales, 25/10/2026)
- Sem conta: vê o atlas com os ossos; ligar ou desligar camadas abre o convite para criar a conta grátis.
- Conta grátis: ossos e músculos. Outras camadas aparecem por 3 s e então o convite (gentil) para assinar.
- Assinante: todas as camadas.

## Banco anatômico (25/10/2026)
- Origem, inserção, inervação, ação, ligamentos e nervos, com o Netter de Anatomia Ortopédica como fonte, em lotes
  conferidos por região: [BANCO-ANATOMICO.md](BANCO-ANATOMICO.md) e [COBERTURA-ANATOMIA.md](COBERTURA-ANATOMIA.md).
- Ficha anatômica (`ui/FichaAnatomica.tsx`), relações no modelo (`dados/relacoes.ts`, `Motor.mostrarRelacoes`) e aba
  Inserções na ficha dos ossos.

## Z-Anatomy completo (11/11/2026)
- Fonte: `C:\Users\tales_zh0ni7\zanatomy` (fora do git): `Startup.blend` do Z-Anatomy e `TA2.csv`. Blender 3.6.23
  instalado; rodar sempre com `--background --factory-startup --disable-autoexec` (ler o texto das etiquetas trava o
  Blender). Scripts: `scripts/atlas3d/blender/inventario.py` e `exportar_extras.py`, depois
  `node scripts/atlas3d/preparar_extras.mjs <pasta zanatomy>`.
- Inventário: 7.184 objetos (4.569 malhas, 951 curvas, 1.660 etiquetas). A geometria anatômica já estava quase toda no
  site (vinda do Anatomy Atlas 3D 0.1.3). O que entrou agora:
  - **Áreas de origem e inserção** (705, `insercoes.json` + `modelos/insercoes.glb`, baixado só quando uma área
    aparece): na ficha do músculo, a origem e a inserção acendem a área exata no osso (com reflexo translúcido quando
    os músculos estão ligados); na ficha do osso, "Pintar as áreas no osso" e a lista de todos os músculos desenhados.
    Músculos fora do banco conferido (cabeça, tronco) ganham origem e inserção pelos ossos das áreas.
  - **Regiões do corpo** (256, camada `region` → grupo `regiao`, translúcida, em Personalizar).
  - **Nomes em português da TA2** para 2.898 das 3.048 estruturas (ver NOMES.md).
  - **Onde fica**: trilha sistema › parte na ficha e "Parte de: …" no cartão rápido (`arvore.json`).
- O Z-Anatomy não tem o aparelho reprodutor feminino nem os músculos intrínsecos da língua separados.
- Netter, Atlas of Human Anatomy, 6ª ed. (inglês), em `OrtoQuestoes-Biblioteca\livros`; texto extraído com
  `pdftotext -layout` em `OrtoQuestoes-Biblioteca\netter6-texto\netter6.txt` (página = posição no PDF). Tem as tabelas
  de músculos (origem, inserção, inervação, ação, irrigação) e textos por região: fonte das fichas não ortopédicas.

## Fichas de todo o corpo e pelve feminina (11/11/2026)
- Lotes 30, 31, 40, 50, 51, 60, 70, 80, 90 e 95 em `scripts/atlas3d/anatomia/`: 563 registros, 1.586 malhas com ficha.
  Fonte principal das partes não ortopédicas: Netter 6ª (tabelas de músculos nas pp. 170–175, 205–206, 273, 365, 438;
  guia de estudo nas pp. 588–723). A medula usa o Netter ortopédico (pp. 76–77, tratos e síndromes).
- Pelve feminina: `scripts/atlas3d/blender/exportar_feminino.py` (HuBMAP CCF v1.2, CC BY 4.0) → `modelos/female.glb`,
  camada `female`/grupo `feminino`; ligar esconde os órgãos masculinos (`SO_MASCULINO` no Motor). A posição é aproximada
  (encaixe pela pelve + ajuste de 40 mm para trás e 8 mm para cima). Não há vagina nem genitália externa feminina.
- Sem ficha ainda: as regiões do corpo (só a trilha e o nome), frênulos da cápsula do quadril, cartilagem trirradiada,
  sínfise sacrococcígea, ligamento transverso inferior da escápula, o oponente do dedo mínimo do pé, o temporoparietal,
  o arco iliopectíneo e o nervo do quadrado femoral que o modelo põe na camada do encéfalo.

## Pendências
- Vasos (artérias e veias) no banco anatômico; músculos do tronco e da cabeça (fora do livro de referência ortopédico).
- Conflitos e pendências do banco: ver COBERTURA-ANATOMIA.md.
- Nomes em português de vasos e de estruturas fora do foco ortopédico (ver NOMES.md).
- Modo estudo ("o que é isso?"), comparação lado a lado, comparação de lados.
- Rádio distal do adulto: falta o capítulo do Rockwood na Biblioteca; hoje a ficha usa o resumo pediátrico.
