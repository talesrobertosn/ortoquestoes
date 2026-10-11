# Netter: anatomia da mão

Engenharia reversa iniciada em 10/10/2026. Referência: Netter, Atlas de Anatomia
Ortopédica, 2ª edição, capítulo 6, Mão. Somente anatomia, conforme o pedido do dono.

## Recorte e evidência

Lidos os 102 candidatos do regex regional e selecionados 24 registros anatômicos,
com lista e conteúdo em [netter-mao-recorte.json](netter-mao-recorte.json).
Há 15 registros datados e nove TEOT/TARO sem ano. Os sem ano ampliam o repertório,
mas não sustentam repetição anual ou tendência recente. Foram excluídos antebraço,
ombo, exames, doenças e tratamentos; a anatomia pertinente do capítulo foi separada
antes da escrita. Os documentos amplos continuam em [anatomia-teot-taro.md](anatomia-teot-taro.md).

## Fatos repetidos e forma de cobrar

- Interósseo dorsal: identificação no TEOT 2024 (`mao-0313`) e TARO 2025
  (`mao-0442`), com interósseo palmar e músculos do polegar como distratores.
- Lumbrical: identificação no TEOT 2023 (`mao-0166`) e TEOT 2025 (`mao-0417`),
  comparado com interósseos e flexores digitais. O TARO 2014 (`mao-0084`) cobra
  ação na metacarpofalângica e interfalângica proximal.
- Inervação após reconhecimento visual: TEOT 2023 (`mao-0165`) e TARO 2021
  (`mao-0040`, `mao-0170`). O enunciado não fornece o nome do músculo: reconhecer
  a anatomia e recuperar seu atributo são duas etapas. A identificação do alvo
  deve ser conferida na figura, não inferida apenas da letra do gabarito.
- Circulação: TEOT 2024 (`mao-0314`) identifica a principal do polegar; TARO
  2006 (`mao-0632`) contrapõe radial e ulnar no arco superficial, sem gabarito
  oficial confirmado. Perguntar o arco profundo oferece outro ângulo do mesmo mapa.
- Aparelho extensor: TEOT 2021 (`mao-0109`) identifica banda lateral. O capítulo
  permite distinguir banda central, lateral e tendão terminal por inserção.
- Planos tendíneos: TARO 2024 (`mao-0342`) identifica o flexor longo do polegar
  numa secção transversal. A anatomia do túnel pode orientar a leitura, mas o novo
  lote não repete as questões já publicadas de inserção dos flexores do antebraço.

## Tendência e pensamento do examinador

Em 2021–2025, o recorte privilegia imagem curta com comando “o músculo”, “a
estrutura” ou “é inervado pelo”. A recorrência é documentada nos itens acima;
não há tamanho de amostra para afirmar que um músculo tenha se tornado o mais
cobrado ou que um assunto tenha desaparecido. Os pares cruzam estruturas vizinhas
com nervo, ação ou fixação. Os distratores têm anatomia válida em outra estrutura:
um oponente insere no metacarpo, enquanto outros músculos do polegar chegam à
falange proximal; dorsal abduz e palmar aduz; os arcos trocam sua contribuição
predominante. Essa diferença concreta orienta as alternativas e os comentários.

## Fonte, limites e divergências

A anatomia útil está nas seções Osteologia, Tendões, Articulações, Outras Estruturas,
Origens e Inserções, Músculos, Nervos e Artérias. Exame físico, doenças, trauma e
procedimentos não entram. As folhas do arquivo isolado aparecem somente no plano
interno e em `origem.pagina`; não são apresentadas ao aluno como páginas do livro.

Algumas formulações do material não são seguras como resposta isolada: a tabela
atribui “pronação palmar” ao abdutor curto; outra passagem pode sugerir inserção dos
flexores digitais na lâmina palmar; o texto de oposição menciona articulação MCF.
Não transformar esses trechos em perguntas. Usar as fixações inequívocas da
ilustração e as relações nervosas consistentes. Não perguntar porcentagens de
variantes vasculares nem impor uma anatomia variável como universal.

## Plano e imagens

[Plano anterior à escrita](netter-mao-plano.md): 26 questões propostas, 17 visuais.
Sete adaptações previstas: lumbrical, interósseo dorsal, adutor e oponente do
polegar, polia A2, banda central e arco profundo. Reconhecimento pode ser seguido
por origem, inserção, ação ou inervação, sem repetir o mesmo comando.

Remover nomes e linhas que entreguem o alvo, preservar a anatomia e a orientação
e usar uma seta amarela com contorno escuro. Abrir original, adaptação e apresentação
no celular antes de publicar. A legenda pública deve conter apenas a bibliografia,
sem narrar edição, nome de arquivo ou instruções de produção. Os comentários
explicam anatomia, sem blocos sobre a existência da questão ou sobre a banca.

## Estado

Lote aplicado: `mao-1643` a `mao-1668`, 26 questões de anatomia, 17 com figura.
Cobertos lumbricais, interósseos, adutor e oponente do polegar, palmar curto,
flexor curto, polias, aparelho extensor, arcos e ligamentos cutâneos.
Gabarito A: 6, B: 6, C: 7, D: 7; comentário completo mediano de 1.427 caracteres.
Tabela de IDs e motivos em [netter-mao-entrega.md](netter-mao-entrega.md).

Figuras adaptadas com ferramenta de edição a partir das ilustrações fornecidas,
comparadas às originais. A primeira seta do interósseo tocava o osso e foi refeita
para apontar claramente o ventre. Nomes e linhas de identificação foram removidos;
a legenda pública contém apenas a bibliografia. A adaptação foi conferida por alvo,
orientação e relações pertinentes, sem atribuir revisão médica individual.

Exame, doenças, procedimentos, percentuais de variantes e formulações ambíguas do
capítulo ficaram fora. Essa exclusão segue o recorte de anatomia e o mapa, sem
transformar possíveis erros de tabela em gabaritos autorais.

Validação sem erros, build, testes e fixture de revisão passaram. Os 26 comentários
carregaram com quatro análises e as 17 imagens apareceram. As sete adaptações foram
conferidas também no celular, sem transbordamento. Questões oficiais e comentários
anteriores foram comparados ao commit anterior e preservados integralmente.
