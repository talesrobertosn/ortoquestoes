# Abrigo das Águas — aprovado em 09/11/2026

Tales aprovou a prévia do pátio molhado com arco de pedra, lago, castelo, fogueira com espada e os três mascotes oficiais. Pediu publicá-la e organizar um sorteio por horário, igual para todo mundo.

## Arte e montagem

- Fonte reproduzível: `scripts/cenarios/inicio_abrigo.py`, usando os pincéis do acampamento e a paisagem do cais. Semente 20261109; pixel art 480×200, iluminação em float 3×, sombra dos pilares, reflexo do céu/castelo no lago, luz quente, névoa e bloom controlado.
- Seis WebPs: manhã/tarde/noite, 1440×600 e 960×400. A pintura contém pedras, lenha e cinzas; personagens, espada e chama são camadas React, preservando cliques, falas e os oito estados do fogo. Não pintar chama ou personagem duplicado no fundo.
- Âncoras próprias: fogo (274,151), mascote (293,103,42,60); gato inicialmente no tapete (222,149), coruja no pedestal (370,101), com alternativas livres. JSON em `scripts/cenarios/cena-abrigo.json`; contrato no catálogo `cenarios.ts`.
- No celular, o recorte acompanha o centro do abrigo (x≈300), para os três personagens ficarem à vista. Os cenários anteriores mantêm seus pontos e recortes.
- Tema da interface continua separado da iluminação do cenário. A preferência existente por manhã/tarde/noite permanece; o terreno sorteado é compartilhado.

## Rodízio compartilhado da inicial

Seis faixas fixas, no fuso **America/Sao_Paulo**: 00–04h, 04–08h, 08–12h, 12–16h, 16–20h e 20–24h. A lista de seis cenários é embaralhada uma vez por data com Fisher–Yates e gerador determinístico semeado pelo dia. Todos os aparelhos calculam a mesma ordem; não depende do fuso local, da conta, de `Math.random()` ou de armazenamento por visita. Cada cenário aparece uma vez por dia, permanecendo nas recargas até a próxima faixa.

O temporizador troca na virada da faixa. Ao voltar à aba ou janela, recalcula o cenário vigente; a troca remonta o palco para não carregar posições, balões ou animações do cenário anterior. A prévia explícita `#/?cenario=abrigo` continua disponível; a antiga preferência oculta `sessionStorage['inicio:cenario']` não interfere mais no rodízio normal. Não é necessário banco, RPC ou SQL.

## Validação

`fixtures/testar_cenarios_inicio.mjs`: quatro fusos, 120 dias sem repetição dentro do dia, limites exatos, recargas, catálogo imutável e as 36 imagens dos seis cenários. Incluído em `npm test`.

`fixtures/e2e_abrigo_inicio.mjs`: manhã/tarde/noite, imagem carregada, um mascote por tipo, presença dos bichos, pausa na fogueira e ausência de transbordamento de 320 a 1920 px. Temas claro/escuro e visitantes/contas, com API fictícia.

`fixtures/e2e_sorteio_inicio.mjs`: virada automática da faixa sem recarregar, reload estável e correção ao recuperar foco, usando relógio simulado.

## Diagnóstico da publicação (09/11/2026)

Os testes e o build passam; as falhas ocorrem em `actions/deploy-pages@v4` aguardando o estado `syncing_files`. A ação cancela a publicação após 600000 ms. O código oficial impõe `MAX_TIMEOUT = 600000` e limita qualquer entrada maior com `Math.min`; o ajuste temporário para 1200000 não tinha efeito e foi removido.

A última publicação real bem-sucedida analisada, 42692355781 (4e1f3d3b), levou 80 segundos na etapa publicar e tinha artefato de 214873267 bytes. A tentativa 42711442382 (4dc85d5c) tinha 215246316 bytes (+0,17%) e excedeu dez minutos. Houve falhas do mesmo tipo antes da integração do cenário. As seis imagens novas somam 262844 bytes. Logo, não há evidência de que a arte ou o pequeno aumento de tamanho tenham causado a falha.

O build local tem aproximadamente 414 MB de conteúdo em 28578 arquivos: 17634 JSONs no acervo e 8381 arquivos em questoes. O envio integral a cada mudança é um custo estrutural relevante, mas um pacote praticamente igual foi publicado em 80 segundos; tamanho sozinho não explica a falha intermitente.

A execução 42711249840 ficou verde, mas a etapa de deploy foi pulada porque outra atualização funcional já estava na branch. Verde no workflow não comprova publicação. É obrigatório conferir a conclusão da etapa e os arquivos da página pública.

Não foi possível comparar os hashes dos dois artefatos: o token permite ler os metadados, mas o download dos arquivos retorna HTTP 403. Os logs disponíveis mostram onde a sincronização para; não revelam a causa interna do serviço Pages. Não remover HTMLs, imagens ou dados do acervo como tentativa de reduzir tamanho sem validar seus consumidores e preservar as URLs públicas.

## Easter eggs da bonfire — correção de 09/11/2026

A espada visual já acompanhava a âncora própria do Abrigo, mas o botão invisível de toque, as faíscas e o balão ainda usavam as coordenadas do acampamento. Agora os três acompanham a mesma âncora `fogo`.

O primeiro toque no punho visível mostra “Conhecimento consolidado” e registra `chama-consolidada` no álbum local. Toques seguintes mostram as falas da espada; a pausa no fogo continua separada. A interação interrompe a conversa anterior, e o mascote suspende sua fala automática enquanto o easter egg responde. Balões evitam os botões da espada e do fogo. Quando os encaixes próximos não servem, a fala da espada procura outra faixa livre da cena, respeitando textos e bichos.

Regressão: `fixtures/e2e_bonfire_inicio.mjs`. O teste usa as coordenadas da lâmina desenhada para um toque real (não força um botão por seletor), confere faixa no primeiro toque, álbum, fala legível e o segredo de teclado `estus`, nos seis cenários, celular/computador e temas claro/escuro. Dados e API fictícios; nenhum progresso de estudo é alterado.
