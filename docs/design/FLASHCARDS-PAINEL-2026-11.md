# Flashcards: reforma da central e do Arquivo da Vila

Pedido do Tales em 13/11/2026: avaliar e repaginar a página por completo, incluindo a pintura HD-2D. Referência de acabamento: Desempenho e a nova Revisão; superfícies claras, verdete, tipografia de leitura e dados acessíveis. Implementação isolada em `codex/flashcards-redesign`. A autonomia de publicação vigente está em `CLAUDE.md`; o pedido atual não impôs restrição adicional.

## Avaliação que guiou a reforma

- O vidro escuro cobria a janela e metade do cenário. A pintura foi separada dos textos e controles; a missão vem antes dela, inclusive no celular.
- O primeiro bloco não mostrava o tamanho real da fila nem os flashcards distintos estudados. Ambos agora ficam junto da ação principal, com contagens do acervo carregado.
- Faltava uma alternativa explícita para pouco tempo. Sessões de 5, 10 ou 20 flashcards usam as rotas e filtros reais; revisões vencidas têm prioridade, com novos quando não há pendentes. A escolha é apenas o tamanho dessa sessão, sem alterar o cronograma.
- O aprendizado estava escondido em outra página. O panorama mostra cobertura por situação e atividade dos sete dias reais, com tabela; nenhuma atividade anterior é inventada.
- A escolha por área era apenas um select. A grade pesquisável permite encontrar a área sem perder o select nem o refinamento por assunto.
- Os dados do gráfico diário só apareciam no atributo `title`. Botões selecionam o dia com leitura persistente e a tabela expõe todas as linhas, incluindo datas sem respostas.
- A arte tinha grandes superfícies vazias e poucos materiais. O Arquivo ganhou detalhes e fontes de luz que iluminam os objetos, com os mascotes em postos próprios.

## Arte reproduzível

`python scripts/gerar_cena_flashcards.py` (numpy e Pillow) gera manhã, tarde e noite em 1440 × 600 e 960 × 400. As versões de 1440 ficam entre 55 e 63 KB; as de 960 entre 28 e 33 KB. A página carrega somente o período atual. `arquivo-ancoras.json` registra postos e geometria. Os arquivos existentes mantêm os nomes, com versão na URL para invalidar cópias antigas da pintura.

Quatro passagens revisadas visualmente:

1. Caixotões, estantes superiores, lombadas individuais, gavetas polidas, ferragens, relógio de mesa, planta, lanternas, bancada, livro aberto, lupa e cesto.
2. Cortina de linho verde, credenza com portas, caixas de tecido, cerâmica, plantas, alvenaria e luminária suspensa. Ajuste do contraste e da intensidade quente.
3. Detalhes da vila pela janela; inspeção da versão noturna e integração dos mascotes nos postos pintados.
4. Sombras de contato dos móveis, equilíbrio da luz no livro, versão matinal e recortes responsivos. A pintura é estática, sem flutuação/zoom por hover; partículas e sprites próprios pausam fora da tela, na aba oculta e em movimento reduzido.

Nenhum personagem novo, imagem externa, conteúdo médico ou símbolo religioso. Coruja e gato usam as folhas aprovadas e as falas centralizadas. Os botões são acessíveis por teclado e têm alvo mínimo de 44 px.

## Funções preservadas

- [x] Central, Desempenho e Cronograma com as mesmas rotas e abas.
- [x] Ação contextual: pendentes, cronograma, início ou Biblioteca.
- [x] Revisões de hoje, Errei, Hesitei e Nunca estudados.
- [x] Estudo por área e refinamento área → grupo → assunto, com os mesmos parâmetros.
- [x] Biblioteca, Torneio e ranking, recorde e progresso.
- [x] Cronograma sugerido/salvo, meta do dia, amanhã e ajustes.
- [x] Opinião, convite, estados de envio/erro, foco e fechamento.
- [x] Períodos 7/30/90, totais, autoavaliações, pontos fracos e áreas.
- [x] Erro no acervo com aviso e Tentar de novo.
- [x] Claro/escuro, períodos independentes e movimento reduzido.
- [x] Motor, intervalos, limites, acesso, assinatura, sincronização e progresso inalterados.

Não foram modificados o jogo, o conteúdo dos flashcards ou as regras do servidor. A central filtra as contagens operacionais pelos IDs disponíveis, sem excluir registros antigos. O indicador de ciclo completo usa a mesma função `dominada` já existente; não redefine domínio.

## Verificação

- `npm test`, `npx tsc --noEmit -p .`, `npm run build`.
- `fixtures/flashcards_painel_roteiro.mjs` com capturador e conta/servidor falsos: sessões curtas, busca acentuada, 60 registros de exemplo, diário de sete dias, mascotes, pintura estática, limites dos visitantes dentro da cena, larguras 320/360/390/430/768/1024/1440/1920, períodos e tabela no Desempenho, acesso ao Cronograma.
- `fixtures/flashcards_estados_roteiro.mjs`: visitante e falha no índice, erro explícito, busca vazia, teclado/foco na opinião e movimento reduzido.
- `fixtures/e2e_filtro_flashcards.mjs`: fluxo real de refinamento e sessão, computador e celular.
- Capturas locais em `/tmp/oq-flashcards-final`, com cenários e dados de exemplo identificados; galeria em `/Users/talesroberto/Downloads/Previa-Flashcards-OrtoQuestoes`.

Limites: tempo da sessão é uma estimativa de 30 segundos por flashcard, como no cronograma existente. Autoavaliação e acerto objetivo continuam diferentes. Os números de exemplo das capturas não são dados de usuários. Testes de emulação não comprovam som ou desempenho em um celular físico.
