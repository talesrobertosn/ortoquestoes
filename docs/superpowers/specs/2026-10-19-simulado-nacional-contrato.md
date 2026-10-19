# Simulado Nacional 2.0: contrato entre as partes

Este é o acordo técnico que todas as partes seguem. O plano está em [2026-10-19-simulado-nacional-design.md](2026-10-19-simulado-nacional-design.md).

## Decisões tomadas pelo Claude (o Tales delegou todas, em 19/10)

- **Edição de outubro:** a versão nova substitui a atual. As tabelas antigas (`simulado_*`) não são apagadas. O histórico da pessoa lê as participações antigas e mostra a de outubro como "Outubro (versão anterior)".
- **Questões:** só oficiais de TEOT, TARO e TEOT/TARO. Ficam de fora as anuladas, as duplicadas (`dup`), as autorais (`sim`), as com figura pendente, as sem gabarito A–E e o CET-PR.
- **Provas recentes:** as dos últimos 5 anos (ano ≥ ano atual − 4) pesam 2 na conta da proporção; as sem ano pesam 1.
- **Tamanho e duração:** a edição mensal tem 50 questões em 120 minutos. A véspera vira `tipo = 'vespera'` e o admin escolhe o tamanho (50, 80, 100 ou 120) e a duração.
- **Prazo de entrega:** a tolerância continua em 5 minutos.
- **Ranking:** a ordem é `acertos desc, segundos asc, entregue_em asc` e só entra quem entregou no prazo.
- **Exibição de números:** número de participantes só a partir de 10. Ranking por área só com 10 ou mais entregas na edição.

## Banco: parte 32

O arquivo de origem é `supabase/migrations/202610191200_simulado_nacional_v2.sql`. A cópia para colar no painel é `supabase/colar-no-painel/sql-202610191200-parte32.sql`, e o agendamento fica em `...-parte32-agendamento.sql`. A parte precisa poder ser colada mais de uma vez sem erro.

### Tabelas

As tabelas têm RLS ligado, nenhuma política e os grants revogados. Todo o acesso passa por funções `security definer` com `set search_path = public`.

```
sn_edicoes(
  edicao text primary key,            -- 'AAAA-MM' (mensal) ou 'AAAA-MM-vespera-<slug>'
  tipo text not null check (tipo in ('mensal','vespera')),
  titulo text not null,
  abre_em timestamptz not null,
  fecha_em timestamptz not null check (fecha_em > abre_em),
  duracao_min int not null check (duracao_min between 10 and 360),
  publicado boolean not null default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
)
sn_itens(
  edicao text references sn_edicoes on delete cascade,
  ordem int,
  id_questao text not null,
  area text not null,                 -- nome da área (tema)
  foco text,                          -- foco de incidência, se houver
  gabarito_original char(1) not null, -- letra do acervo
  permutacao text not null,           -- ex.: 'CADB' = a letra nova A mostra a original C, a nova B mostra a A...
  gabarito char(1) not null,          -- letra NOVA correta (derivada de permutacao + gabarito_original)
  primary key (edicao, ordem), unique (edicao, id_questao)
)
sn_participacoes(
  edicao text references sn_edicoes on delete cascade,
  usuario_id uuid,
  iniciado_em timestamptz not null default now(),
  prazo_em timestamptz not null,      -- iniciado_em + duracao (limitado a fecha_em + 1 dia)
  respostas jsonb not null default '{}'::jsonb,  -- {id_questao: letra NOVA | null}
  revisar jsonb not null default '[]'::jsonb,    -- ids marcados para rever
  salvo_em timestamptz,
  entregue_em timestamptz,
  entrega_automatica boolean default false,
  acertos int, total int, segundos int, no_tempo boolean,
  por_area jsonb,                     -- {area: {certas, total}}
  primary key (edicao, usuario_id)
)
```

### Funções RPC

Os nomes e as formas de retorno abaixo são fixos. `auth.uid()` identifica a pessoa. Os erros saem com `raise exception` usando um código curto que o front entende: `premium_necessario`, `edicao_fechada`, `edicao_nao_aberta`, `ja_entregue`, `nao_iniciado`, `tempo_esgotado`, `nao_admin`, `edicao_com_participantes`, `edicao_invalida`.

- **`sn_obter(p_edicao text default null) → jsonb`** (anon e authenticated). Sem `p_edicao`, retorna a edição em destaque: a véspera aberta, senão a mensal aberta, senão a próxima a abrir, senão a última encerrada. Formato:
  ```
  { edicao, tipo, titulo, abre_em, fecha_em, duracao_min, total,
    por_area: [{area, n}],
    participantes: int|null,                 -- null se < 10
    tambem_no_ar: [{edicao,titulo,tipo}],
    minha: null | {iniciado_em, prazo_em, entregue_em, acertos, total, segundos, no_tempo, respondidas},
    anteriores: [{edicao, titulo, tipo, minha: {acertos,total,no_tempo}|null}],   -- até 12, inclui a versão antiga de outubro com titulo 'Outubro de 2026 (versão anterior)' e edicao '2026-10-antiga'
    agora: timestamptz }
  ```
- **`sn_iniciar(p_edicao text) → jsonb`**. Exige premium (`tem_premium_interno`) e a edição aberta e publicada. É idempotente: se a pessoa já começou, devolve o mesmo início. Formato: `{edicao, iniciado_em, prazo_em, duracao_min, itens: [{ordem, id_questao, permutacao}], respostas, revisar}`. Não devolve gabarito.
- **`sn_salvar(p_edicao text, p_respostas jsonb, p_revisar jsonb default null) → jsonb {salvo_em}`**. Mescla as respostas (a última vence). Só aceita até `prazo_em` + 5 minutos e antes da entrega; depois disso dá `tempo_esgotado` ou `ja_entregue`.
- **`sn_entregar(p_edicao text, p_respostas jsonb default null) → jsonb`**. Mescla as respostas finais (se ainda estiver no prazo + 5 minutos), corrige no servidor e grava. É idempotente: a segunda chamada devolve o resultado gravado. Formato: `{acertos, total, segundos, no_tempo, por_area}`. Não exige premium, para quem perdeu a assinatura no meio da prova.
- **`sn_entregar_vencidas() → int`** (só o service role, chamada pelo pg_cron a cada 10 minutos). Entrega com `entrega_automatica = true` toda participação com `prazo_em + 5 min < now()` que não foi entregue.
- **`sn_resultado(p_edicao text) → jsonb`**. Só para quem já entregou. Formato:
  ```
  { acertos,total,segundos,no_tempo,entregue_em,
    posicao:int|null, colocados:int, percentil:int|null,   -- posição e percentil só premium e no_tempo
    media: numeric|null, media_segundos:int|null,          -- médias só das entregas no prazo
    por_area: [{area, certas, total, media}],             -- media = média da área entre as entregas no prazo
    encerrada: boolean }
  ```
- **`sn_ranking(p_edicao text, p_area text default null, p_limite int default 10) → jsonb`** (anon e authenticated). Formato: `{colocados, top: [{posicao, apelido, acertos, total, segundos, eh_voce}], voce: {posicao, acertos, total, segundos}|null, melhores_por_area: [{area, apelido, certas, total}]}`. Respeita `perfis_publicos.participa_ranking` e `ranking_ocultos`, e usa o mesmo apelido do ranking atual. `melhores_por_area` só aparece com 10 ou mais entregas.
- **`sn_gabarito(p_edicao text) → table(ordem int, id_questao text, permutacao text, gabarito char(1), marcada char(1))`**. Só para quem já entregou.
- **Admin** (todas checam `eh_admin`/o mesmo critério dos admins atuais):
  - `sn_admin_listar() → jsonb`: as edições com `{edicao,tipo,titulo,abre_em,fecha_em,duracao_min,publicado,total,participantes,entregas,media, ids:[...] }`.
  - `sn_admin_salvar(p_edicao, p_tipo, p_titulo, p_abre_em, p_fecha_em, p_duracao_min, p_itens jsonb, p_publicar boolean) → jsonb`. Cada item é `{ordem,id_questao,area,foco,gabarito_original,permutacao}` e o `gabarito` é calculado no servidor. Aceita de 10 a 200 itens e recusa trocar itens se a edição já tem participantes (`edicao_com_participantes`).
  - `sn_admin_trocar_item(p_edicao, p_ordem, p_item jsonb) → jsonb`: só sem participantes.
  - `sn_admin_publicar(p_edicao, p_publicado boolean) → jsonb`: despublicar só sem participantes.
  - `sn_admin_datas(p_edicao, p_abre_em, p_fecha_em) → jsonb`: só antes de abrir. Depois de aberta, só permite estender `fecha_em`.
  - `sn_admin_estatisticas(p_edicao) → jsonb`: `{participantes, entregas, no_tempo, media, por_area:[...], mais_erradas:[{id_questao, ordem, erros, total}] }`.
- **Compatibilidade:**
  - `autorizar_resposta`: as questões de uma participação `sn_` aberta não gastam o limite diário. Redeclarar a função mantendo o comportamento atual (`202610110100_limite_janela_24h.sql`) e acrescentar o caso.
  - `meus_feitos` e os emblemas passam a contar `sn_participacoes` mensais, além das antigas.
  - `candidatos_simulado_resultado` (parte 31) lê `sn_participacoes`. Redeclarar sem quebrar a assinatura.

## Front: dados (`src/dados/simuladoNacional.ts`, reescrito)

Exportações fixas:
```ts
export const QUESTOES_MENSAL = 50, DURACAO_MENSAL_MIN = 120
export type TipoEdicao = 'mensal' | 'vespera'
export const PROVAS_NACIONAL: ReadonlySet<string>          // 'TEOT','TARO','TEOT/TARO'
export interface CandidataNacional { id: string; area: string; areaSlug: string; foco: string | null; nivel: 0|1|2|3|4; ano: number | null; gabarito: 'A'|'B'|'C'|'D'|'E'; nAlternativas: number }
export function candidatasDoIndice(indice: Indice, gabaritoDe: (id: string) => string | undefined, nAltDe: (id: string) => number | undefined): CandidataNacional[]   // aplica todos os filtros
export interface Cota { area: string; areaSlug: string; alvo: number; peso: number; pct: number }
export function cotasPorArea(candidatas: CandidataNacional[], total: number, anoAtual?: number): Cota[]   // soma = total, maior resto, mínimo 1 por área com candidatas
export interface ItemSorteado extends CandidataNacional { ordem: number; permutacao: string; gabaritoNovo: string }
export function sortearEdicao(candidatas: CandidataNacional[], edicao: string, opcoes?: { total?: number; usadas?: Set<string>; anoAtual?: number }): ItemSorteado[]
   // determinístico pela semente da edição; ~60% níveis 3–4 dentro da área; no máximo 1/3 do mesmo ano; usadas ficam fora (se faltar, aceita usadas por último); ordem final embaralhada
export function permutar(n: number, semente: number): string            // ex.: 'CADB'
export function letraOriginal(permutacao: string, letraNova: string): string
export function letraNova(permutacao: string, letraOriginal: string): string
export function trocarItem(candidatas: CandidataNacional[], atual: ItemSorteado[], ordem: number, edicao: string): ItemSorteado | null   // mesma área (e foco, se der), não usada
export function edicaoDoMes(data?: Date): string
export function fimDoMes(edicao: string): string        // último segundo do mês, -03:00
export function inicioDoMes(edicao: string): string     // dia 1º, 00:00 -03:00
export type Situacao = 'em-breve' | 'aberta' | 'andamento' | 'tempo-esgotado' | 'entregue' | 'encerrada'
export function situacao(ed: {abre_em: string; fecha_em: string; minha: null | {prazo_em: string; entregue_em: string | null}}, agora?: number): Situacao
export function segundosRestantes(prazoEm: string, agora?: number): number
```
O cliente RPC tipado fica em `src/dados/apiSimuladoNacional.ts`, com uma função por RPC e os tipos dos formatos acima.

## Quem cuida de cada arquivo

| Parte | Arquivos |
|---|---|
| A: sorteio | `src/dados/simuladoNacional.ts`, `scripts/gerar_simulado_nacional.mjs`, `fixtures/testar_sorteio_nacional.mjs` (registrado no `npm test`) |
| B: banco | migration e partes 32, `fixtures/sql/testar_parte32.sql` e o script que roda, `src/dados/apiSimuladoNacional.ts`, `supabase/functions/**` (campanha `simulado_resultado`), e-mails ("de 50") |
| C: página e prova | `src/paginas/SimuladoNacional.tsx`, o CSS dela, `src/dados/entregaNacional.ts`, o modo nacional em `Sessao.tsx`, `CartaoQuestao.tsx`, `estado/sessao.ts`, `Resumo.tsx`, `QuestaoDireta` (o aviso de prova em andamento) |
| D: admin | `src/componentes/admin/AdminSimulados.tsx` e o CSS dele |

## Adendo de 19/10: pedidos do Tales ("design mais explicativo e prático", "botão na página inicial", "configurar melhor o simulado no painel")

- **Banco:**
  - `sn_edicoes` ganha as colunas `descricao`, `destaque_inicio` (padrão true) e `config` jsonb, onde fica o registro do sorteio: provas, peso dos recentes, anos recentes, cotas e percentual de nível alto.
  - `sn_admin_salvar` recebe `p_descricao`, `p_destaque_inicio` e `p_config` no fim da lista de parâmetros.
  - Funções novas:
    - `sn_admin_config(p_edicao, p_titulo, p_descricao, p_destaque_inicio)`: edita o texto e o destaque a qualquer momento;
    - `sn_destaque_inicio()`: entrega o botão da página inicial.
  - `sn_obter` passa a devolver também `descricao`, `destaque_inicio` e a parte pública de `config`.
- **Sorteio:** `sortearEdicao` aceita, nas opções, `provas`, `pesoRecentes`, `anosRecentes`, `nivelAltoPct` e `cotas` (ajuste manual por área). Ficam disponíveis `ConfigSorteio` e `CONFIG_PADRAO`.
- **Painel:** a montagem tem uma seção de configuração com:
  - número de questões e duração;
  - provas (TEOT, TARO, TEOT/TARO);
  - peso dos recentes;
  - percentual de nível alto;
  - cotas por área, editáveis, com a soma conferida e o botão "voltar ao automático";
  - título e descrição;
  - "mostrar na página inicial";
  - prévia de como a página vai aparecer.
- **Página:** explicativa e prática.
  - "Como funciona" em 4 passos com ícones.
  - A distribuição por área como gráfico de barras simples.
  - O que acontece com o tempo, com as respostas e com o ranking.
  - Perguntas frequentes curtas.
  - Um único botão principal por estado.
- **Página inicial:** um cartão ou botão "Simulado Nacional" no Início, alimentado por `sn_destaque_inicio`, com o estado da pessoa: começar, continuar, ver resultado ou "abre em N dias".

## Adendo 2 (19/10): inscrição e datas de outubro (pedido do Tales: "abrir inscrição; não dá para entender quando vai ser nem como se inscreve")

- **Inscrição:** a tabela `sn_inscricoes` guarda quem se inscreveu.
  - Qualquer conta pode se inscrever, pelas funções `sn_inscrever` e `sn_cancelar_inscricao`.
  - Começar a prova também inscreve a pessoa.
  - Quem se inscreveu recebe o e-mail de lembrete (campanha `simulado_lembrete`) na véspera da abertura ("abre amanhã") e no dia ("abriu hoje").
- **`aberto_a_todos`:** a edição pode ficar livre para qualquer conta grátis. **Outubro de 2026 é a edição de lançamento e fica aberta a todos** (decisão do Claude): serve para trazer gente nova, e quem não assina conhece o recurso.
- **Datas de outubro (decisão do Claude):**
  - as inscrições abrem quando a parte 32 entrar no ar;
  - a prova fica disponível de **sábado, 24/10, às 8h** a **sábado, 31/10, às 23h59** (corrigido: 25/10 era domingo) (horário de Brasília);
  - cada pessoa tem 2 horas a partir do momento em que começa;
  - o ranking final sai em **01/11**.
  
  A janela de uma semana é para caber na rotina de plantão. A página mostra essas datas em destaque, com contagem regressiva.
- **Página:** o topo responde de cara às três perguntas que o Tales não conseguiu responder: **quando** (as datas), **o que é** (50 questões oficiais, 2 horas, ranking nacional) e **como participar** (o botão "Quero participar" faz a inscrição, e no dia "Começar a prova").
