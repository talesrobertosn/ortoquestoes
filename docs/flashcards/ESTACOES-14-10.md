# Estações na Biblioteca — 14/10/2026

Ideia 40: calendário decorativo do hemisfério sul. Dezembro–fevereiro recebem ramos verdes; março–maio, folhas de outono; junho e agosto, folhagem fria; julho, neve de fantasia; setembro–novembro, flores. O mês local é fixado ao abrir o cenário, evitando alterações no meio de uma sessão.

`scripts/sprites/estacoes.py` desenha dez PNGs RGBA pequenos com numpy: cinco ramos 48×64 e cinco partículas 8×8. Não contém anatomia, imagens externas ou novos personagens. `EstacoesBiblioteca` aparece somente no cenário da Biblioteca, atrás dos controles e da mesa, nas bordas. Quatro partículas usam animação CSS; não acrescenta loop JavaScript. Movimento reduzido do jogo e do sistema deixam a arte estática. Sem escrita em progresso, alteração de questões, planos, música ou SQL.

Validação: `npx tsc -b`, `npm test`, build; fixture verifica os doze meses, dois anos, datas intactas e dimensões dos PNGs. `node scripts/flashcards/testar_estacoes.mjs` confere imagens carregadas, resposta de um flashcard, exclusividade do Estudo, movimento reduzido e ausência de erros JavaScript em 1400×860, 390×844 e 844×390. Capturas em `capturas/estacoes-14-10/`; julho é simulado no navegador para validar a variante, primavera corresponde ao mês atual.

Base: publicação da música #258 mesclada em c173b491. Este bloco precisa do próprio merge e deploy. Consultar CONTINUAR para o registro final. Monstros continuam em pausa e medição em aparelho físico permanece pendente.
