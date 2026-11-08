# Central de e-mails — 08/11/2026

Reformulação pedida pelo Tales, com publicação autorizada em 08/11/2026. SQL instalado e funções `hub-emails` v2 e `enviar-email` v18 publicadas pelo acesso conectado, sem iniciar uma rodada real. Substitui a operação diária nas páginas Prontas,
Lembretes e Cartas pessoais. Os endereços antigos abrem Hoje. O menu tem Hoje, Histórico e Modelos e regras.
As referências explícitas ao histórico, horários, temas e rotina são desejadas pelo dono e foram preservadas.

## Operação

Hoje reúne as campanhas diárias, os lembretes de estudo e Pix, as sugestões pessoais com motivo concreto e os
relatórios nos dias 1 e 16. O pagamento aprovado mantém seu agradecimento imediato. `obrigado_assinatura`
saiu da escolha automática, dos seletores e do catálogo; o servidor recusa seu envio. O tipo antigo permanece
no motor apenas para compatibilidade com históricos e ferramentas que leem registros anteriores.

O servidor monta a seleção, aplica a política e escolhe uma mensagem por pessoa. Uma opção bloqueada não
esconde outra permitida (por exemplo, relatório periódico). A ordem prioriza assuntos com prazo, relatórios,
marcos/datas pessoais, ajuda para usar o plano, retomada e convites. Cartas genéricas para pessoas ativas
continuam na ficha, sem entrar numa rodada só para preencher a lista.

A prévia não inicia rodada nem envia. Ela pode atualizar os metadados do catálogo da Biblioteca, como o
processo de campanhas anterior. Nome, assunto, texto, motivo, personalização, último contato e opções
concorrentes aparecem na revisão. Pular hoje fica no navegador por data; ao iniciar, exclusões e adiamentos
são registrados no resumo da rodada. Edições são enviadas com identificação de versão editada.

## Política central

`hub_bloqueio` é usado pela prévia, pela reserva da fila, pela ficha e pelos caminhos antigos de campanhas,
lembretes, marcos e relatórios. Falha de consulta bloqueia. Preferências por categoria, confirmação,
administradores/fora do público, consentimento para novidades, 48 h e três contatos em 14 dias são conferidos.
Os convites e as abordagens de retomada compartilham uma espera de 30 dias por intenção. O primeiro convite
para começar não se repete. Contas de teste são excluídas na montagem e novamente na checagem de pertinência.

O processador possui uma credencial exclusiva, validada por `hub_autenticar_processador`, sem alterar os segredos dos pagamentos.

As exceções de frequência existentes foram mantidas: relatórios não esperam a cadência, mas contam para as
outras cartas; transacionais não esperam nem contam. Preferências continuam valendo. Os automáticos do
pagamento seguem sua validação operacional e preferência, sem entrar na fila diária.

## Fila e execução

- `email_rodadas`: única por dia de São Paulo, criador, estado e resumo da seleção.
- `email_fila`: uma linha por pessoa na rodada, texto autorizado, estado, motivo e vínculo com o registro do envio.
- Escritas somente por `service_role`; leitura de administradores via RLS; RPCs de trabalho não são públicas.
- `hub_iniciar` cria a rodada e a fila na mesma transação. Outro clique devolve a rodada existente.
- `hub_proximo` usa `FOR UPDATE SKIP LOCKED`. Um bloqueio curto, a checagem de item em processamento e o intervalo global de 650 ms impedem a sobreposição de workers e respeitam a taxa do provedor.
- `hub_reservar` trava o destinatário, confere as regras e o endereço atual e reserva o log antes de enviar.
- O processador confere se o acontecimento ainda existe, relê as regras e usa uma chave estável no Resend.
- Cada chamada trabalha por até 45 segundos ou 20 itens. O cron retoma a cada minuto, sem depender da página.
- Uma pausa antes da reserva devolve o item à fila; depois da reserva o envio já iniciado pode terminar.
- Itens de uma rodada vencida são adiados: não enviar mensagem antiga no dia seguinte sem reavaliar.
- Falhas confirmadas podem ser tentadas novamente, reutilizando registro e chave. Entrega incerta não entra no retry.
- Processamento interrompido por mais de dez minutos vira entrega incerta. Não marcar como falha e reenviar às cegas.
- Uma rodada só inicia se o processador está configurado. O cron nunca prepara nem inicia uma rodada sozinho.

A ficha também ganhou reserva idempotente por destinatário, dia e conteúdo. Envios antigos receberam chaves
estáveis no provedor. O marco é gerado antes da reserva, evitando que sua própria reserva bloqueie a carta
pela cadência e deixe o registro preso em processamento.

## Histórico e modelos

Histórico mostra as últimas 14 rodadas, mensagens autorizadas, exclusões e resultados, além do registro
existente de e-mails. O filtro de processamento mostra também registros antigos que precisam de conferência.
“Aceito pelo provedor” não confirma entrega nem leitura. Relatórios antigos seguem acessíveis numa seção
recolhida para recuperação excepcional. Os controles de automáticos foram movidos para Modelos e regras,
com os marcos corrigidos para 100, 250, 500, 1.000 e 2.000.

## Limites explícitos

A preparação pessoal admite até 2.000 contas; acima disso falha e pede ampliar a paginação. As campanhas
existentes têm janela de 80 por tipo, e lembretes/relatórios, 500. A tela avisa quando uma janela é atingida;
não apresenta a seleção parcial como se cobrisse todo o banco. Relatórios mantêm os cron jobs anteriores.
Entregas incertas antigas não foram reenviadas nem alteradas em massa.

## Instalação

1. Publicar `hub-emails`, com validação de JWT da plataforma desligada, pois o corpo autentica os administradores
   pelo Auth e o processador pelo segredo existente, como `enviar-email`.
2. Aplicar, nesta ordem, `20261108215621_hub_emails.sql` e `20261108225340_hub_worker_autenticacao.sql` (cópias em `supabase/colar-no-painel/`).
   O primeiro cria a fila e deriva a URL do cron mensal. O segundo cria uma credencial exclusiva para o
   processador, sem depender do segredo legado que foi recusado na validação em produção. A credencial
   fica no agendamento; somente a função com service_role pode validá-la. Nenhum valor é exposto ao navegador.
3. Publicar a versão nova de `enviar-email`, que passa a depender de `hub_bloqueio`.
4. Publicar o frontend. Não iniciar rodada durante a verificação da instalação.

Os arquivos únicos para colar no painel são gerados por `npm run funcoes:colar`, incluindo `hub-emails`.
Durante o desenvolvimento, os testes do banco ocorreram na mesma transação da criação do esquema e terminaram com ROLLBACK. Após autorização de publicação, a migração foi aplicada em produção e as duas funções foram publicadas. Os scripts de instalação ficam como referência; não precisam ser executados novamente nesse projeto.

## Verificação

- `node fixtures/testar_hub_emails.mjs`: HTTP da função com banco/provedor isolados; prévia, autorização,
  seleção adulterada, clique concorrente, pausa, preferências alteradas, falhas, retry, entrega incerta e ficha.
- `fixtures/sql/hub_emails.sql`: teste real de permissões, limites, intenção equivalente, reserva, pausa e retry,
  concatenado à migração na mesma transação e finalizado com ROLLBACK. Nenhum envio HTTP é chamado.
- Fixtures existentes de modelos (44.730 cartas), gatilhos, campanhas, descadastro e navegação do admin.
- Checagem Deno das duas funções, TypeScript, build e orçamento dos chunks.
- Playwright com interface real e contas fictícias: busca, pular/incluir, prévia, iniciar, pausar, retomar,
  recarregar, modelos e todas as larguras entre 320 e 1920; temas claro e escuro e menos movimento.
- Prévia HTML independente usa os mesmos componentes, com APIs locais fictícias; navegador testado com todas
  as conexões externas bloqueadas. Não possui credenciais nem chama o serviço de envio.
