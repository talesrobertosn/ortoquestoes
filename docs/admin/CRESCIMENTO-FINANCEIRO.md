# Crescimento e Financeiro — organização de 08/11/2026

Pedido do Tales: preservar a riqueza de informações, priorizar cadastros e assinaturas por dia, semana e mês, tornar metas compreensíveis e permitir investigação pelos gráficos.

## Organização

- Crescimento: movimento comparável → gráficos juntos e tendência → calendário de intensidade e contexto → jornada/coortes de compra → relatórios separados opcionais → estudo → continuidade → horários → perfis → canais → indicações → qualidade.
- Financeiro: recebido / possível fechamento / base atual → receita em dia, semana e mês → ponte da base → objetivos → mensais / calendário / planos longos / previsão → histórico detalhado → extrato e investigação.
- Metas: três objetivos principais (cadastros, primeiras assinaturas, recebimentos), realizado/falta/ritmo diário, gráfico acumulado com meta e projeção distintas, saúde da base, projeção decomposta, ritmo semanal, planejamento anual, tipos de receita e editor de meses futuros.

## Contratos de dados

Contas de administrador, testes e fora do público são excluídas do crescimento. Assinaturas fora do público continuam compondo a receita. Nova é primeira compra paga elegível; renovação é outra compra com acesso vigente ou até 30 dias após encerramento; volta é após esse prazo. Renovações e voltas são cobranças, não necessariamente pessoas distintas por período.

Comparações usam mesmo tempo transcorrido em São Paulo: ontem no mesmo horário, semana anterior nos mesmos dias/horário e mês anterior até o mesmo trecho (limitado à sua duração). O período atual permanece parcial. Gráficos separados e detalhes antigos úteis foram preservados; retirados os funis duplicados de bases incompatíveis e o suposto diagnóstico de maior abandono.

Conversão de coorte considera a mesma população por mês de cadastro. As janelas de 7/14/30 dias só incluem cadastros com toda a janela observável, mesmo quando uma pessoa recente já comprou. Tempo até estudo usa primeiro registro disponível no progresso atual; reinício pode mudar essa medida. A compra não exige passagem por todas as etapas de estudo.

## Supabase

Migração: `supabase/migrations/20261109014647_inteligencia_crescimento_financeiro.sql`.

- `jornada_crescimento_admin(p_excluir uuid[], p_dias integer)`: retorna série diária, coortes semanais maduras e primeiros registros de estudo. Uma base materializada de pessoas para todas as agregações. O parâmetro transporta testes reconhecidos no cliente; administrador e fora do público são sempre filtrados no servidor.
- `anotacoes_negocio`: contexto de campanhas/posts, separado de métricas. RLS ligada, sem acesso direto de anon/authenticated. Escrita/leitura via três RPCs com `exigir_administrador`, busca ordenada limitada a 500, texto de 3–200 caracteres e data validada.
- As RPCs são administrativas, com `search_path` vazio, execução revogada de PUBLIC/anon e concedida a authenticated com checagem de administrador no corpo. Nenhum envio, acesso ou pagamento é disparado.
- A jornada não usa o cache SQL global de dez minutos. No cliente, deduplicação por conta/argumentos e atualização a cada cinco minutos. O botão global atualiza todas as consultas montadas, incluindo jornada, indicações, metas, decisões e auditoria.

## Precisão financeira

- Valor de reembolso vem do registro histórico, com fallback explicitamente estimado no extrato, não do preço atual por padrão.
- Valor histórico ausente na última cobrança de cartão também recebe classificação estimada.
- Tentativas nunca pagas não compõem perdas do denominador de renovação. O rótulo explica o conjunto observado (renovações pagas ou acesso encerrado), sem alegar coorte estrita de vencimento.
- Recebido mensal de planos longos entra na série correta da previsão, não em Mensais.
- Recompra Pix em vários ciclos usa p, p², p³ na previsão e calendário. Cenário inferior não pode superar o centro com taxas menores que 30%.
- Objetivo não contamina previsão. Faixas financeiras são cenários de sensibilidade, não intervalos calibrados de 90%.
- Extrato totaliza o recorte filtrado, incluindo busca/situação; subtotal por dia considera todas as linhas filtradas, não apenas as 60 já mostradas.
- Referência/nota da conciliação reiniciam ao trocar de evento. Badge global respeita decisão conciliada/ignorada.

O histórico de cartão anterior à última cobrança ainda é reconstruído. Receita é bruta, não lucro ou extrato bancário; cobranças devolvidas são removidas do recebido e devoluções aparecem à parte. A base no início do mês é inferida dos períodos pagos, hoje usa acesso vigente; ajustes podem compor a ponte. Essas limitações são apresentadas na interface.

## Design e validação

Superfícies claras/tema escuro, tipografia editorial, verdete e ouro para séries, sem gradientes decorativos. No celular a tabela de movimento é transposta, mantendo as quatro métricas visíveis. Linhas têm medição responsiva, interação por toque/cursor/setas, legenda e tabela acessível. CSVs continuam disponíveis. Nenhuma biblioteca nova de gráficos.

Testes: `npm test` inclui regressões financeiras e de coortes em `fixtures/testar_negocio.mjs` e metas. Fluxo visual/funcional com API fictícia:

```sh
CHROMIUM=/usr/bin/chromium node scripts/capturar_telas.mjs '/admin?aba=crescimento' negocio --admin --sem-cracha --roteiro fixtures/e2e_negocio.mjs --pasta work/negocio/claro --agora 2026-11-08T21:00:00Z
# Acrescentar --escuro para o tema escuro; OQ_VAZIO=1 / OQ_FALHA=1 para os estados alternativos.
```

Os testes não disparam ações reais. A criação/leitura/exclusão de anotação é simulada, assim como as telas de pagamentos. As capturas são da interface de produção compilada com dados fictícios, sem dados pessoais exportados.

## Instalação conferida

Migração aplicada no projeto `oojrfzfjmkgmjcgzczln`, versão remota `20261109014647`. O teste transacional `fixtures/sql/negocio.sql` passou (anotação criada/lida/removida e tudo revertido; usuário comum recusado). Após a verificação: zero anotações persistidas, RLS ativa, anon sem execução da jornada e authenticated sem SELECT direto na tabela. A consulta de 365 dias executou em aproximadamente 1,84 s na medição de EXPLAIN ANALYZE.

Os advisors foram comparados por achado com o estado anterior. Os avisos das quatro funções SECURITY DEFINER autenticadas são esperados: usam o padrão administrativo existente, com checagem interna obrigatória validada contra usuário comum ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). A tabela sem policies é intencionalmente privada e só acessível por essas RPCs ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)); o índice da chave estrangeira recém-criado ainda não teve uso ([referência](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)). Nenhum novo endpoint anônimo.
