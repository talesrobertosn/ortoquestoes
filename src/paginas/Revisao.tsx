/* Contrato de preservação: [x] área persistente/URL; [x] estados de hoje; [x] texto contextual;
 * [x] iniciar/revisão curta/adiantar; [x] hoje, sequência e fila; [x] resgate; [x] flashcards;
 * [x] calendário; [x] quatro famílias de conquistas; [x] teto e folgas; [x] escadas e atalhos;
 * [x] carregamento. Extensões: modo leve, prévia, análise, fila detalhada e recuperação ativa. */
import { useEffect, useMemo, useState } from "react";
import { usarIndice } from "../dados/usarIndice";
import { usarContextoLocal } from "../estado/usarContextoLocal";
import {
  planoRevisao,
  inicioDia,
  chaveDia,
  revisoesFeitasHoje,
  vencimentoDe,
  type DiaRevisao,
  type RitmoRevisao,
} from "../estado/planoRevisao";
import { usarRitmoRevisao } from "../estado/preferencias";
import { usarSessao, type ResumoHistorico } from "../estado/sessao";
import { AREAS_TREINO, FILTROS_VAZIOS } from "../dados/tipos";
import { href, navegar } from "../util/rotas";
import { INTERVALOS } from "../estado/revisao";
import { diaDaSemana, FUSO_DIA, inicioDaChave } from "../util/dia";
import { Icone } from "../componentes/Icone";
import { resumoRevisoes, sequenciaRevisao } from "../estado/metasRevisao";
import { usarFeitos } from "../conta/feitos";
import { usarArmazenado } from "../estado/usarArmazenado";
import { CalendarioRevisao } from "./RevisaoCalendario";
import { corDaArea } from "../dados/coresAreas";
import { CenaRevisao } from "../componentes/revisao/CenaRevisao";
import {
  NavegacaoRevisao,
  type SecaoRevisao,
} from "../componentes/revisao/NavegacaoRevisao";
import { usarPremium } from "../conta/premium";
import { usarPlanoSalvo } from "../conta/cronograma";
import { carregarIndiceBibliotecaLeve } from "../biblioteca/conteudo";
import type { IndiceBibliotecaLeve } from "../biblioteca/tipos";
import { resumosDoDia } from "../dados/cronogramaRoteiro";
import { focoPorQuestao } from "../dados/incidencia";
import {
  atendeFiltro,
  catalogoRevisao,
  FILTRO_REVISAO,
  historicoDe,
  motivoRevisao,
  ordenarRevisoes,
  previsaoResgate,
  proximasDatas,
  reincidente,
  segundosPorRevisao,
  type EstadoFila,
  type FiltroRevisao,
  type OrdemRevisao,
} from "../dados/revisoesPainel";
import {
  AnaliseRevisao,
  type ObservacaoFila,
} from "../componentes/revisao/AnaliseRevisao";
import {
  ConquistasRevisao,
  FlashcardsDeHoje,
} from "../componentes/revisao/ComplementosRevisao";
import { PreviaRevisao } from "../componentes/revisao/PreviaRevisao";
import "../estilos/paginas/Revisao.css";

const n = (v: number) => v.toLocaleString("pt-BR");
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: FUSO_DIA,
});
const ESTADOS: Array<[EstadoFila, string]> = [
  ["todas", "Todas as pendências"],
  ["vencidas", "Vencidas"],
  ["erros", "Última resposta errada"],
  ["certeza", "Erros com certeza"],
  ["incertas", "Dúvidas e chutes"],
  ["reincidentes", "Erros reincidentes"],
];
export function Revisao() {
  const { indice, carregando, erro: erroIndice } = usarIndice(),
    { contexto } = usarContextoLocal(""),
    { iniciarComAviso, sessao } = usarSessao();
  const { ritmo, definirRitmo } = usarRitmoRevisao(),
    { premium } = usarPremium(),
    { plano: planoEstudo } = usarPlanoSalvo(premium);
  const [areaAntiga, definirAreaAntiga] = usarArmazenado<string | null>(
    "revisao:area",
    null,
  );
  const [areasSalvas, definirAreasSalvas] = usarArmazenado<string[] | null>(
    "revisao:areas",
    null,
  );
  const [filtro, definirFiltro] = useState<FiltroRevisao>(() => {
    const url = new URLSearchParams(location.hash.split("?")[1] ?? "").get(
      "area",
    );
    return {
      ...FILTRO_REVISAO,
      areas: url ? [url] : (areasSalvas ?? (areaAntiga ? [areaAntiga] : [])),
    };
  });
  useEffect(() => {
    definirAreasSalvas(filtro.areas);
    definirAreaAntiga(filtro.areas.length === 1 ? filtro.areas[0] : null);
  }, [filtro.areas.join(",")]);
  const [ordem, definirOrdem] = useState<OrdemRevisao>("recomendada");
  const [compacto, definirCompacto] = usarArmazenado("revisao:compacto", false);
  const [lembrar, definirLembrar] = usarArmazenado(
    "revisao:recuperacao-ativa",
    false,
  );
  const [historico] = usarArmazenado<ResumoHistorico[]>("historico", []);
  const [diasMeta, definirDiasMeta] = usarArmazenado<string[]>(
    "revisao:dias-meta",
    [],
  );
  const [observacoes, definirObservacoes] = usarArmazenado<ObservacaoFila[]>(
    "revisao:observacoes",
    [],
  );
  const [agora, definirAgora] = useState(Date.now());
  useEffect(() => {
    const atualizar = () => definirAgora(Date.now());
    const t = window.setInterval(atualizar, 60000);
    window.addEventListener("focus", atualizar);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", atualizar);
    };
  }, []);
  const hoje = inicioDia(agora),
    chaveHoje = chaveDia(hoje);
  const [biblioteca, definirBiblioteca] = useState<IndiceBibliotecaLeve | null>(
    null,
  );
  useEffect(() => {
    let vivo = true;
    carregarIndiceBibliotecaLeve()
      .then((b) => vivo && definirBiblioteca(b))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  const catalogo = useMemo(
    () => (indice ? catalogoRevisao(indice, contexto.respondidas) : null),
    [indice, contexto.respondidas],
  );
  const todos = catalogo?.registros ?? {};
  const chaveRitmo = JSON.stringify(ritmo);
  const planoGeral = useMemo(
    () =>
      indice && catalogo
        ? planoRevisao(indice, catalogo.registros, 400, ritmo)
        : new Map<string, DiaRevisao>(),
    [indice, catalogo, chaveRitmo, chaveHoje],
  );
  const registros = useMemo(
    () =>
      !indice || !catalogo
        ? {}
        : Object.fromEntries(
            Object.entries(catalogo.registros).filter(([id, r]) =>
              atendeFiltro(catalogo.itens.get(id)!, r, indice, filtro, agora),
            ),
          ),
    [indice, catalogo, filtro, agora],
  );
  const plano = useMemo(
    () =>
      new Map(
        [...planoGeral].map(([k, d]) => {
          const ids = d.ids.filter((id) => !!registros[id]);
          const temas = new Map<string, number>();
          let acertos = 0,
            tentativas = 0,
            atrasadas = 0;
          for (const id of ids) {
            const r = registros[id],
              q = catalogo!.itens.get(id)!,
              nome = indice!.temas[q.t].nome;
            temas.set(nome, (temas.get(nome) ?? 0) + 1);
            acertos += r.acertos ?? Number(r.c === true);
            tentativas += r.tentativas ?? 1;
            if ((vencimentoDe(r) ?? Infinity) < hoje) atrasadas++;
          }
          return [k, { ...d, ids, temas, acertos, tentativas, atrasadas }];
        }),
      ),
    [planoGeral, registros, indice, catalogo, hoje],
  );
  const reserva = plano.get(chaveHoje)?.ids ?? [],
    idsHoje = useMemo(
      () =>
        indice ? ordenarRevisoes(reserva, registros, indice, ordem, agora) : [],
      [reserva.join(","), registros, indice, ordem, agora],
    );
  const pendentes = Object.keys(registros).filter(
    (id) => vencimentoDe(registros[id]) !== null,
  );
  const vencidas = pendentes.filter(
    (id) => inicioDia(vencimentoDe(registros[id])!) <= hoje,
  );
  const pendentesGerais = Object.values(todos).filter(
    (r) => vencimentoDe(r) !== null,
  ).length;
  const vencidasGerais = Object.values(todos).filter(
    (r) => vencimentoDe(r) !== null && inicioDia(vencimentoDe(r)!) <= hoje,
  ).length;
  useEffect(() => {
    if (!catalogo || carregando) return;
    definirObservacoes((anteriores) => {
      const ultima = anteriores.find((o) => o.dia === chaveHoje);
      if (
        ultima?.pendentes === pendentesGerais &&
        ultima.vencidas === vencidasGerais
      )
        return anteriores;
      return [
        ...anteriores.filter((o) => o.dia !== chaveHoje),
        {
          dia: chaveHoje,
          vencidas: vencidasGerais,
          pendentes: pendentesGerais,
        },
      ]
        .sort((a, b) => a.dia.localeCompare(b.dia))
        .slice(-182);
    });
  }, [catalogo, carregando, chaveHoje, pendentesGerais, vencidasGerais]);
  const feitas = revisoesFeitasHoje(registros, agora),
    feitasGerais = revisoesFeitasHoje(todos, agora);
  useEffect(() => {
    if (
      catalogo &&
      feitasGerais > 0 &&
      !planoGeral.get(chaveHoje)?.ids.length &&
      !ritmo.folgas.includes(diaDaSemana(hoje)) &&
      !diasMeta.includes(chaveHoje)
    )
      definirDiasMeta([...diasMeta, chaveHoje].slice(-730));
  }, [catalogo, feitasGerais, planoGeral, chaveHoje, diasMeta]);
  const resumo = useMemo(
      () => resumoRevisoes(contexto.respondidas),
      [contexto.respondidas],
    ),
    feitos = usarFeitos();
  const sequencia = sequenciaRevisao(
    resumo.porDia,
    {
      diasZerados: [...(feitos?.dias?.fila_zerada ?? []), ...diasMeta],
      folgas: ritmo.folgas,
    },
    agora,
  );
  const previsao = useMemo(
    () => previsaoResgate(todos, ritmo, planoEstudo?.data_prova, agora),
    [catalogo, chaveRitmo, planoEstudo?.data_prova, agora],
  );
  const [ritmoRascunho, definirRascunho] = useState<RitmoRevisao>(ritmo);
  const simulacao = useMemo(
    () => previsaoResgate(todos, ritmoRascunho, planoEstudo?.data_prova, agora),
    [catalogo, JSON.stringify(ritmoRascunho), planoEstudo?.data_prova, agora],
  );
  const segundos = segundosPorRevisao(historico),
    minutos = (q: number) => Math.max(1, Math.ceil((q * segundos) / 60)),
    curta = Math.max(1, Math.floor(300 / segundos));
  const [quantidade, definirQuantidade] = useState(15),
    [tempo, definirTempo] = useState(5),
    [unidade, definirUnidade] = useState<"tempo" | "questoes">("tempo");
  const [previa, definirPrevia] = useState<{
    ids: string[];
    titulo: string;
  } | null>(null);
  const [pagina, definirPagina] = useState(1),
    [expandida, definirExpandida] = useState<string | null>(null);
  useEffect(() => definirPagina(1), [filtro, ordem]);
  const datas = useMemo(
    () => proximasDatas(todos, ritmo, agora),
    [catalogo, chaveRitmo, agora],
  );
  const [diaSelecionado, definirDiaSelecionado] = useState<
    string | undefined
  >();
  const filtrado = !!(
    filtro.areas.length ||
    filtro.prova ||
    filtro.assunto ||
    filtro.estado !== "todas"
  );
  const leve = ritmo.modo === "leve",
    folga = ritmo.folgas.includes(diaDaSemana(hoje));
  const verSessao = (ids: string[], titulo = "Sua próxima revisão") => {
    if (ids.length) definirPrevia({ ids, titulo });
  };
  const comecar = async () => {
    if (!previa || !indice) return;
    const antes = Object.fromEntries(
      previa.ids.map((id) => [
        id,
        {
          c: todos[id].c,
          q: todos[id].q,
          sequencia: todos[id].sequencia ?? 0,
          proximaRevisao: todos[id].proximaRevisao ?? null,
          confianca: todos[id].confianca ?? "seguro",
        },
      ]),
    );
    if (
      await iniciarComAviso(
        {
          ...FILTROS_VAZIOS,
          areas: AREAS_TREINO,
          limite: previa.ids.length,
          situacao: "revisarHoje",
          embaralhar: false,
        },
        previa.ids,
        { origem: "revisao", revisao: { recuperacaoAtiva: lembrar, antes } },
      )
    ) {
      definirPrevia(null);
      navegar("/sessao");
    }
  };
  const focos = useMemo(
    () => (indice ? focoPorQuestao(indice) : new Map()),
    [indice],
  );
  const recomendados = useMemo(
    () =>
      indice
        ? resumosDoDia(
            biblioteca,
            indice,
            pendentes.filter(
              (id) => reincidente(registros[id]) || registros[id].c === false,
            ),
            3,
          )
        : [],
    [biblioteca, indice, registros],
  );
  if (erroIndice)
    return (
      <section className="estado" role="alert">
        <h1>Sua revisão está guardada.</h1>
        <p>
          Não foi possível carregar o catálogo de questões. Confira a conexão e
          tente novamente.
        </p>
        <button className="botao" onClick={() => location.reload()}>
          Tentar novamente
        </button>
      </section>
    );
  if (carregando || !indice || !catalogo)
    return (
      <div className="estado" role="status">
        <p>Preparando sua revisão…</p>
      </div>
    );
  const incertasIds = Object.keys(registros).filter(
    (id) =>
      registros[id].confianca === "chute" ||
      registros[id].confianca === "duvida",
  );
  const fila = ordenarRevisoes(pendentes, registros, indice, ordem, agora);
  const assuntos = [
    ...new Set(
      Object.keys(todos)
        .flatMap((id) =>
          catalogo.itens.get(id)!.s.map((s) => indice.subtemas[s]),
        )
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const provas = [
    ...new Set(
      Object.keys(todos)
        .map((id) => {
          const p = catalogo.itens.get(id)!.p;
          return p === null ? "" : indice.provas[p];
        })
        .filter(Boolean),
    ),
  ].sort();
  const atualizarFiltro = (parcial: Partial<FiltroRevisao>) =>
    definirFiltro((f) => ({ ...f, ...parcial }));
  const mudarModo = (modo: "leve" | "regular") => {
    const novo = {
      ...ritmo,
      modo,
      limite: modo === "leve" ? curta : 30,
      retomadaEm: undefined,
    };
    definirRitmo(novo);
    definirRascunho(novo);
  };
  const mostrarCalendario = (dia: string) => {
    definirDiaSelecionado(dia);
    document
      .getElementById("rvp-calendario")
      ?.scrollIntoView({ block: "start" });
  };
  const proxima = [...plano.values()]
    .filter((d) => d.inicio > hoje && d.ids.length)
    .sort((a, b) => a.inicio - b.inicio)[0];
  const secoes: SecaoRevisao[] = [
    { id: "rvp-topo", nome: "Hoje e seu passo", icone: "raio" },
    { id: "rvp-resgate", nome: "Plano de resgate", icone: "rota" },
    { id: "rvp-calendario", nome: "Calendário", icone: "calendario" },
    { id: "rvp-aprendizado", nome: "Aprendizado", icone: "grafico" },
    { id: "rvp-fila", nome: "Explorar fila", icone: "alvo" },
    { id: "rvp-flashcards", nome: "Flashcards", icone: "raio" },
    { id: "rvp-conquistas", nome: "Conquistas", icone: "trofeu" },
    { id: "rvp-ritmo", nome: "Seu ritmo", icone: "relogio" },
    { id: "rvp-regra", nome: "Como funciona", icone: "interrogacao" },
  ];
  const tituloHoje = idsHoje.length
    ? `${idsHoje.length} ${filtro.areas.length === 1 ? "de " + indice.temas.find((t) => t.slug === filtro.areas[0])?.nome.toLowerCase() + " " : ""}para hoje`
    : folga
      ? "Hoje é dia de folga"
      : feitas
        ? "Revisão de hoje zerada"
        : "Tudo em dia por aqui";
  return (
    <div className={`rvp${compacto ? " rvp--compacto" : ""}`}>
      <NavegacaoRevisao secoes={secoes} />
      <div className="rvp-conteudo">
        <section
          className="rvp-topo"
          id="rvp-topo"
          aria-labelledby="rvp-titulo"
        >
          <CenaRevisao>
            <p className="rvp-selo">
              <Icone nome="calendario" tamanho={14} /> REVISÃO ·{" "}
              {DATA.format(hoje)}
            </p>
            <h1 id="rvp-titulo">
              {tituloHoje}
              {idsHoje.length > 0 && (
                <small> · ~{minutos(idsHoje.length)} min</small>
              )}
            </h1>
          </CenaRevisao>
          <div className="rvp-topo__painel">
            <div className="rvp-topo__mensagem">
              <p className="rvp-mensagem">
                {idsHoje.length ? (
                  leve ? (
                    <>
                      Uma meta pequena de propósito:{" "}
                      <b>{idsHoje.length} questões</b>, cerca de{" "}
                      <b>{minutos(idsHoje.length)} minutos</b>. Esse passo já
                      vale. O restante continua guardado para outro dia.
                    </>
                  ) : (
                    <>
                      {vencidasGerais > idsHoje.length ? (
                        <>
                          Há <b>{n(vencidasGerais)} questões vencidas</b> na
                          fila geral. Hoje, seu plano reserva{" "}
                          <b>{idsHoje.length}</b>
                          {filtrado ? " neste recorte" : ""}.{" "}
                        </>
                      ) : (
                        <>
                          Hoje você tem <b>{idsHoje.length} revisões</b>.{" "}
                        </>
                      )}
                      Comece pelo que mais precisa de atenção, no tempo que você
                      tem.
                    </>
                  )
                ) : folga ? (
                  <>
                    Hoje é <b>folga no seu ritmo</b>. As pendências foram
                    reservadas para o próximo dia de estudo; revisar agora é
                    opcional.
                  </>
                ) : feitas ? (
                  <>
                    Você revisou <b>{feitas} questões hoje</b>. Seu passo está
                    feito. Pode encerrar por aqui ou adiantar uma sessão curta.
                  </>
                ) : (
                  <>
                    Nada vence hoje{filtrado ? " neste recorte" : ""}.{" "}
                    {pendentes.length ? (
                      <>
                        As próximas estão <b>reservadas para depois</b>.
                      </>
                    ) : (
                      "Responda questões novas e o calendário se organiza sozinho."
                    )}
                  </>
                )}
              </p>
              <div className="rvp-acoes">
                {idsHoje.length ? (
                  <>
                    <button
                      className="rvp-primario"
                      onClick={() =>
                        verSessao(
                          idsHoje,
                          leve ? "Seu passo leve de hoje" : "Revisão de hoje",
                        )
                      }
                    >
                      <Icone nome="raio" tamanho={18} />
                      {leve ? "Fazer meu passo de hoje" : "Começar revisão"}
                      <span>
                        {idsHoje.length} questões · ~{minutos(idsHoje.length)}{" "}
                        min
                      </span>
                    </button>
                    {!leve && idsHoje.length > curta && (
                      <button
                        className="rvp-secundario"
                        onClick={() =>
                          verSessao(
                            idsHoje.slice(0, curta),
                            "Sessão de cinco minutos",
                          )
                        }
                      >
                        Só 5 minutos
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <a className="rvp-primario" href={href("/treinar")}>
                      Treinar questões novas
                    </a>
                    {proxima && (
                      <button
                        className="rvp-secundario"
                        onClick={() =>
                          verSessao(
                            proxima.ids.slice(0, curta),
                            "Revisão adiantada opcional",
                          )
                        }
                      >
                        Adiantar {Math.min(curta, proxima.ids.length)} ·{" "}
                        {DATA.format(proxima.inicio)}
                      </button>
                    )}
                  </>
                )}
              </div>
              <dl className="rvp-resumo">
                <div>
                  <dt>Hoje</dt>
                  <dd>
                    <svg
                      className="rvp-anel"
                      viewBox="0 0 88 88"
                      role="img"
                      aria-label={`${feitas} de ${feitas + idsHoje.length} questões revisadas hoje`}
                    >
                      <circle cx="44" cy="44" r="36" />
                      <circle
                        cx="44"
                        cy="44"
                        r="36"
                        pathLength="100"
                        strokeDasharray={`${feitas + idsHoje.length ? (feitas / (feitas + idsHoje.length)) * 100 : 0} 100`}
                        transform="rotate(-90 44 44)"
                      />
                      <text x="44" y="43" textAnchor="middle">
                        {feitas}
                      </text>
                      <text
                        className="rvp-anel__total"
                        x="44"
                        y="60"
                        textAnchor="middle"
                      >
                        de {feitas + idsHoje.length}
                      </text>
                    </svg>
                  </dd>
                  <small>
                    {idsHoje.length
                      ? `faltam ${idsHoje.length}`
                      : feitas
                        ? "seu passo está feito"
                        : "nada reservado"}
                  </small>
                </div>
                <div>
                  <dt>Sequência</dt>
                  <dd>
                    {sequencia.atual}
                    <small> dias</small>
                  </dd>
                  <small>
                    {sequencia.hojeConta
                      ? "hoje já conta"
                      : folga
                        ? "folga preserva a sequência"
                        : leve
                          ? "conclua seu pequeno passo"
                          : "10 revisões ou meta concluída"}
                  </small>
                </div>
                <div>
                  <dt>Pela frente</dt>
                  <dd>{n(pendentes.length)}</dd>
                  <small>
                    {proxima
                      ? `próximas em ${DATA.format(proxima.inicio)}`
                      : "pendências no ciclo"}{" "}
                    · inclui hoje
                  </small>
                </div>
              </dl>
            </div>
            <aside className="rvp-modo" aria-label="Carga de revisão">
              <p className="rvp-selo">
                <Icone nome="relogio" tamanho={14} /> SEU TEMPO IMPORTA
              </p>
              <h2>Quanto cabe na sua rotina?</h2>
              <p>Você não precisa revisar tudo de uma vez.</p>
              <div className="rvp-modos">
                <button aria-pressed={leve} onClick={() => mudarModo("leve")}>
                  <strong>Modo leve</strong>
                  <span>~5 minutos por dia</span>
                  <small>Uma meta pequena para manter o contato.</small>
                </button>
                <button
                  aria-pressed={!leve}
                  onClick={() => mudarModo("regular")}
                >
                  <strong>Modo regular</strong>
                  <span>
                    {!leve && ritmo.limite !== 30
                      ? ritmo.retomadaEm
                        ? "Retomada gradual ativa"
                        : ritmo.limite === null
                          ? "Sem teto diário"
                          : `Até ${ritmo.limite} questões por dia`
                      : "Até 30 questões por dia"}
                  </span>
                  <small>Mais tempo para trabalhar a fila.</small>
                </button>
              </div>
              <p className="rvp-nota">
                Nenhuma pendência é apagada. Você escolhe o esforço de hoje.
              </p>
              <a
                className="rvp-secundario"
                href="#rvp-ritmo"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("rvp-ritmo")
                    ?.scrollIntoView({ block: "start" });
                  definirRascunho(ritmo);
                }}
              >
                Personalizar ritmo
              </a>
              <button
                className="rvp-secundario rvp-pequeno"
                aria-pressed={compacto}
                onClick={() => definirCompacto(!compacto)}
              >
                {compacto ? "Mostrar cenário" : "Visual compacto"}
              </button>
            </aside>
          </div>
          <div className="rvp-fila-resumo">
            <span>
              <b>{n(vencidas.length)}</b> vencidas no recorte
            </span>
            <span>
              <b>{n(idsHoje.length)}</b> reservadas para hoje
            </span>
            <span>
              <b>{n(Math.max(0, pendentes.length - idsHoje.length))}</b>{" "}
              agendadas para depois
            </span>
          </div>
        </section>
        {sessao?.origem === "revisao" && !sessao.concluidaEm && (
          <a className="rvp-continuar" href={href("/sessao")}>
            Continuar a revisão em andamento{" "}
            <span>
              {Object.keys(sessao.respostas).length} de {sessao.ids.length}{" "}
              respondidas <Icone nome="direita" tamanho={16} />
            </span>
          </a>
        )}
        <section className="rvp-filtros" aria-labelledby="rvp-filtros-titulo">
          <h2 id="rvp-filtros-titulo">O que você quer revisar?</h2>
          <p className="rvp-nota">
            Combine áreas, prova, assunto e situação. A seleção vale para toda a
            página.
          </p>
          <div className="rvp-filtros__campos">
            <label>
              Prova
              <select
                value={filtro.prova}
                onChange={(e) => atualizarFiltro({ prova: e.target.value })}
              >
                <option value="">Todas as provas</option>
                {provas.map((p) => (
                  <option key={p}>{p}</option>
                ))}
                <option value="__simulados">OrtoQuestões Simulados</option>
              </select>
            </label>
            <label>
              Assunto
              <select
                value={filtro.assunto}
                onChange={(e) => atualizarFiltro({ assunto: e.target.value })}
              >
                <option value="">Todos os assuntos</option>
                {assuntos.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label>
              Situação
              <select
                value={filtro.estado}
                onChange={(e) =>
                  atualizarFiltro({ estado: e.target.value as EstadoFila })
                }
              >
                {ESTADOS.map(([id, t]) => (
                  <option key={id} value={id}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset className="rvp-areas">
            <legend>Áreas · selecione uma ou mais</legend>
            <button
              type="button"
              className="rvp-chip"
              aria-pressed={!filtro.areas.length}
              onClick={() => atualizarFiltro({ areas: [] })}
            >
              Todas{" "}
              <small>
                {
                  Object.keys(todos).filter(
                    (id) =>
                      vencimentoDe(todos[id]) !== null &&
                      atendeFiltro(
                        catalogo.itens.get(id)!,
                        todos[id],
                        indice,
                        { ...filtro, areas: [] },
                        agora,
                      ),
                  ).length
                }
              </small>
            </button>
            {indice.temas.map((t) => {
              const ids = Object.keys(todos).filter(
                (id) =>
                  vencimentoDe(todos[id]) !== null &&
                  indice.temas[catalogo.itens.get(id)!.t].slug === t.slug &&
                  atendeFiltro(
                    catalogo.itens.get(id)!,
                    todos[id],
                    indice,
                    { ...filtro, areas: [] },
                    agora,
                  ),
              );
              return (
                <label key={t.slug}>
                  <input
                    type="checkbox"
                    checked={filtro.areas.includes(t.slug)}
                    onChange={() =>
                      atualizarFiltro({
                        areas: filtro.areas.includes(t.slug)
                          ? filtro.areas.filter((a) => a !== t.slug)
                          : [...filtro.areas, t.slug],
                      })
                    }
                  />
                  <i style={{ background: corDaArea(t.slug) }} />
                  {t.nome}
                  <small>{ids.length}</small>
                </label>
              );
            })}
          </fieldset>
          <p className="rvp-nota">
            Contagens são pendências no recorte. Filtrar não aumenta o teto
            diário nem muda os agendamentos da fila geral.
          </p>
          {filtrado && (
            <button
              className="rvp-secundario rvp-pequeno"
              onClick={() => definirFiltro({ ...FILTRO_REVISAO })}
            >
              Limpar filtros
            </button>
          )}
        </section>
        {catalogo.indisponiveis.length > 0 && (
          <details className="rvp-indisponiveis">
            <summary>
              {n(catalogo.indisponiveis.length)} registros antigos fora da fila
              ativa
            </summary>
            <p>
              Questões ausentes do catálogo atual, anuladas ou identificadas
              como cópias não ocupam sua meta. Seu histórico permanece guardado;
              nenhuma resposta foi apagada.
            </p>
            <p>
              {catalogo.indisponiveis.slice(0, 30).join(" · ")}
              {catalogo.indisponiveis.length > 30 ? "…" : ""}
            </p>
          </details>
        )}
        <section className="rvp-secao" id="rvp-sessao">
          <header className="rvp-secao-cabeca">
            <div>
              <p className="rvp-selo">
                <Icone nome="raio" tamanho={14} /> PRÓXIMO PASSO
              </p>
              <h2>Quanto tempo você tem agora?</h2>
              <p>Escolha uma sessão que caiba no seu dia.</p>
            </div>
          </header>
          <div className="rvp-hoje-grade">
            <section className="rvp-folha rvp-sessao">
              <header>
                <p className="rvp-selo">ESCOLHA UM PASSO POSSÍVEL</p>
                <h2>Quanto cabe agora?</h2>
                <p>
                  Uma sessão pequena também vale. Você pode parar ao terminar.
                </p>
              </header>
              <div
                className="rvp-segmentos"
                role="group"
                aria-label="Escolher duração ou quantidade"
              >
                <button
                  aria-pressed={unidade === "tempo"}
                  onClick={() => definirUnidade("tempo")}
                >
                  Por tempo
                </button>
                <button
                  aria-pressed={unidade === "questoes"}
                  onClick={() => definirUnidade("questoes")}
                >
                  Por questões
                </button>
              </div>
              {unidade === "tempo" ? (
                <div className="rvp-opcoes">
                  {[5, 10, 15].map((v) => (
                    <button
                      key={v}
                      aria-pressed={tempo === v}
                      onClick={() => definirTempo(v)}
                    >
                      <b>{v}</b> minutos
                      <small>
                        ~{Math.max(1, Math.floor((v * 60) / segundos))} questões
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <label className="rvp-campo">
                  Quantidade de questões
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, pendentes.length)}
                    value={quantidade}
                    onChange={(e) =>
                      definirQuantidade(
                        Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                      )
                    }
                  />
                </label>
              )}
              <button
                className="rvp-primario"
                disabled={!fila.length}
                onClick={() =>
                  verSessao(
                    [
                      ...idsHoje,
                      ...fila.filter((id) => !idsHoje.includes(id)),
                    ].slice(
                      0,
                      unidade === "tempo"
                        ? Math.max(1, Math.floor((tempo * 60) / segundos))
                        : quantidade,
                    ),
                    "Sessão no seu ritmo",
                  )
                }
              >
                Ver minha sessão <Icone nome="direita" tamanho={16} />
              </button>
              <p className="rvp-nota">
                {idsHoje.length
                  ? "Começa pelas reservadas para hoje. Uma sessão maior pode incluir pendências de outros dias."
                  : "Sessão extra opcional com as pendências disponíveis."}{" "}
                Tempo{" "}
                {segundos === 40
                  ? "estimado em 40 segundos por questão"
                  : "baseado nas suas sessões de revisão concluídas"}
                .
              </p>
            </section>
            <section className="rvp-folha rvp-resgate" id="rvp-resgate">
              <header>
                <p className="rvp-selo">UM PLANO PARA O ACUMULADO</p>
                <h2>
                  {vencidasGerais
                    ? `${n(vencidasGerais)} vencidas, um passo por vez.`
                    : "Sua fila está em dia."}
                </h2>
                <p>
                  O teto distribui a carga. A data original de vencimento
                  continua visível.
                </p>
              </header>
              <div className="rvp-resgate__dados">
                <span>
                  Estimativa de resgate da fila geral
                  <strong>
                    {previsao.foraJanela
                      ? "Além de 400 dias"
                      : previsao.fim
                        ? DATA.format(previsao.fim)
                        : "Sem atrasos"}
                  </strong>
                </span>
                <span>
                  Seu ritmo
                  <strong>
                    {ritmo.limite === null
                      ? "Sem teto"
                      : `Até ${ritmo.limite} por dia`}
                  </strong>
                </span>
              </div>
              {planoEstudo && previsao.depoisProva > 0 && (
                <p className="rvp-alerta">
                  <strong>
                    {n(previsao.depoisProva)} vencidas ficariam para a prova ou
                    depois dela.
                  </strong>{" "}
                  Prova em {DATA.format(inicioDaChave(planoEstudo.data_prova))}.{" "}
                  {previsao.necessario
                    ? `Para trabalhar a fila atual antes dela, seriam cerca de ${previsao.necessario} por dia de estudo.`
                    : ""}{" "}
                  <a href={href("/cronograma")}>Conferir cronograma</a>
                </p>
              )}
              <p className="rvp-nota">
                Estimativa com as pendências atuais, sem novos erros ou
                retornos. O modo leve reduz a carga diária; não antecipa
                artificialmente a conclusão.
              </p>
              <a
                className="rvp-secundario rvp-pequeno"
                href="#rvp-ritmo"
                onClick={(e) => {
                  e.preventDefault();
                  definirRascunho(ritmo);
                  document
                    .getElementById("rvp-ritmo")
                    ?.scrollIntoView({ block: "start" });
                }}
              >
                Simular outro ritmo
              </a>
            </section>
          </div>
          <section className="rvp-folha">
            <header className="rvp-secao-cabeca">
              <div>
                <p className="rvp-selo">PRIORIDADES DO SEU RECORTE</p>
                <h2>Onde uma revisão pode ajudar mais?</h2>
              </div>
              <button
                className="rvp-secundario rvp-pequeno"
                onClick={() =>
                  document
                    .getElementById("rvp-fila")
                    ?.scrollIntoView({ block: "start" })
                }
              >
                Explorar toda a fila <Icone nome="direita" tamanho={16} />
              </button>
            </header>
            <div className="rvp-prioridades">
              {(
                [
                  [
                    "certeza",
                    "Erros com certeza",
                    "Vale conferir o raciocínio que parecia seguro.",
                  ],
                  [
                    "reincidentes",
                    "Erros que voltaram",
                    "Releia a explicação antes de tentar outra vez.",
                  ],
                  [
                    "incertas",
                    "Dúvidas e chutes",
                    "Transforme uma resposta incerta em raciocínio.",
                  ],
                ] as const
              ).map(([estado, titulo, desc]) => {
                const ids = fila.filter((id) =>
                  atendeFiltro(
                    catalogo.itens.get(id)!,
                    registros[id],
                    indice,
                    { ...FILTRO_REVISAO, estado },
                    agora,
                  ),
                );
                return (
                  <div key={estado}>
                    <span className="rvp-prioridade-num">{n(ids.length)}</span>
                    <h3>{titulo}</h3>
                    <p>{desc}</p>
                    <button
                      className="rvp-secundario rvp-pequeno"
                      disabled={!ids.length}
                      onClick={() => verSessao(ids.slice(0, curta), titulo)}
                    >
                      Revisar ~5 min <Icone nome="direita" tamanho={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
          {recomendados.length > 0 && (
            <section className="rvp-folha">
              <header>
                <p className="rvp-selo">ENTENDER ANTES DE REPETIR</p>
                <h2>Leituras ligadas aos seus erros</h2>
              </header>
              <ul className="rvp-leituras">
                {recomendados.map(({ resumo, questoes, assuntos }) => (
                  <li key={resumo.id}>
                    <a href={href("/resumos/" + resumo.id)}>
                      {resumo.titulo}
                      <Icone nome="direita" tamanho={16} />
                    </a>
                    <small>
                      {questoes
                        ? `${questoes} questões relacionadas`
                        : assuntos.slice(0, 2).join(" · ")}{" "}
                      · ~{resumo.minutos} min
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>{" "}
        <section className="rvp-secao" id="rvp-calendario">
          <header className="rvp-secao-cabeca">
            <div>
              <p className="rvp-selo">
                <Icone nome="calendario" tamanho={14} /> CALENDÁRIO
              </p>
              <h2>O que vem pela frente?</h2>
              <p>
                Veja o planejado e o que já foi feito. Cada dia abre uma revisão
                possível.
              </p>
            </div>
          </header>
          <CalendarioRevisao
            indice={indice}
            registros={registros}
            plano={plano}
            folgas={ritmo.folgas}
            hoje={hoje}
            diaInicial={diaSelecionado}
            aoRevisar={(ids) => verSessao(ids, "Revisão do calendário")}
          />
        </section>
        <section className="rvp-secao" id="rvp-aprendizado">
          <AnaliseRevisao
            registros={registros}
            indice={indice}
            plano={plano}
            teto={ritmo.limite}
            observacoes={observacoes}
            aoDia={mostrarCalendario}
          />
        </section>
        <section id="rvp-fila" className="rvp-folha rvp-secao">
          <header className="rvp-secao-cabeca">
            <div>
              <p className="rvp-selo">EXPLORAR A FILA</p>
              <h2>Cada pendência, com contexto</h2>
              <p>
                {n(fila.length)} questões disponíveis. Veja o vencimento, o
                planejamento e por que revisar.
              </p>
            </div>
            <label>
              Ordenar por
              <select
                value={ordem}
                onChange={(e) => definirOrdem(e.target.value as OrdemRevisao)}
              >
                <option value="recomendada">Prioridade recomendada</option>
                <option value="atraso">Maior atraso</option>
                <option value="reincidencia">Erros reincidentes</option>
                <option value="incidencia">Frequência nas provas</option>
              </select>
            </label>
          </header>
          <p className="rvp-nota">
            Recomendada: erros, reincidência e erros com certeza; depois
            frequência do assunto nas provas do acervo e atraso. A ordenação não
            altera o teto ou as reservas.
          </p>
          {!fila.length ? (
            <div className="rvp-vazio">
              <h3>Nenhuma pendência neste recorte.</h3>
              <p>
                {filtrado
                  ? "Experimente limpar os filtros."
                  : "Volte quando chegar o próximo agendamento ou avance em questões novas."}
              </p>
              {filtrado && (
                <button
                  className="rvp-secundario rvp-pequeno"
                  onClick={() => definirFiltro({ ...FILTRO_REVISAO })}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <ul className="rvp-fila">
              {fila.slice((pagina - 1) * 20, pagina * 20).map((id) => {
                const r = registros[id],
                  q = catalogo.itens.get(id)!,
                  tema = indice.temas[q.t],
                  v = vencimentoDe(r),
                  h = historicoDe(r),
                  data = datas.get(id);
                return (
                  <li key={id}>
                    <div className="rvp-fila__linha">
                      <div>
                        <small>
                          {tema.nome} ·{" "}
                          {q.p === null
                            ? "OrtoQuestões Simulados"
                            : indice.provas[q.p]}{" "}
                          {q.a ?? ""}
                        </small>
                        <h3>
                          {focos.get(id)?.nome ?? "Assunto não classificado"}
                        </h3>
                        <p>{motivoRevisao(id, r, indice, agora)}</p>
                        <span className="rvp-fila__datas">
                          Vencimento: {v === null ? "sem data" : DATA.format(v)}{" "}
                          · Planejada:{" "}
                          {data
                            ? DATA.format(inicioDaChave(data))
                            : "além da janela"}
                        </span>
                      </div>
                      <div className="rvp-fila__acoes">
                        <button
                          className="rvp-secundario rvp-pequeno"
                          aria-expanded={expandida === id}
                          onClick={() =>
                            definirExpandida(expandida === id ? null : id)
                          }
                        >
                          Histórico
                        </button>
                        <button
                          className="rvp-secundario"
                          onClick={() =>
                            verSessao([id], "Uma questão, com calma")
                          }
                        >
                          Revisar
                        </button>
                      </div>
                    </div>
                    {expandida === id && (
                      <div className="rvp-trajetoria">
                        <p>
                          <strong>{id}</strong> · {r.sequencia ?? 0} acertos
                          consecutivos · {r.tentativas ?? 1} tentativas no
                          total.{" "}
                          {h.length < (r.tentativas ?? 1)
                            ? "Exibindo apenas as tentativas ainda guardadas."
                            : ""}
                        </p>
                        <ol>
                          {h.map((e, i) => (
                            <li key={`${e.em}-${i}`}>
                              <time>
                                {new Date(e.em).toLocaleString("pt-BR", {
                                  timeZone: FUSO_DIA,
                                })}
                              </time>
                              <b>
                                {e.correta === null
                                  ? "Sem correção"
                                  : e.correta
                                    ? "Acerto"
                                    : "Erro"}
                              </b>
                              <span>
                                {e.confianca === "chute"
                                  ? "Chute"
                                  : e.confianca === "duvida"
                                    ? "Dúvida"
                                    : "Certeza"}
                              </span>
                            </li>
                          ))}
                        </ol>
                        <a href={href("/questao/" + id)}>
                          Abrir questão e comentário
                        </a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rvp-paginacao">
            <button
              className="rvp-secundario"
              disabled={pagina === 1}
              onClick={() => definirPagina(pagina - 1)}
            >
              Anterior
            </button>
            <span>
              Página {pagina} de {Math.max(1, Math.ceil(fila.length / 20))}
            </span>
            <button
              className="rvp-secundario"
              disabled={pagina * 20 >= fila.length}
              onClick={() => definirPagina(pagina + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
        <section id="rvp-flashcards" className="rvp-secao">
          <header className="rvp-secao-cabeca">
            <div>
              <p className="rvp-selo">
                <Icone nome="raio" tamanho={14} /> FLASHCARDS
              </p>
              <h2>E os flashcards de hoje?</h2>
              <p>
                Uma fila independente para revisar conceitos em outra forma.
              </p>
            </div>
          </header>
          <FlashcardsDeHoje />
        </section>
        <section id="rvp-conquistas" className="rvp-secao">
          <ConquistasRevisao />
          <p className="rvp-nota">
            Seus números: <b>{n(resumo.total)}</b> revisões feitas,{" "}
            <b>{n(resumo.resgatadas)}</b> atrasadas resgatadas; maior sequência
            de <b>{sequencia.maior}</b> dias.
          </p>
        </section>
        <section className="rvp-folha rvp-secao" id="rvp-ritmo">
          <header>
            <p className="rvp-selo">PERSONALIZAR SEM PRESSÃO</p>
            <h2>Seu ritmo, com previsão antes de salvar</h2>
            <p>
              O ajuste vale para a fila geral. Os intervalos de aprendizado são
              preservados.
            </p>
          </header>
          <div className="rvp-ritmo-campos">
            <label>
              Teto de questões por dia
              <select
                value={ritmoRascunho.limite ?? "livre"}
                onChange={(e) =>
                  definirRascunho((r) => ({
                    ...r,
                    limite:
                      e.target.value === "livre"
                        ? null
                        : Number(e.target.value),
                    retomadaEm: undefined,
                  }))
                }
              >
                {[5, 8, 10, 15, 20, 30, 50, 75].map((v) => (
                  <option key={v} value={v}>
                    Até {v} · ~{minutos(v)} min
                  </option>
                ))}
                <option value="livre">Sem teto</option>
              </select>
            </label>
            <fieldset>
              <legend>Dias de folga</legend>
              <div className="rvp-folgas">
                {DIAS.map((d, i) => (
                  <button
                    key={d}
                    aria-pressed={ritmoRascunho.folgas.includes(i)}
                    disabled={
                      !ritmoRascunho.folgas.includes(i) &&
                      ritmoRascunho.folgas.length >= 6
                    }
                    onClick={() =>
                      definirRascunho((r) => ({
                        ...r,
                        folgas: r.folgas.includes(i)
                          ? r.folgas.filter((x) => x !== i)
                          : [...r.folgas, i],
                      }))
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p className="rvp-simulacao" role="status">
            Com esse ritmo:{" "}
            {simulacao.vencidas
              ? simulacao.foraJanela
                ? "parte das pendências ultrapassa a janela de 400 dias"
                : `fila vencida atual distribuída até ${simulacao.fim ? DATA.format(simulacao.fim) : "–"}`
              : "nenhuma revisão vencida"}
            .
            {planoEstudo && simulacao.depoisProva > 0
              ? ` ${n(simulacao.depoisProva)} ficariam para a prova ou depois.`
              : ""}
          </p>
          <div className="rvp-acoes">
            <button
              className="rvp-primario"
              onClick={() =>
                definirRitmo({
                  ...ritmoRascunho,
                  modo:
                    !ritmoRascunho.retomadaEm &&
                    ritmoRascunho.limite !== null &&
                    ritmoRascunho.limite <= curta
                      ? "leve"
                      : "regular",
                })
              }
              disabled={JSON.stringify(ritmoRascunho) === JSON.stringify(ritmo)}
            >
              Aplicar ritmo
            </button>
            <button
              className="rvp-secundario rvp-pequeno"
              onClick={() => {
                const novo = {
                  ...ritmo,
                  modo: "leve" as const,
                  limite: 15,
                  retomadaEm: chaveHoje,
                };
                definirRascunho(novo);
              }}
            >
              Simular retomada gradual
            </button>
          </div>
          {ritmoRascunho.retomadaEm && (
            <p className="rvp-nota">
              Retomada: até 5 questões nos primeiros 3 dias, 10 nos próximos 4 e
              15 depois. Folgas continuam respeitadas.
            </p>
          )}
          <p className="rvp-nota">
            Folgas não quebram a sequência de revisão. Para a sequência, conte
            10 revisões ou conclua a fila do dia. Concluir sua pequena meta
            também conta nesta página; esse registro fica neste aparelho.
          </p>
        </section>
        <section id="rvp-regra" className="rvp-folha rvp-secao">
          <header>
            <p className="rvp-selo">
              <Icone nome="interrogacao" tamanho={14} /> COMO FUNCIONA
            </p>
            <h2>Quando cada questão volta?</h2>
            <p>
              Os intervalos começam na resposta anterior. A confiança escolhe a
              escada; um erro reinicia o ciclo.
            </p>
          </header>
          <div className="rvp-escadas">
            {(
              [
                ["Chute", INTERVALOS.chute],
                ["Dúvida", INTERVALOS.duvida],
                ["Certeza", INTERVALOS.seguro],
              ] as const
            ).map(([rotulo, intervalos]) => (
              <div key={rotulo}>
                <h3>{rotulo}</h3>
                <ol>
                  {intervalos.map((d) => (
                    <li key={d}>
                      <i />
                      <span>
                        {d >= 60 ? Math.round(d / 30) + " meses" : d + " dias"}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <p className="rvp-alerta">
            <strong>Errou? A questão fica elegível hoje.</strong> O teto e as
            folgas podem reservar sua sessão para outro dia. Acertar logo após
            ler o comentário é reaprendizado; um reencontro posterior ajuda a
            confirmar a retenção.
          </p>
          <p className="rvp-nota">
            Acertar também na revisão do último intervalo encerra o ciclo. Mudar
            a confiança altera a escada do próximo agendamento.
          </p>
          <div className="rvp-acoes">
            <button
              className="rvp-secundario"
              disabled={!incertasIds.length}
              onClick={() =>
                verSessao(incertasIds.slice(0, 20), "Dúvidas e chutes")
              }
            >
              Refazer dúvidas e chutes
            </button>
            <a className="rvp-secundario" href={href("/erros")}>
              Abrir meu caderno de erros
            </a>
          </div>
        </section>
        {previa && (
          <PreviaRevisao
            ids={previa.ids}
            titulo={previa.titulo}
            indice={indice}
            registros={todos}
            minutos={minutos(previa.ids.length)}
            lembrar={lembrar}
            aoLembrar={definirLembrar}
            aoFechar={() => definirPrevia(null)}
            aoComecar={comecar}
            restantes={Math.max(0, pendentes.length - previa.ids.length)}
          />
        )}
      </div>
    </div>
  );
}
