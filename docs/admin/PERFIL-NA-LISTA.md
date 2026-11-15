# Perfil e acesso antes de abrir a ficha

Pedido de Tales em 15/11/2026. Em Pessoas › Usuários, a célula principal mostra etapa ao lado do nome, objetivos declarados e, somente para assinantes pagos, o fim do acesso pago e os dias restantes. O alerta discreto aparece a até sete dias do fim. Datas e dias de calendário seguem America/Sao_Paulo.

`ResumoPessoa.tsx` usa `perfilNaLista.ts`: R1/R2/R3 só vêm do ano informado; prova de interesse não permite inferir etapa. Objetivos são validados pelos valores existentes do perfil. Até dois ficam visíveis; os demais têm contador e descrição acessível, com detalhes na ficha. A busca também encontra etapa e objetivos. A coluna Serviço / local complementa a identidade sem repetir o perfil.

As assinaturas vêm da consulta que o painel já fazia. Uma passagem cria um mapa por usuário; não há chamada por linha. Entre períodos ainda válidos, mostrar o fim mais distante, inclusive em renovação antecipada ou renovação desligada que conserva dias pagos. Gratuitos, cortesias e administradores não recebem vencimento de assinatura. Data ausente não é inventada. “Acesso até” significa fim do período já pago; o título esclarece quando o cartão renova automaticamente.

Testes em `testar_admin_secoes.mjs`: ano ausente/inválido, prova desconhecida/duplicada, assinatura vencida/reembolsada, renovação antecipada, cancelamento com acesso restante, fuso perto da meia-noite e ausência de vencimento em contas gratuitas/cortesia/admin. Conferência visual e busca/abertura da ficha em 390 e 1440 px com dados fictícios; nenhuma conta real modificada. Sem alteração de banco, cobrança ou permissões.
