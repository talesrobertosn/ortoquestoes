# Roteiro

Marque `[x]` ao concluir e anote a data e o PR. Uma etapa só começa quando a anterior estiver aprovada pelo Tales.

## Etapa 0: visão e protótipo
- [x] Brainstorm e decisões registradas (12/10/2026)
- [x] Documentação em `docs/flashcards/` (12/10/2026)
- [x] Protótipo visual `prototipos/flashcards/torneio.html`, com Estudo, Batalha e 3 cenários (12/10/2026)
- [x] Referências visuais do Tales registradas em REFERENCIAS.md (12/10/2026)
- [x] Protótipo 2: testado com prints, corrigido, com mais efeitos visuais, promovido a `torneio.html` e publicado (12/10/2026)
- [x] O Tales avaliou o protótipo 2 (12/10/2026): seguir, Batalha primeiro, arte estilo Runeterra/Hearthstone, texto legível no celular
- [ ] Respostas às decisões pendentes de [DECISOES.md](DECISOES.md)

## Etapa 1: fábrica de flashcards
- [ ] `scripts/flashcards/gerar.py`: tipo "Na prova" (lacunas nos negritos), ordenado por incidência
- [ ] Tipos Tabela e Imagem
- [ ] Anatomia dos Simulados (todas as questões de anatomia com seta)
- [ ] `conferir.py`: validador (lacuna sem termo, número solto, texto longo, travessão, id inexistente)
- [ ] Amostra de cerca de 30 flashcards para o Tales aprovar
- [ ] Publicar o primeiro baralho: prioridade máxima mais anatomia
- [ ] Tipos Par confundível e Armadilha (assistidos por agente, com revisão)

## Etapa 2: modo Estudo no site
- [ ] Aba Flashcards em Treinar e tela de entrada (Estudo, Batalha, Livro; filtros)
- [ ] Mesa com flashcard 3D, gestos, teclado e acessibilidade
- [ ] `src/estado/flashcards.ts` (fila própria, mesmos intervalos) e sincronização
- [ ] Bloco "Flashcards de hoje" na Revisão, separado das questões, com opção de esconder
- [ ] Botões "De onde veio" e "Fazer a questão"; na questão, "Flashcards desta questão"
- [ ] Limite de 10 por dia no servidor (RPC e SQL), com flashcard lacrado
- [ ] Testes em `fixtures/` (fila, limite, sincronização)

## Etapa 3: modo Batalha (adiantada: o Tales pediu a Batalha primeiro)
- [x] Duelo com 2 a 4 alternativas e correção automática (12/10/2026, no app, com o baralho de demonstração)
- [x] Vida, dano por dificuldade × força do monstro, cura, pontos, combo, intenção, Fúria
- [x] Poderes após cada monstro (1 de 3), relíquias, 3 encaixes; andares; chefe com armadura e fase 2
- [x] Fim da partida, com os flashcards errados indo para a fila de flashcards (local) e para o Estudo
- [x] Cenários pintados: Campo, Masmorra, Salão do chefe, com transição
- [x] Efeitos: projétil, corte, partículas, números, tremor, borda vermelha, escudo, cura, combo, crítico, vitória do chefe, sons opcionais, efeitos reduzidos
- [x] Teste do motor e do balanceamento (`fixtures/testar_flashcards.mjs`, no `npm test`)
- [ ] O Tales joga a demonstração e aprova (visual, ritmo e dificuldade)
- [ ] Mais monstros e chefes temáticos por área (mão, coluna, joelho...)
- [ ] Foco (proposta em BATALHA.md), se aprovado
- [ ] Teste de fluidez em celular de entrada (60 quadros por segundo nas animações)

## Etapa 4: coleção e desafio
- [ ] Livro de flashcards (dominados brilhantes, progresso por assunto)
- [ ] Desafio do dia com semente pela data e ranking
- [ ] Emblemas da Batalha
- [ ] Divulgação (post no estilo dos modelos aprovados)
