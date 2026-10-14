# Leitores da Biblioteca — 14/10/2026

Ideia 39: dois pequenos leitores de fantasia aparecem entre as estantes depois de quinze minutos visíveis de estudo. São manto e livro, desenhados por `scripts/sprites/leitor_biblioteca.py` com numpy; sem anatomia, monstros, ataques ou mudança no desempenho.

A contagem usa tempo monotônico e conserva os trechos parciais quando a aba fica oculta. Não conta tempo em segundo plano. Um timeout aguarda o tempo restante; não acrescenta loop JavaScript de animação. Ao sair da Biblioteca, a contagem é descartada. A flutuação lenta é CSS e fica estática com movimento reduzido do jogo ou do sistema. As imagens são pedidas somente depois dos quinze minutos, reutilizando um único PNG de 24×40. Elementos decorativos atrás da mesa, sem foco, clique ou leitura assistiva. Sem progresso persistido ou SQL.

Validação: `npx tsc -b`, `npm test`, build e `scripts/flashcards/testar_leitores.mjs`, 1400×860, 390×844 e 844×390. Relógio de teste acelerado: seis minutos visíveis, dez ocultos, mais oito e meio visíveis ainda sem leitores; depois, acima de quinze visíveis, leitores presentes. Conferidos PNG carregado, partida intacta, movimento reduzido e saída para Batalha, sem erros JavaScript. Capturas em `capturas/leitores-14-10/`.

## Estado de continuidade

O início familiar #262 já está publicado: merge `174b16ee`, deploy `38655191938` concluído com sucesso. Sua ordem tem prioridade sobre os registros antigos: acertadas por você → turma → erradas → novas → mistura. Paisagens #261 também publicadas (deploy `38654687687`). Este bloco de leitores precisa de PR, checks e deploy próprios.

Restam selos derivados, aparência/paleta, estágio real no ranking, desafios isolados/sementes e metadados da demonstração. Monstros seguem em pausa. FPS em aparelho físico continua pendente. Não inferir estágio de outros usuários por andar nem criar um modo que contorne limites ou misture desafios com ranking normal.
