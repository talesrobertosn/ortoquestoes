# Visitas a Indique e ganhe no painel

Pedido de 10/11/2026: quem abriu `/indicar` recebe fundo e selo azuis em Agora (online e fora do site), Pessoas e no cabeçalho da ficha. Vale para assinantes e não assinantes. O azul prevalece no fundo quando também há interesse nos planos; o selo amarelo e a situação da assinatura continuam visíveis.

A janela é de **24 horas corridas desde a última abertura**, inclusive atravessando a meia-noite. Não é o dia do calendário e não se prolonga até o fim do dia seguinte. O relógio do painel já atualiza a tela a cada 10 segundos; o destaque expira mesmo sem recarregar. A consulta atualiza a cada minuto nas telas ao vivo.

`visitas_indicacao_admin()` consulta apenas o histórico existente em `visitas_usuario`, com máximo de `em` por conta, limite de 24 horas e sem datas futuras. Usa o índice existente `visitas_usuario_em_idx`. Nenhuma nova coleta, tabela ou mudança no sinal dos planos.

A função segue o padrão das RPCs administrativas existentes: `SECURITY DEFINER`, caminho de busca vazio, nomes qualificados, `exigir_administrador()` antes da consulta, execução revogada de `PUBLIC`/`anon` e permitida a `authenticated` sob o guarda de administrador. O aviso genérico do advisor sobre funções definidoras executáveis por autenticados é intencional neste endpoint: foram verificados a rejeição sem sessão e sem papel administrativo e o resultado agregado sob uma conta administradora. Não conceder leitura direta da tabela.

Migração: `supabase/migrations/20261110140436_admin_visitas_indicacao_24h.sql`, com cópia completa em `supabase/colar-no-painel/`. Aplicada e conferida no projeto OrtoQuestoes durante esta entrega.

Verificação: `node fixtures/testar_indicacao_admin.mjs` (limite exato de 24 h, virada do dia, datas inválidas/futuras, sinal dos planos preservado e atualização sem mutação); `CHROMIUM=/usr/bin/chromium node fixtures/e2e_indicacao_admin.mjs` (listas, ficha, coexistência com planos, celular, temas e expiração com a tela aberta).
