# Continuidade de treinos entre aparelhos — 17/11/2026

## Causa do relato

`TIPOS_SYNC` continha respostas, favoritos, notas, histórico e Biblioteca, mas não a sessão em andamento. `sessao:atual` existia somente no armazenamento do navegador. O outro aparelho podia receber o desempenho sem receber a lista sorteada, os filtros, a posição ou as respostas completas daquele treino. A conciliação antiga preenchia algumas respostas a partir do histórico; não reconstruía uma sessão ausente.

## Correção

- A sessão completa usa o documento `sessoes/atual` de `progresso_usuario`, com a mesma RPC, versão, fila persistente, repetição idempotente e isolamento por conta.
- O tipo remoto difere da chave local `sessao:atual`: versões antigas do aplicativo podem receber o tipo desconhecido sem escrever um objeto incompatível sobre sua sessão.
- O treino preexistente entra na fila antes da primeira leitura remota, para migrar automaticamente quando o aparelho original abrir a atualização.
- Criação usa UUID, evitando colisão entre aparelhos e criações no mesmo milissegundo.
- Conflitos da mesma sessão usam a base anterior: respostas de questões diferentes se juntam; mudanças em posição, revisão e riscadas preservam campos não editados aqui. O relógio do aparelho não escolhe o vencedor. A base anterior fica somente no cache, sem duplicar o payload da RPC.
- Conclusão é terminal. Edições offline de um treino antigo não reabrem uma sessão encerrada nem substituem outro treino já criado no servidor. Uma criação explícita pode substituir a sessão atual. Continua existindo **uma sessão atual por conta**, não uma lista de treinos simultâneos.
- Um clique atrasado de resposta é ignorado se a questão não pertence mais ao treino atual ou se ele já foi concluído.
- Updaters locais leem o armazenamento atual antes de calcular a próxima alteração; isso preserva uma edição feita por outra aba antes da entrega de seu evento `storage`.
- A conciliação legada não preenche simulados usando respostas de outros treinos. A sessão compartilhada preserva letra, confiança, segundos e ordem exibida, sem marcar respostas reais da sessão como inferências de outro aparelho.
- Simulado Nacional conserva sua API própria; não é enviado como treino nem substituído por um documento de treino recebido.
- Limpeza originada na nuvem mantém a origem ao limpar a sessão, sem criar uma exclusão local concorrente.
- A tela de treino mostra o estado de sincronização e aguarda a primeira busca antes de anunciar que não existe sessão. Itens recusados ou serviço ainda sem suporte não são apresentados como sincronização concluída.
- A regra existente de **um aparelho conectado por vez** permanece. Antes da saída provocada por outro aparelho, a fila tenta concluir um ciclo por até oito segundos. Trocar de conta durante essa espera não encerra a nova conta.

## Banco e segurança

Migração `20261117120318_sincronizar_sessao_treino.sql`, também em `supabase/colar-no-painel/`. Aplicada ao projeto OrtoQuestoes em 17/11/2026. Acrescenta o tipo `sessoes` e sua validação, conservando a expressão de validação dos tipos anteriores e o limite existente de 128 KiB por documento. Não cria tabelas, amplia privilégios, modifica Auth, preços ou limites comerciais.

Verificações no Postgres real, em transações revertidas:

- documento válido aceito; objeto vazio, campo obrigatório ausente, Nacional e posição negativa recusados;
- RPC aceita o novo tipo, associa a linha ao usuário autenticado, não duplica operação repetida e recusa sobrescrita com base antiga;
- RLS ativa; conta sem dados não vê sessões de outras contas; `anon` não executa a RPC;
- dados usados nas verificações não permaneceram no banco.

Os advisors foram consultados. Os avisos existentes sobre funções SECURITY DEFINER, tabelas de acesso exclusivamente por RPC e proteção contra senhas vazadas não foram transformados em mudanças de autorização fora deste escopo. A RPC de progresso confere `auth.uid()`, não autoriza por `user_metadata` e não é executável por `anon`.

## Validação automatizada

`npm test`, `npm run build`, `python3 scripts/validar_acervo.py` e `git diff --check`.

`fixtures/testar_sincronia_aparelhos.mjs` executa a implementação real em workers com armazenamento independente: treino de 100 questões, migração do cache antigo, respostas e campos completos, edições offline simultâneas, relógios com dez horas de diferença, conclusão, encerramento, substituição, troca de conta, foco, aba escondida, retorno da rede, pedido travado, erro 401 e recuperação de recusas antigas. Os testes incrementais e de reinício continuam na suíte.

`CHROMIUM=/usr/bin/chromium node fixtures/e2e_sincronia_treino.mjs`: Chromium com dois contextos e Supabase simulado por rotas isoladas. Resposta pela UI no PC, recuperação das mesmas 100 questões de ombro no celular de 390 px, resposta pela UI no celular, retorno ao PC sem recarregar e segunda aba preservando marcações. Não acessa contas reais. O E2E de cronograma também passou: progresso do dia, leitura das frases, sessão compartilhada, segunda aba e terceiro navegador. `npm run e2e:sincronia` executa os dois cenários. Capturas em diretório temporário ou em `$CAPTURAS`.

## Limites e recuperação

- É necessário entrar na mesma conta e usar a versão atualizada nos dois aparelhos. Treinos de visitante não são sincronizados.
- Uma sessão antiga que nunca foi enviada precisa ser aberta no navegador original, atualizado e conectado, para migrar. Não é possível recuperar a lista sorteada se o armazenamento original já foi apagado.
- Edições offline permanecem no aparelho até ele voltar à rede com a conta autenticada; não podem aparecer no outro antes do envio. Se a troca de aparelho interromper o envio por falta de rede, entrar novamente no aparelho original retoma a fila.
- A sincronização ocorre nas edições, no retorno à aba/foco/rede e, com a aba visível, por conferência periódica de até um minuto. Não foi acrescentado Realtime nem prometida atualização instantânea de uma aba inativa.
- Se os dois aparelhos alterarem o mesmo campo da mesma questão offline, prevalece a edição local conciliada sobre a versão recebida; as tentativas de estudo continuam sendo conciliadas separadamente em `respondidas`.
