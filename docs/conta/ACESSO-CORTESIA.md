# Período pago e cortesia

Pedido do Tales em 17/11/2026: depois do período pago, mostrar que o acesso continua por
cortesia, até quando, quantos dias restam e a origem da indicação. Permitir renovar preservando
o período existente. As mesmas informações entram na lista/online e ficha do administrador.
O novo e-mail sobre essa situação foi adiado; não há novo disparo nem campanha automática.

`obter_resumo_acesso` só devolve os dados da própria conta; nomes são apenas primeiros nomes.
A justificativa interna da cortesia é omitida dessa resposta. `listar_resumos_acesso_admin` é
protegido por administrador e retorna o conjunto de uma vez, sem consulta por linha de usuário.

A tela separa pago/cortesia e considera o maior prazo para o total de acesso. Cortesia sem prazo
não vira zero dias ou prazo inventado. Cortesia vencida não aparece como acesso em vigor.
Nova compra por Pix começa depois do acesso existente. Cartão agenda a primeira cobrança
para depois desse acesso. Ambos consultam o saldo no servidor; erro impede checkout sem
preservar os dias. Indicações e Pix compartilham trava para não perder dias concorrentes.

Testes: `testar_resumo_acesso.mjs`, `testar_checkout_cortesia.mjs`, `testar_compra_planos.mjs`
(navegador com serviços simulados) e `testar_acesso_cortesia.sql` (transação sempre revertida).
Capturas de celular e computador nos dois temas, incluindo 320 px e movimento reduzido.
