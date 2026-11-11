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

## Resumos visuais no início das páginas

Refinamento solicitado após a publicação: Crescimento passou a mostrar Hoje, Esta semana e Este mês simultaneamente (detalhamento abaixo); as barras do período atual e anterior usam a mesma escala dentro de cada indicador. Os números abrem as pessoas e a tabela dos três períodos permanece disponível em expansão. No Financeiro, o recebido é comparado visualmente com o mesmo trecho do mês anterior; um anel distingue recebido de ainda previsto no fechamento da carteira (não é meta); a distribuição dos pagantes por plano usa uma barra de composição com contagens e percentuais. Valores zerados não recebem preenchimento artificial. Nenhuma consulta nova nem mudança no banco.

A interação que abre pagantes no Financeiro leva a página até a lista correspondente, respeitando movimento reduzido. Os gráficos possuem descrições acessíveis e não dependem apenas de cor. Componentes: `src/admin/ui/resumosVisuais.tsx`. Fluxo `fixtures/e2e_negocio.mjs` cobre os filtros, tabela expandida, anel, lista de pagantes e ausência de transbordamento de 320 a 1920 px.

## Cadastros e primeiras assinaturas por período (09/11/2026)

Hoje, Esta semana e Este mês têm setores próprios, visíveis juntos. O panorama inicial reúne os seis números principais e atalhos para cada setor. Cada métrica mostra atual, anterior equivalente, diferença absoluta e percentual, barras comparativas, curva acumulada e referência do fechamento anterior completo. Não se inventa percentual quando o anterior é zero.

O comparativo principal usa São Paulo: ontem no mesmo horário, semana anterior até o mesmo dia/horário e mês anterior até a mesma data/horário, limitado ao fim daquele mês. Eventos futuros ficam de fora. O fechamento anterior completo é apenas uma referência, separado da comparação equivalente. Primeiras assinaturas significam primeira compra paga; renovações e reativações têm contagens próprias.

Cada setor inclui seu histórico de colunas: últimos 30 dias, 12 semanas ou 12 meses. Os seis gráficos acumulados comparam atual e anterior; eixos de contagens usam inteiros sem rótulos repetidos. Números atuais e anteriores abrem as pessoas em diálogo com fechamento por Escape. CSV comparativo disponível por setor; tabela dos três períodos e exploração anterior (linhas, médias e calendário) permanecem disponíveis em expansão. Nenhuma alteração no banco ou SQL manual.

Regressões de datas, meses mais curtos e curvas em `fixtures/testar_negocio.mjs`. Fluxo visual com API fictícia em `fixtures/e2e_crescimento_periodos.mjs`, validado em temas claro/escuro e larguras de 320 a 1440 px; usar o mesmo capturador e relógio do roteiro anterior.

## Refeito em 11/11/2026 (Financeiro, Metas, semana típica e Início)

Pedido do Tales: "quero ver com clareza quanto recebi este mês, no mês anterior e no total, quantos pagam e de qual plano; gráficos de bater o olho; metas com projeção baseada nos dados; deixa bem temático". Cálculos puros em `src/admin/dados/hub.ts` e `projecao.ts` (testes em `fixtures/testar_hub.mjs`); gráficos em `src/admin/ui/torres.tsx`; estilos em `src/admin/modulos/hub.css` (paleta de séries validada para daltonismo e o dialeto "temporada pixel": números na Jersey 10, borda firme e sombra em degrau).

- **Financeiro › Resumo:** placar do caixa (recebido no mês, comparação com o mesmo trecho do mês passado, mês passado inteiro, hoje, 7 dias, desde o começo, possível fechamento com e sem clientes novos); torres mês a mês com o que ainda deve entrar e a meta; tabela "este mês × mês passado" (dinheiro, pessoas, base, mensais com a renovação ligada); quem paga hoje por plano e meio, com a receita mensal equivalente por plano e preço (preços antigos separados); quando entrou (dia, semana ou mês, dividido por meio, tipo ou plano); previsão de 12 meses com cartão agendado, Pix provável e clientes novos (modelo das Metas); quando os semestrais e anuais voltam a pagar; simulador dos mensais (taxa do Pix e mensais novos por mês); calendário; histórico mês a mês desde o começo. Saíram a "ponte da base" e o gráfico de linha da receita.
- **Taxa do Pix:** uma só para a página toda, guardada no navegador. De partida vale a observada (prazo de 30 dias encerrado, 5 casos ou mais); senão, a parcial (todo Pix já vencido); senão, 80% (regra do Tales: o Pix, em geral, renova).
- **Metas:** diagnóstico do mês numa frase, cinco objetivos (realizado, projeção hachurada e meta), placar semana a semana (na semana em andamento, a régua é a parte que já passou; nas futuras, quanto precisa), caminho do mês, semana típica, plano de 12 meses × realizado e o simulador do futuro com os números de hoje.
- **Plano oficial `plano-2026-11-11`:** o modelo de público finito (`projecao.ts`) rodado com os números reais de 11/11/2026 e congelado em `PLANO_2026_11`. O cenário moderado de 05/11 continua guardado e aparece para comparação.
- **Semana típica** (Metas e Crescimento): média de cada dia da semana (cadastros, primeiras assinaturas, recebido, pessoas estudando, questões), o que esperar de hoje e a grade dia × hora. Substitui "Quando as coisas acontecem".
- **Início:** topo claro "ao vivo" (quem está online primeiro, com as iniciais de cada pessoa) no lugar da faixa verde com horizonte; placar de comparações em quatro blocos logo abaixo da lista de pessoas; o acerto mostrado é o real (primeira tentativa).

Fotos e verificação com dados fictícios parecidos com os reais: `node scripts/capturar_telas.mjs '/admin?aba=financeiro' hub --admin --sem-cracha --producao --roteiro fixtures/e2e_hub.mjs --pasta <pasta> --agora 2026-11-11T22:20:00Z` (com `--escuro` e `--estreito`).
