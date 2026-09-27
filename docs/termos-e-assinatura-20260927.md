# Termos e condições da assinatura — preparação de 27/09/2026

Este documento registra as decisões de produto e as fontes oficiais usadas na redação. Não substitui revisão por profissional jurídico.

## Regras adotadas

- O cadastro e o uso gratuito não exigem cartão. O acesso gratuito está sem limite diário nesta fase. A cota planejada de 20 respostas por dia **não** é ativada por esta mudança.
- A assinatura é opcional e recorrente. Cobrança integral por período: R$ 39,90 a cada mês, R$ 179,90 a cada seis meses ou R$ 239,90 a cada doze meses. O equivalente mensal é somente comparativo, não parcelamento.
- Até sete dias após cada cobrança aprovada, o usuário pode pedir reembolso integral. O acesso pago termina após confirmação do provedor; o histórico permanece.
- Depois desse prazo, o cancelamento impede a renovação e mantém o acesso até o fim do período já pago. Não há devolução proporcional automática dos meses restantes. Qualquer exceção deve ser tratada individualmente, sem promessa na interface.
- O cartão é informado no checkout hospedado pelo Mercado Pago. O OrtoQuestões não recebe o número completo ou o código de segurança, mas recebe identificadores/status da operação para gerir a assinatura.
- Um aceite separado, com versão, plano, valor e periodicidade, é registrado antes de abrir o checkout. O checkout continua exigindo confirmação de pagamento no Mercado Pago.
- Comentários, revisão, caderno de erros e simulados permanecem acessíveis conforme as regras atuais; mudanças futuras exigem aviso e regras próprias. Conteúdos da SBQ e de quadril continuam acessíveis a todos, sem exclusividade de assinantes.

## Fontes oficiais

- [Código de Defesa do Consumidor, art. 49](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm): direito de arrependimento em sete dias para contratação fora do estabelecimento e devolução dos valores pagos na hipótese legal.
- [Decreto nº 7.962/2013, arts. 1º, 2º, 4º e 5º](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm): informações claras sobre produto, serviço e fornecedor; sumário do contrato antes da contratação; atendimento facilitado; meios claros para arrependimento.
- [ANPD, glossário de proteção de dados](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/glossario-anpd): consentimento para tratamento de dados tem finalidade específica; o aceite contratual e a opção de receber novidades não devem ser confundidos.

## Ordem de implantação

1. Aplicar a migration `202609270900_aceites_assinatura.sql` no Supabase e confirmar a tabela com RLS e sem política pública.
2. Publicar o frontend com as condições e o aceite pré-checkout. A Function anterior ignora os campos adicionais durante a breve transição.
3. Após confirmar o deploy do frontend, publicar a nova versão da Edge Function `criar-checkout`, que passa a exigir e registrar o aceite. Clientes com página antiga precisarão atualizar antes de iniciar novo checkout. Não alterar as flags de limites ou o banco comercial.
4. Verificar que a leitura das condições e o aceite abrem o checkout sem cobrar; não realizar nova assinatura real apenas para verificar o texto.

**Rollback:** a versão anterior da Function pode ser republicada se o checkout falhar; a migration é aditiva e não deve ser removida junto com um rollback de código. A flag `paywall_ativo` deve permanecer `false` nesta etapa.
