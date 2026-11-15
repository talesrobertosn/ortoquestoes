# Exclusão de contas — 15/11/2026

Pedido do Tales: exclusão no painel após solicitação do titular, inclusive por e-mail; autoatendimento após leitura das condições; novo cadastro permitido com o mesmo e-mail. Não excluir nenhuma conta real durante a implementação.

- Minha conta → Termos e privacidade → Excluir minha conta e meus dados. Mostra consequências, fim do acesso pago, cancelamento de renovação, ausência de reembolso automático, backup e a possibilidade de novo cadastro. Checkbox obrigatório, cancelamento sem chamada, trava de clique duplo. Após sucesso para sincronização, encerra sessão e limpa o armazenamento local desta conta.
- Admin → Usuários → ficha → Ações → Excluir conta e dados. Confirma o e-mail e a solicitação do titular; atualiza a lista e fecha a ficha após sucesso. Contas de administrador são protegidas também no servidor.
- Edge `excluir-conta` valida token no Auth em todo pedido; exclusão de terceiros exige consulta atual a `administradores` (não usa user_metadata). Gateway JWT desligado porque a validação é feita no corpo via GET Auth; nunca aceita anon. RPCs SQL exclusivas de service_role.
- Antes de excluir consulta cobranças locais e checkouts pendentes no provedor (q UUID e e-mail, paginados, sempre exige external_reference exata). Cancela e relê o status; falhas impedem a exclusão. Sem reembolso ou envio de e-mails. Assinaturas legadas exigem suporte; atualmente não há linhas na tabela legada.
- Remove arquivos pelo Storage API. RPC transacional remove registros pessoais sem CASCADE, cache admin e Auth; as FKs removem perfil, progresso, flashcards, sessões, preferências e cobrança. Nenhuma lista de bloqueio por e-mail. Os tokens antigos deixam de autenticar em GET Auth; RLS/FKs protegem dados eliminados.
- Mercado Pago e caixas de e-mail externas não são apagados por esta ação. Dados agregados sem vínculo pessoal permanecem. Reembolso/cobrança em discussão deve ser resolvido com suporte antes de excluir.

## Validação

`node fixtures/testar_exclusao_conta.mjs` simula autorização, aceite, IDOR, e-mail divergente, cancelamento confirmado/falho, checkout pendente, legado, arquivos e erro de banco. Integrado a `npm test`.

No banco: transação com rollback verifica CASCADE, permissão negada a anon/authenticated, administrador protegido e novo cadastro. No endpoint real: conta sintética marcada como teste e com e-mails desativados; exclusão, token antigo recusado, zero Auth/progresso/perfil/preferências, recriação e novo login com mesmo e-mail, exclusão pelo botão e limpeza local. Nenhum usuário real excluído, cobrança real alterada ou e-mail enviado.

UI conferida em 1440 e 390 px; painel com dados falsos confere confirmar/cancelar, alvo, fechar e atualizar. Bonfire conferida em 320, 390, 1024, 1440 e 1920 px.

Migrações aplicadas pelo MCP: exclusao_contas, exclusao_checkouts_pendentes e exclusao_cache_seguro. A terceira usa predicado explícito ao invalidar o cache para respeitar safeupdate no PostgREST. Cópias completas em supabase/colar-no-painel.
