# Simulado Nacional 2.0: o plano (19/10/2026)

Pedido do Tales: refazer do zero a página, o funcionamento, o ranking e a configuração no painel do Simulado Nacional. São 50 questões, escolhidas pelo que mais cai, simulando a prova. A primeira edição é a de **outubro de 2026**.

## 1. O que existe hoje e o que está errado

Hoje existe um simulado mensal de 50 questões em 2 horas, corrigido no servidor e reaproveitando a tela comum de sessão. Estes são os problemas:

| # | Problema | Efeito |
|---|---|---|
| 1 | O gabarito de todas as questões está nos arquivos públicos do acervo, e a questão avulsa (`/questao/ID`) continua aberta durante a prova | dá para colar e subir no ranking |
| 2 | O sorteio usa a quantidade de questões de cada área no acervo, e não o que mais cai na prova | a proporção não reflete a prova; o subtema e o nível de incidência são ignorados |
| 3 | As respostas ficam só no aparelho até a entrega | quem troca de aparelho perde a prova; se o tempo acaba com a aba fechada, a entrega fica presa |
| 4 | Nenhuma edição nova é criada sozinha: só existe outubro | a página promete "a próxima abre no dia 1º" e novembro não existe |
| 5 | O simulado de véspera e o mensal brigam pelo destaque (vence o que abriu por último) | a véspera some quando o mês vira |
| 6 | O filtro de provas difere entre o painel (inclui CET-PR), o script (não inclui) e o texto (TEOT e TARO); o script ainda repete questões de edições anteriores | edições inconsistentes |
| 7 | A média por tema conta entregas atrasadas e a média geral não; "premium" muda de definição entre funções; o erro de publicar é genérico; o e-mail de exemplo fala em "41 de 60" | números que não batem |
| 8 | Não há teste do sorteio nem das funções do banco | qualquer mudança quebra sem aviso |

## 2. O que o novo simulado é

**Uma prova de verdade, uma vez por mês, com o país inteiro fazendo a mesma prova.**

- **50 questões oficiais do TEOT e do TARO**, sem as anuladas, as duplicadas, as que não têm figura e as autorais (OrtoQuestões Simulados).
- **2 horas, com relógio do servidor.** O tempo corre desde o início, mesmo com a aba fechada, como na prova.
- **Mesma prova para todos**, numa ordem embaralhada que é igual para todos. As **alternativas também são embaralhadas** na edição.
- **Aberto do dia 1º ao último dia do mês.** O ranking parcial aparece durante o mês e o final, no dia 1º seguinte.
- **Gabarito e comentário só depois da entrega.** Quem entrega vê a correção completa na hora.

### O que mais cai: a distribuição das 50
A conta usa as questões oficiais do TEOT e do TARO. As provas dos últimos 5 anos pesam o dobro, porque o perfil recente da banca é o que importa. Com o acervo de hoje, sem o peso dos anos recentes, fica assim:

| Área | Parte da prova | Questões |
|---|---|---|
| Trauma adulto | 20,4% | 10 |
| Ortopedia pediátrica | 18,6% | 9 |
| Mão e punho | 11,5% | 6 |
| Ombro e cotovelo | 9,3% | 5 |
| Tumores | 7,2% | 4 |
| Pé e tornozelo | 7,2% | 4 |
| Coluna | 6,9% | 3 |
| Joelho | 6,2% | 3 |
| Conceitos básicos | 5,6% | 3 |
| Quadril | 5,2% | 2 |
| Osteometabólicas | 2,0% | 1 |

Dentro de cada área, o sorteio segue os **focos de incidência** (`incidencia.ts`, níveis 1 a 4): cerca de 60% das questões saem dos assuntos de nível 3 e 4 e o resto se espalha pelos outros, para não ficar repetitivo. A prova também mistura anos: no máximo um terço das questões vem do mesmo ano. Questões usadas nos últimos 12 meses ficam de fora. O sorteio usa uma semente fixa, então dá o mesmo resultado sempre e pode ser conferido. A conta da distribuição é refeita sozinha a partir do acervo; a tabela acima é só a foto de hoje.

## 3. A pessoa: a jornada

A página `/simulado-nacional` muda conforme o momento. Todos os momentos têm o visual da temporada pixel e o primeiro nome da pessoa.

1. **Antes de abrir:** contagem regressiva ("Tales, o de novembro abre em 3 dias"), a distribuição por área da edição que vem e o resultado da última edição da pessoa.
2. **Aberto:** "Tales, o simulado de outubro está no ar." Mostra as regras em 4 linhas (50 questões · 2 horas · sem gabarito até entregar · ranking no dia 1º), a distribuição das áreas, quantas pessoas já fizeram (só a partir de 10) e o botão dourado "Começar a prova", que pede uma confirmação ("o relógio começa agora").
3. **Fazendo a prova:** é a tela de questões nova, no modo prova:
   - relógio em destaque e alerta com 15 minutos e com 5 minutos;
   - sem gabarito e sem link da questão;
   - dá para marcar para rever;
   - mapa de "respondidas / para rever / em branco".
   - Cada resposta é **salva no servidor** em segundo plano, a cada marcação ou em lote a cada poucos segundos, então é possível continuar em outro aparelho.
   - O botão "Entregar" mostra antes quantas ficaram em branco.
4. **Entregue:** o resultado na hora.
   - O placar, o tempo, a posição parcial ("por enquanto, você está em 12º de 230") e a comparação com a média.
   - O desempenho por área, mostrado como "onde você está pronto" e "onde rende revisar". As regras de tato valem: área fraca sem número na frase.
   - A correção questão por questão, com o comentário.
   - "Refazer as erradas" monta uma sessão comum.
5. **Encerrado:** o ranking final, a posição final, os emblemas da edição e a evolução nas edições anteriores, num gráfico simples de linha.
6. **Tempo acabou sem entregar:** o servidor entrega sozinho com o que foi salvo. Ninguém perde a prova.

**Quem pode fazer:**
- Fazer a prova é para quem assina; a definição de "premium" é a mesma em todo o site.
- O visitante e quem não assina veem a página, a distribuição e o top 10, com o convite para assinar.
- A prova não gasta o limite diário grátis.

## 4. O ranking

- **Ordem:** quem acertou mais; no empate, quem levou menos tempo; persistindo, quem entregou antes. **Só entra quem entregou no prazo**, com 5 minutos de tolerância para rede lenta.
- **Parcial durante o mês e final no dia 1º.** A posição e o percentil são calculados no banco.
- **Top 10 público,** respeitando quem escolheu não aparecer. Ao lado, a sua linha ("você: 37º, 72% de acerto"). As regras de tato valem quando a pessoa for mencionada pelo nome.
- **Ranking por área:** quem foi melhor em trauma, em pediatria e assim por diante. É um selo "melhor da edição em X" e ajuda quem é forte numa área.
- **Médias corrigidas:** a média geral e a média por área usam as mesmas entregas, só as feitas no prazo.
- **Emblemas:** os atuais continuam (3, 6 e 12 edições seguidas, top 10%, campeão).

## 5. O painel do administrador

Uma aba "Simulado Nacional" com a lista das edições numa linha do tempo e um botão por edição.

1. **Montar a edição do mês:** escolhe o mês e o tipo (mensal ou véspera). O painel sorteia, mostra a distribuição por área (alvo × sorteado) e a lista das 50 questões com área, foco, ano e nível.
2. **Trocar uma questão:** troca por outra da mesma área e do mesmo foco, que ainda não foi usada. Serve para tirar uma questão com problema.
3. **Publicar / despublicar / mudar datas:**
   - publicar põe a edição no ar;
   - despublicar só é possível sem participantes;
   - mudar as datas é possível antes de abrir, ou para estender o fechamento;
   - os erros aparecem com a causa certa.
4. **Destaque:** a véspera vira um **tipo** de edição, e não um sufixo no código. Regra explícita: enquanto a véspera estiver aberta, ela é o destaque e a mensal aparece como "também no ar".
5. **Acompanhar:** participantes, entregas, média e as questões que mais erraram (útil para os posts e para achar questão com problema).
6. **Aviso:** se no dia 25 a edição do mês seguinte ainda não estiver pronta, o painel avisa no topo. O sorteio fica no painel porque usa o acervo.

## 6. Como é feito (técnico)

- **Banco (parte 32, nova):** tabelas novas `sn_edicoes` (com `tipo` mensal/véspera, datas, duração, ordem das alternativas por questão), `sn_itens`, `sn_participacoes` (com `respostas` salvas aos poucos) e `sn_respostas_parciais`, se fizer falta. Todo o acesso passa por funções RPC com permissão de dono (security definer), com RLS sem políticas, como hoje. Funções:
  - `sn_obter(p_edicao)`
  - `sn_iniciar(p_edicao)`
  - `sn_salvar(p_edicao, p_respostas)`: só aceita dentro do tempo
  - `sn_entregar(p_edicao)`
  - `sn_resultado(p_edicao)`
  - `sn_ranking(p_edicao, p_area)`
  - `sn_gabarito(p_edicao)`
  - admin: `sn_admin_publicar`, `sn_admin_trocar_item`, `sn_admin_despublicar`, `sn_admin_datas`, `sn_admin_listar`
  - um pg_cron de 10 em 10 minutos entrega as provas com o tempo esgotado.
- **Alternativas embaralhadas:** a edição guarda a permutação de cada questão. A tela mostra na ordem nova e a correção é feita no servidor pela letra nova. Assim o gabarito público (letra original) não serve para colar sem ler a questão. **Colar ainda é possível** (o texto da alternativa certa está no acervo); fechar isso de vez exige questões inéditas fora do acervo público, o que fica para depois (seção 8).
- **Durante a prova:** a tela não mostra o id nem o link da questão. A questão avulsa daquele id mostra "esta questão está num simulado em andamento" para quem tem prova aberta.
- **Front:**
  - página nova `src/paginas/SimuladoNacional.tsx` e `src/estilos/paginas/SimuladoNacional.css`;
  - lógica em `src/dados/simuladoNacional.ts`, reescrito: um sorteio único para mensal e véspera;
  - a prova usa a `Sessao` e o `CartaoQuestao` novos no modo simulado, mais o relógio e o salvamento no servidor.
- **Script de linha de comando:** usa a mesma função de sorteio do painel, com os mesmos filtros e sem repetir questões.
- **Testes:**
  - o sorteio: soma 50, proporção dentro de ±1 por área, não repete, semente estável;
  - a permutação das alternativas e a correção;
  - os estados da página;
  - o SQL (com o mesmo esquema do `fixtures/sql/testar_parte31.sh`): iniciar, salvar, entregar, prazo, ranking e entrega automática.
- **E-mails:** o texto de exemplo vira "de 50". A campanha `simulado_resultado` passa a ler as tabelas novas.

## 7. A edição de outubro

- A edição nova de outubro substitui a atual. Ela abre quando a parte 32 for colada e fecha em 31/10, às 23h59.
- Quem já fez a versão antiga continua vendo esse resultado no histórico, como "Outubro (versão anterior)". As tabelas antigas não são apagadas.
- Para publicar: colar a parte 32 no Supabase e publicar as funções; depois o Tales (ou eu, pelo script) monta e publica outubro no painel.

## 8. Fora deste plano (fica para depois)

- Questões inéditas exclusivas do simulado, fora do acervo público. É o único jeito de fechar a cola de vez.
- Ranking por ano de residência (R1/R2/R3), que depende de um dado de perfil que hoje não existe.
- Simulados por prova (cirurgia da mão/SIMÃO, quadril).

## 9. Ordem de construção

1. Sorteio novo, com testes, e o script.
2. Parte 32 (SQL), com testes.
3. Painel do administrador.
4. Página e a prova (com salvamento no servidor), com capturas.
5. E-mails, links e textos do site ("50 questões em duas horas", termos).
6. Prévia para o Tales antes de subir; depois PR, colar a parte 32 e publicar outubro.
