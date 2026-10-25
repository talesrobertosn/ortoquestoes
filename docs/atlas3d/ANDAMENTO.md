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

## Pendências
- Fichas de músculos, nervos e vasos (origem, inserção, inervação, relevância cirúrgica): só com fonte conferida.
- Nomes em português de vasos e de estruturas fora do foco ortopédico (ver NOMES.md).
- Modo estudo ("o que é isso?"), comparação lado a lado, pontos anatômicos dos ossos na ficha (dados em pontos.json).
- Rádio distal do adulto: falta o capítulo do Rockwood na Biblioteca; hoje a ficha usa o resumo pediátrico.
