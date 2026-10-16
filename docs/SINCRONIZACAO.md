# Sincronização do progresso entre aparelhos

Como o progresso de uma conta (respostas, favoritos, notas, histórico e o que foi feito hoje no
cronograma) chega de um aparelho a outro, o que deu errado em 15/10/2026 e como verificar.

## Relato (15/10/2026, Tales)

> Eu estava respondendo o cronograma no meu MacBook e fiz as questões há umas horas. Agora abri o
> cronograma no meu computador e as mesmas questões não foram feitas; estou refazendo.

## Como funciona

| Dado | Onde fica | Como vai para os outros aparelhos |
| --- | --- | --- |
| Respostas (`respondidas`), favoritos, notas, histórico | `localStorage` da conta | `src/conta/sincronizacao.ts`: um documento por questão em `progresso_usuario`, enviado por `sincronizar_progresso` (confere a versão) e lido por `ler_progresso_desde` (só o que mudou desde o cursor) |
| Plano do cronograma | `planos_estudo` | `src/conta/cronograma.ts`: relido ao abrir, ao focar a aba, ao reconectar e a cada minuto |
| **Feito hoje fora das questões** (resumão lido, flashcards, mini-simulado) | `cronograma:dia` e `resumao:lido-hoje` no aparelho **e**, desde 15/10, `planos_estudo.opcoes.marcasDia` | `src/conta/marcasDia.ts` + `enviarMarcas` (em `cronograma.ts`), por `ajustar_opcoes_plano` |
| Sessão de questões em andamento (`sessao:atual`) | só no aparelho | não sobe; é **conciliada** com as respostas que chegam (`reconciliarSessao`, em `src/estado/sessao.ts`) |

Quando a sincronização roda: ao entrar na conta, ao abrir a página, a cada resposta, ao voltar para a
aba (`visibilitychange`), ao focar a janela (`focus`, desktop sem trocar de aba), ao voltar de
"voltar/avançar" (`pageshow`), ao reconectar (`online`, relendo tudo) e a cada 30 s com a aba visível.
Depois de uma falha, tenta de novo sozinha em 2 s, 4 s, 8 s... até 1 min.

O cursor da leitura incremental é a **versão da linha no servidor** (`versao`, uma sequência do
Postgres), nunca o relógio do aparelho. Um aparelho com o relógio adiantado ou atrasado horas não perde
linhas (testado com ±5 h). O relógio do aparelho só aparece em dois lugares, sem risco de perder dado:
o "sincronizado há X" (medido no próprio aparelho) e o desempate de qual tentativa é "a última" quando a
mesma questão foi respondida nos dois aparelhos (as duas tentativas ficam; ver abaixo).

## Causas encontradas

Reproduzidas em `fixtures/testar_sincronia_aparelhos.mjs` (aparelhos em threads com servidor falso) e
em `fixtures/e2e_sincronia_cronograma.mjs` (dois navegadores de verdade). Rodando os mesmos roteiros no
código de antes da correção:

1. **Causa principal: a sessão do cronograma é do aparelho.** O computador tinha a sessão do dia
   começada (`sessao:atual`, com as questões do dia). As respostas do MacBook chegavam ao computador e
   o "X de Y feitas" do cronograma até subia, mas o botão principal continuava "Continuar: faltam 36
   questões" (o mesmo número de antes) e a sessão oferecia de novo as questões feitas no MacBook, sem
   resposta. No E2E de antes: "faltam 36" antes e depois; a sessão do computador com 2 respondidas em vez
   de 6. É exatamente o "estou refazendo".
2. **O que foi feito hoje fora das questões não saía do aparelho.** Resumão lido, flashcards e
   mini-simulado ficavam só em `cronograma:dia` / `resumao:lido-hoje`: no outro aparelho, "a fazer".
3. **Começar o dia antes de a sincronização terminar.** "Começar" escolhia as questões com as
   respostas que o aparelho tinha naquele instante; aberto logo depois de estudar no outro aparelho,
   montava a sessão com as mesmas questões.
4. **Respostas boas mandadas para "itens não enviados".** Um 401 (token vencido no meio da renovação,
   "JWT expired", "permission denied") no envio era tratado como erro do item: a resposta saía da fila
   e nunca chegava aos outros aparelhos. Também "Versão inicial inválida" recusava o item em vez de
   reenviá-lo como novo.
5. **Fila presa para sempre.** Um pedido que nunca respondia (o `getSession` do login, que não tem
   prazo, ou rede pendurada) deixava a sincronização "sincronizando" até recarregar a página; tudo o
   que a pessoa respondia depois ficava só naquele aparelho.
6. **Janela que volta ao foco sem trocar de aba não sincronizava** (só `visibilitychange`), e voltar
   da falta de rede logo depois de um ciclo era ignorado.
7. **Mesma questão nos dois aparelhos sem sincronizar:** valia a resposta mais recente e a outra
   tentativa se perdia.

Hipóteses descartadas: cursor por relógio (o cursor já era a versão do servidor), escrita local por
cima da nuvem (a fila confere a versão), chaves por conta (isoladas, testado com troca de conta),
limite de lote (100 por envio, 500 por página de leitura, abaixo do teto do PostgREST) e service worker
(`public/sw.js` não intercepta o Supabase, outro domínio).

## O que mudou

- `src/estado/sessao.ts`: `reconciliarSessao` e `vigiarSessaoEntreAparelhos` (ligado em
  `ContextoConta`). Respostas que chegam da nuvem entram na sessão em andamento como
  `outroAparelho: true`; "Continuar" conta só o que falta e pula as feitas lá; a questão mostra "Você já
  respondeu esta questão em outro aparelho". Na sessão de questões novas do cronograma (e no
  diagnóstico) qualquer resposta conta; nas de revisão, só a feita depois de a sessão começar. Simulado
  Nacional fica como está. Essas respostas não entram de novo no histórico deste aparelho.
- `src/paginas/PlanoEstudo.tsx`: "Começar" espera a sincronização (até 8 s; sem rede segue) e escolhe as
  questões com as respostas relidas; marcas do dia juntam o aparelho e o plano; indicador
  `IndicadorSincronia` ("Sincronizado há 2 min", "Sincronizando…", "Sem conexão: … aguardando envio",
  "Tentar agora").
- `src/conta/marcasDia.ts` + `enviarMarcas`: o feito hoje vai para `planos_estudo.opcoes.marcasDia`
  (só o dia de hoje; junção sem perder o que o outro aparelho marcou). `Resumao.tsx` envia ao marcar a
  área como lida. Editar o plano preserva as marcas do dia.
- `src/conta/sincronizacao.ts`: só erro do próprio dado tira item da fila (`erroDeDado`); 401/403,
  rede e servidor ficam na fila; recusas antigas por login/rede voltam sozinhas para a fila ao abrir;
  "Versão inicial inválida" reenvia como item novo; prazo de 30 s em todo pedido (inclusive o
  `getSession`); sem sessão válida não sai pedido como visitante; `focus` e `pageshow`; nova tentativa
  com espera crescente; `aguardar(ms)`; `ultimaSincronia` no status.
- `src/conta/modeloSync.ts`: `juntarRespondida` junta as duas versões da mesma questão (histórico,
  tentativas, acertos, erros e a primeira letra) e reenvia a junção.
- `src/paginas/Sessao.tsx`: a faixa "Cronograma de hoje" recalcula quando chegam respostas da nuvem.
- `src/paginas/Conta.tsx`: "Progresso sincronizado há X".

Nada de SQL novo: tudo usa funções que já existem e só mexem na conta de quem chama
(`sincronizar_progresso`, `ler_progresso_desde`, `ajustar_opcoes_plano`). Nenhum dado é apagado; as
respostas presas em "itens não enviados" por login voltam a subir sozinhas.

## Como verificar

- `npm test` inclui `fixtures/testar_sincronia_aparelhos.mjs`: A responde o cronograma, B (aba aberta
  antes, com a sessão do dia montada) volta do segundo plano e mostra o mesmo progresso do dia, sem
  oferecer de novo as questões; aba nova; foco da janela; intervalo; conexão caindo depois de o servidor
  gravar (sem duplicar); pedido travado (prazo); offline; 401 no envio; sessão ausente; recusas antigas;
  "Versão inicial inválida"; relógios +5 h e −5 h; a mesma questão nos dois aparelhos; troca de conta; e
  as unidades (junção, conciliação, marcas, classificação de erro).
- `npm run e2e:sincronia` (Playwright, `/opt/pw-browsers/chromium` ou `CHROMIUM=...`): computador e
  MacBook em navegadores separados, com relógios deslocados, segunda aba e terceiro navegador; capturas
  em `$CAPTURAS`.
