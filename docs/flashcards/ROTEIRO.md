# Roteiro

Marque `[x]` ao concluir e anote a data e o PR. Uma etapa só começa quando a anterior estiver aprovada pelo Tales.

## Etapa 0: visão e protótipo
- [x] Brainstorm e decisões registradas (12/10/2026)
- [x] Documentação em `docs/flashcards/` (12/10/2026)
- [x] Protótipo visual `prototipos/flashcards/torneio.html`, com Estudo, Batalha e 3 cenários (12/10/2026)
- [x] Referências visuais do Tales registradas em REFERENCIAS.md (12/10/2026)
- [x] Protótipo 2: testado com prints, corrigido, com mais efeitos visuais, promovido a `torneio.html` e publicado (12/10/2026)
- [ ] O Tales avalia o protótipo: estética, cenários, tamanho do flashcard no celular, fluidez da Batalha
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

## Etapa 3: modo Batalha
- [ ] Duelo com 2 a 4 alternativas e correção automática
- [ ] Vida, dano por dificuldade, cura, pontos
- [ ] Poderes a cada 5 flashcards; andares; chefes temáticos
- [ ] Fim da partida, com os flashcards errados indo para a fila
- [ ] Cenários: Salão das velas, Campo, Masmorra (e novos)
- [ ] Teste de fluidez em celular de entrada (60 quadros por segundo nas animações)

## Etapa 4: coleção e desafio
- [ ] Livro de flashcards (dominados brilhantes, progresso por assunto)
- [ ] Desafio do dia com semente pela data e ranking
- [ ] Emblemas da Batalha
- [ ] Divulgação (post no estilo dos modelos aprovados)
