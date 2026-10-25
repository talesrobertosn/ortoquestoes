# Atlas Ortopédico 3D: origem e licenças dos modelos

Os arquivos desta pasta (modelos/*.glb, estruturas.json e pontos.json) são materiais derivados e
**não** fazem parte do código do OrtoQuestões. Eles seguem as licenças das fontes abaixo.

## Geometria 3D (CC BY-SA)

Adaptada pelo projeto Anatomy Atlas 3D (Grypa-JJ, https://github.com/Grypa-JJ/anatomy-atlas-3d,
pacote da versão 0.1.3) a partir de:

- **BodyParts3D**, © The Database Center for Life Science (DBCLS),
  https://lifesciencedb.jp/bp3d/ · licença **Creative Commons Atribuição-CompartilhaIgual 2.1 Japão
  (CC BY-SA 2.1 JP)**. Mitsuhashi N. et al., BodyParts3D: 3D structure database for anatomical
  concepts. Nucleic Acids Research 37 (2009): D782–D785.
- **Z-Anatomy**, https://www.z-anatomy.com/ · licença **Creative Commons
  Atribuição-CompartilhaIgual 4.0 (CC BY-SA 4.0)**. O Z-Anatomy se baseia no BodyParts3D.

Os GLB são distribuídos aqui sem modificação geométrica. Esta pasta, e qualquer modificação dos
modelos, permanece sob CC BY-SA, com os créditos acima.

## Nomes e dados

- Identificadores e nomes em inglês: catálogos do Anatomy Atlas 3D (código MIT).
- Nomes latinos: correspondência do Anatomy Atlas 3D com a Terminologia Anatomica 2 (FIPAT).
- Pontos anatômicos dos ossos (pontos.json): Anatomy Atlas 3D, a partir das fontes acima.
- Nomes em português: tradução própria do OrtoQuestões, em revisão (ver docs/atlas3d/).

## Código de origem

O visualizador original é licenciado sob MIT (© Grypa-JJ). O Atlas Ortopédico 3D do OrtoQuestões
é uma reimplementação própria; o three.js (MIT) e o decodificador Draco (Apache-2.0, © Google)
vêm do pacote npm `three`.

Este material é educativo. Não é ferramenta diagnóstica nem cirúrgica e não representa todas as
estruturas ou variações anatômicas humanas.
