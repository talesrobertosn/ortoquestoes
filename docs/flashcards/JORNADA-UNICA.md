# Jornada única dos flashcards, 13/10/2026

Diretriz do Tales: retirar a escolha Fácil/Normal/Difícil e o ranking por dificuldade; começar com os flashcards de questões mais acertadas pela turma, depois questões que a pessoa acertou, depois as que errou, e finalmente misturar. Sortear dentro de cada grupo. Retirar a Torre da entrada e deixar Cripta e Biblioteca, com apresentação mais acolhedora. O cronograma de flashcards fica na central de Flashcards, sem o atalho no cronograma de questões. Enviar capturas reais ocasionalmente durante mudanças visuais, no computador e/ou celular.

## Implementação

- Uma regra de combate para partidas novas, a antiga base Normal. Não há seletor ou selo de nível na partida. Os valores antigos ficam no motor somente para abrir partidas salvas, sem apagar progresso ou corridas históricas.
- `motor/selecao.ts`: introdução de oito flashcards por grupo (turma, acertos pessoais, erros pessoais), seguida de sorteio uniforme do acervo elegível. Grupos vazios são pulados. Sorteio sem reposição no lote, reproduzível pela semente; a rodada persistida impede reiniciar a introdução quando o baralho é reposto. As respostas pessoais são as das questões de origem, não a autoavaliação dos flashcards.
- `faixas_flashcards()` no servidor: classificação agregada baseada no acerto real, com pelo menos três respondentes. Primeiro grupo: quartil superior; depois, faixa intermediária até o percentil 75 e a faixa inferior. Empates têm o mesmo grupo. A classificação não revela percentuais premium nem dados pessoais. A migration está também em `supabase/colar-no-painel/`; Tales confirmou execução na conversa.
- As faixas reais também calibram a dificuldade educativa que o motor usa para dano e ataque. Sem medição suficiente, mantém-se a classificação editorial existente, sem inventar taxa. Se não há estatísticas, a seleção pula o primeiro grupo e usa o histórico pessoal e a mistura.
- Ranking único pela RPC já existente `ranking_flashcards('masmorra')`, que agrega o melhor andar por conta independentemente do nível histórico. Não há migration destrutiva, importação de recorde local ou junção com o ranking de questões. Não foi alterado o critério de desempate do servidor existente.
- Torre removida da central e entrada; links antigos redirecionam à entrada. Os dados salvos da Torre permanecem intactos.
- Central: cenário original do jogo, tipografia Cinzel/Alegreya, contraste sobre a paisagem e botões próprios para explorar e treinar. Entrada: bosque, dois caminhos, pergaminho e cores naturais. Biblioteca: cabeçalho claro, painéis verdes e distinção explícita de treino sem combate.
- Trilha original "Página ao Sol": 88 BPM, 24 compassos, flauta, harpa, piano e cordas discretas, com renderização em MP3 e verificação de volume/loop. Referências de atmosfera: Stardew Valley/Octopath II; nenhuma melodia ou asset foi copiado.

## Validação

Testes existentes do motor/compatibilidade, aprendizagem, revisão, reinício, cronograma e acervo; novo teste de sequência, aleatoriedade por semente, amostra mínima, ausência de dados, reposição e filtros. TypeScript e build. Capturas em desktop e celular, com revisão do contraste e botões. Playwright em 1400×860, 390×844, 844×390 e 568×320; o contorno decorativo do modal pode exceder sua caixa, enquanto a arena e a página não têm overflow horizontal.

Limitação preservada: som em celular real depende da confirmação em aparelho físico. Não afirmar que capturas/emulação comprovam reprodução em iPhone/Android. Partidas antigas conservam seus parâmetros históricos; todas as novas seguem a regra única.
