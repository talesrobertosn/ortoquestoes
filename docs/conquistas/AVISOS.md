# Avisos de conquistas — contrato permanente

Decisão do Tales em 17/11/2026: retirar todas as visitas e surpresas do canto inferior esquerdo e substituí-las pelas conquistas reais do ranking. Preservar o catálogo e todas as medalhas já ganhas. O aviso de expectativa deve ter imagem e movimento diferentes da comemoração. A versão móvel é compacta. A proposta foi aprovada por prints e prévia animada; exemplos como “faltam 100 para mil” são exemplos, não regras fixas.

**Esta é a regra para Codex, Claude e qualquer agente que adicione ou altere conquistas.** Ler também `docs/emblemas.md` e `docs/design/DIRECAO-ARTISTICA.md`. Não recriar um sistema paralelo de popups. Não reativar `Encontros.tsx` no aplicativo.

## Uma fonte de verdade

- `src/estado/conquistas.ts`: catálogo `EMBLEMAS`, famílias, condições e métricas. Continua decidindo o que é conquistado. Nenhum requisito é reduzido para fazer um aviso aparecer.
- `src/estado/usarConquistas.ts`: métricas reativas de respostas, histórico, notas, favoritos, Biblioteca, Flashcards e feitos do servidor. O aviso aguarda a carga inicial do acervo, dos feitos e do progresso sincronizado.
- `src/conquistas/catalogoAvisos.ts`: triagem obrigatória de **cada família** (`PERFIS_AVISOS`), cenários e unidades do texto. Tipado como `Record<FamiliaId, PerfilAviso>`: uma nova família sem perfil não compila.
- `src/conquistas/motorAvisos.ts`: primeira carga silenciosa, fila de desbloqueios, prioridade, contexto e limites dos lembretes. Não altera progresso ou desbloqueia medalhas por conta própria.
- `src/conquistas/AvisosConquistas.tsx`: observa as métricas e apresenta os avisos nos momentos permitidos. Usa armazenamento separado por conta; Web Locks coordenam a apresentação entre abas do mesmo navegador.
- `src/conquistas/CartaoConquista.tsx` e `avisos.css`: componente único para produção e prévias. A medalha é o mesmo componente `Medalha` do ranking, nunca uma aproximação desenhada no popup.

## Os dois estados

**Expectativa:** objeto fechado por cenário (baú, pergaminho, livro, cartas, mapa, estandarte, carta ou relicário). Luz contida, entrada de baixo para cima, pequena elevação do objeto e barra de progresso. Não mostra a medalha final como se já fosse conquistada. Texto com a unidade exata da família, sem prometer que uma questão domina automaticamente um tema.

**Comemoração:** medalha real, nome e critério do catálogo; subida e revelação da arte, breve halo, raios e partículas. Cor de acabamento pelo nível: bronze, prata, ouro, esmeralda ou lendário. Permite abrir o emblema exato no inventário, mesmo se o filtro atual esconder medalhas conquistadas. Vários desbloqueios juntos são agrupados num cartão que destaca o mais raro e informa quantos outros vieram.

As artes de expectativa são próprias, em pixel art, geradas por `python3 scripts/conquistas/gerar_expectativas.py`; arquivos em `public/conquistas/expectativa/`. Nada de imagens externas ou geradas por IA. Animação não toca som e respeita `prefers-reduced-motion`. No celular, arte de 64 px, texto compacto e cartão acima do menu; fechar continua com alvo de 44 px. Títulos longos devem caber sem rolagem lateral.

## Seleção e momento

Todo emblema real pode gerar comemoração, inclusive secretos e dependentes de servidor. Secretos só são revelados depois de conquistados. A primeira carga importa as conquistas anteriores em silêncio, evitando uma avalanche após atualizar ou sincronizar pela primeira vez. Depois, novos desbloqueios ficam numa fila persistente até uma oportunidade adequada; o que já foi apresentado não se repete ao recarregar.

A proximidade é uma triagem, não uma obrigação para cada medalha:

- Habilitar somente contagens diretas, com unidade verdadeira e sem condição oculta. Exemplos: questões diferentes, acertos, revisões, erros corrigidos, anotações, marcações e flashcards dominados.
- Percentuais, recordes de sequências, velocidade, datas, pódios e condições compostas comemoram o desbloqueio, mas não prometem “faltam N questões”. O melhor recorde passado não é a sequência atual.
- Só sugerir uma família adequada ao contexto e cuja métrica tenha avançado numa ação local. Uma sincronização recebida não é tratada como resposta que a pessoa acabou de dar.
- Até os últimos 10% da meta, com no mínimo a janela de três ações e no máximo 100 restantes; progresso de pelo menos 80%. Assim há tanto “faltam 3” quanto marcos maiores, sem limitar tudo ao exemplo de mil questões.
- Uma meta não reaparece no mesmo contexto; guarda os últimos 50 contextos, inclusive ao ir à Biblioteca e voltar para a sessão. No máximo duas por sessão (ou por dia na Biblioteca/Flashcards), cinco minutos e dez ações entre lembretes. Metas que esperaram mais de 90 segundos são descartadas. A contagem é reconferida antes de aparecer.
- Durante questões, só depois da resposta. Não cobrir enunciado enquanto a pessoa escolhe. Conquistas reais têm prioridade sobre incentivo.
- Simulados, Nacional, cronômetros ativos, combate de Flashcards, diálogos, cookies, formulários em edição e outros cartões adiam a apresentação. Conquistas ficam na fila; o combate entrega na volta à central.
- Os popups funcionais do treino e as `ConquistasDoDia` anteriores permanecem, conforme a exclusão pedida pelo Tales. O novo cartão espera esses avisos saírem para não empilhar. Convites comerciais também respeitam a aparição das conquistas.

Preferências em Minha conta: mostrar avisos de conquistas e, separadamente, acompanhar metas. Reutiliza a escolha anterior de desligar avisos; não força quem já tinha desativado. Desligar não acumula uma fila para despejar depois.

## Persistência e limites

`conquistas:avisos:v1` guarda os ids conhecidos, a fila e as metas já mostradas no armazenamento **da conta neste navegador**. Não muda Auth, banco, preços, limites ou quais medalhas pertencem à pessoa. Os feitos reais continuam usando o mecanismo existente de sincronização e registro de conquistas. A troca de conta invalida também os retratos em memória dos hooks de armazenamento, desmonta o controlador e separa sua memória; reiniciar o progresso troca a geração dos avisos.

A memória de avisos não é sincronizada entre aparelhos. Uma instalação nova estabelece sua linha de base silenciosamente; dois aparelhos que já tinham a funcionalidade podem comemorar a mesma conquista nova uma vez cada. Não prometer deduplicação global entre dispositivos. No navegador, abas com Web Locks não consomem a mesma fila duas vezes; sem essa API usa a fila compartilhada como melhor esforço.

## Ao adicionar um achievement

1. Acrescentar id estável, família, nível, requisito e métrica em `EMBLEMAS`, conforme `docs/emblemas.md`. Preservar medalhas anteriores.
2. **Família existente:** o novo emblema entra automaticamente nos avisos e na galeria de prévias. Não criar outro gatilho ou outra lista de ids no controlador.
3. **Nova família:** acrescentar `FamiliaId`, `FAMILIAS` e um perfil em `PERFIS_AVISOS`. Escolher o cenário e decidir explicitamente se pode ter acompanhamento. Se houver condição composta, percentual ou segredo, deixar acompanhamento desligado. Para contagem nova, conferir singular/plural em `unidadeRestante`.
4. Criar a medalha real em `public/emblemas/<id>.png` e incluí-la em `EMBLEMAS_COM_IMAGEM`. O teste exige a arte tanto da medalha quanto da expectativa e limita tamanho de arquivo.
5. Conferir `#/dev/conquistas?emblema=<id>&tipo=ganha` e, quando elegível, `tipo=perto`, com `npm run dev`. A galeria usa o componente real, tem todos os ids e botão de repetir animação; só existe em desenvolvimento e não grava progresso. Ver em 320 e 390 px, computador, claro/escuro e movimento reduzido.
6. Se a métrica vem do servidor, atualizar a fonte depois da confirmação, nunca otimisticamente. `atualizarFeitos()` refaz `meus_feitos` após uma ação local (ex.: avaliar comentário); consulta normal e retomada atualizam em até dez minutos, sem chamadas por resposta. Andares dos Flashcards usam o evento de `registrarAndar` confirmado, seguido de `meus_recordes_flashcards`: editar um recorde local não concede medalha de servidor. Filas de consulta e registro são separadas por conta.
7. Rodar `node fixtures/testar_avisos_conquistas.mjs`, `node fixtures/testar_conquistas.mjs`, `CHROMIUM=/usr/bin/chromium npm run e2e:conquistas`, `npm test`, `npm run build` e `git diff --check`. O teste de cobertura faz parte de `npm test` e do CI: medalha sem perfil ou arte não passa silenciosamente.

Testes devem usar métricas verdadeiras e interfaces isoladas do Supabase. Não editar conquistas de uma conta real para obter uma captura.


## Verificações desta entrega

- Motor: cobertura dinâmica dos 229 emblemas/55 famílias existentes, PNGs e registros de arte, perfil por família, segredos, importação silenciosa, agrupamento, novas metas, metas distantes, teto, pausa, retorno entre contextos, valores reconferidos e reinício.
- Navegador com Supabase simulado: resposta pela UI aos 47/50, comemoração aos 50, link para a medalha exata, reload, meta de 900/1.000, preferência desligada, origem validada de andar, Conselho editorial confirmado, troca de conta sem recarregar, galeria por cenário, 320–1920 px, título longo, temas claro/escuro e movimento reduzido.
- Nenhuma conta real ou medalha de produção foi alterada para produzir os testes e capturas. A integração usa as APIs e condições já existentes; não requer nova migração SQL.
