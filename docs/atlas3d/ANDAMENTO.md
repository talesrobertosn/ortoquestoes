# Atlas Ortopédico 3D: andamento

## Feito (25/10/2026)
- Auditoria: repositório em ~/OrtoQuestoes-Biblioteca/anatomy-atlas-3d-main (sem GLB). Assets obtidos do APK oficial
  v0.1.3 (GitHub Releases do autor, autorizado pelo Tales) e extraídos em ~/oqsp/atlas-dl/ext.
- `scripts/atlas3d/preparar_assets.mjs` gera `public/atlas3d/v1/`: 10 GLB Draco (29 MB, sem alteração), decodificador
  Draco do three 0.170, `estruturas.json` (2.792 estruturas: id, camada, lado, EN, latim TA2, caixa em mm; 78 KB gzip),
  `pontos.json` (1.385 pontos), `LICENCAS.md` (CC BY-SA 2.1 JP / 4.0, MIT).
- Dependências: three@0.170.0 e @types/three@0.170.0.

## Fatos do modelo
- Unidade mm; Z para cima (pés ~0, cabeça ~1.700); esquerda = +X; anterior = −Y; posição anatômica.
- Cada nó do GLB = id estável do catálogo; só POSITION (calcular normais no carregamento); DoubleSide.
- As correções por malha do visualizador original usam ids antigos (ZA*/FMA*) que não existem na v3: não se aplicam.

## Próximos passos (ordem)
1. `src/atlas3d/` com motor (renderer sob demanda, OrbitControls, pixel ratio adaptativo), carregador por camada com
   Cache Storage, materiais compartilhados por camada, seleção por raycast (clique repetido alterna estruturas
   sobrepostas), foco animado, vistas, cortes (plano axial/sagital/coronal).
2. Página `#/atlas` (rota em App.tsx, preCarga, MenuGeral grupo Estudar), layout tela cheia, painéis desktop e bottom
   sheets no celular; CSS em src/estilos/paginas/Atlas3D.css com os tokens do site.
3. Regiões ortopédicas pelas caixas (ombro, cotovelo, punho e mão, coluna, pelve e quadril, joelho, tornozelo e pé).
4. Nomes em português revisados (arquivo próprio; sem tradução automática), fichas anatômicas só com dados verificados.
5. Orçamento de chunks: o three passa de 120 KB gzip; abrir exceção documentada em fixtures/testar_orcamento_chunks.mjs.
