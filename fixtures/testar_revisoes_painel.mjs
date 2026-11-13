import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const pasta = await mkdtemp(join(tmpdir(), "oq-revisoes-"));
try {
  const arq = join(pasta, "modelo.mjs");
  await build({
    stdin: {
      contents:
        "export * from './src/dados/revisoesPainel'; export * from './src/estado/revisao'; export * from './src/estado/planoRevisao';",
      resolveDir: process.cwd(),
    },
    outfile: arq,
    bundle: true,
    platform: "node",
    format: "esm",
  });
  const m = await import(pathToFileURL(arq)),
    D = 86400000,
    agora = Date.parse("2026-11-13T12:00:00-03:00"),
    hoje = m.inicioDia(agora);
  const item = (id, t = 0) => ({
    id,
    t,
    s: [0],
    p: 0,
    a: 2024,
    d: null,
    an: 0,
    c: 1,
    img: 0,
  });
  const indice = {
    versao: 1,
    total: 4,
    geradoEm: null,
    questoes: [
      item("a"),
      item("b", 1),
      { ...item("anulada"), an: 1 },
      { ...item("copia"), dup: "a" },
    ],
    temas: [
      { slug: "mao", nome: "Mão" },
      { slug: "coluna", nome: "Coluna" },
    ],
    subtemas: ["Exame físico"],
    provas: ["TEOT"],
    anos: [2024],
  };
  const errado = m.proximoRegistro(undefined, false, agora - 40 * D, "seguro");
  const cat = m.catalogoRevisao(indice, {
    a: errado,
    b: errado,
    anulada: errado,
    copia: errado,
    removida: errado,
  });
  assert.deepEqual(Object.keys(cat.registros), ["a", "b"]);
  assert.deepEqual(cat.indisponiveis, ["anulada", "copia", "removida"]);
  const regs = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => ["q" + i, { ...errado }]),
  );
  const leve = { limite: 5, folgas: [], modo: "leve" };
  const distribuida = m.distribuirRevisoes(regs, leve, 20, agora);
  assert.equal(distribuida.get(hoje).length, 5);
  assert.equal(
    [...distribuida.values()].flat().length,
    30,
    "modo leve preserva todas as pendências",
  );
  const retomada = m.distribuirRevisoes(
    regs,
    { limite: 15, folgas: [], retomadaEm: "2026-11-13" },
    20,
    agora,
  );
  assert.equal(retomada.get(hoje).length, 5);
  assert.equal(retomada.get(hoje + 3 * D).length, 10);
  const nova = m.proximoRegistro(errado, false, agora, "seguro");
  const revisadas = { a: nova, b: errado };
  assert.equal(m.revisoesFeitasHoje(revisadas, agora), 1);
  assert.deepEqual(
    m
      .distribuirRevisoes(revisadas, { limite: 2, folgas: [] }, 5, agora)
      .get(hoje)
      .map((x) => x.id),
    ["b"],
    "erro já revisado não repete indefinidamente na meta",
  );
  assert.ok(
    m
      .distribuirRevisoes(revisadas, { limite: 2, folgas: [] }, 5, agora)
      .get(hoje + D)
      .some((x) => x.id === "a"),
  );
  assert.equal(
    m.revisarHoje(nova, agora),
    true,
    "erro continua elegível para reaprendizado opcional",
  );
  const reserva = m
    .distribuirRevisoes(cat.registros, { limite: 1, folgas: [] }, 5, agora)
    .get(hoje);
  const filtro = { ...m.FILTRO_REVISAO, areas: ["coluna"] };
  assert.equal(
    m.atendeFiltro(indice.questoes[1], errado, indice, filtro, agora),
    true,
  );
  assert.equal(
    m.atendeFiltro(indice.questoes[0], errado, indice, filtro, agora),
    false,
  );
  assert.equal(
    reserva.length,
    1,
    "filtro da página não recria capacidade global",
  );
  assert.equal(
    m.previsaoResgate(regs, leve, "2026-11-15", agora).depoisProva,
    20,
    "dia da prova não é contado como estudo",
  );
  assert.equal(
    m.previsaoResgate(regs, leve, "2026-11-15", agora).necessario,
    15,
  );
  const h = [
    { em: agora - 20 * D, correta: false, confianca: "seguro" },
    { em: agora - 10 * D, correta: true, confianca: "duvida" },
    { em: agora - D, correta: false, confianca: "seguro" },
  ];
  const recorrente = { ...errado, q: agora - D, historico: h, tentativas: 3 };
  assert.equal(m.reincidente(recorrente), true);
  const es = m.eventosRevisao({ a: recorrente }, agora);
  assert.equal(es.length, 2, "primeira resposta não conta como revisão");
  assert.deepEqual(
    es.map((e) => e.intervalo),
    [10, 9],
  );
  const cortado = { ...recorrente, tentativas: 9, historico: h.slice(1) };
  const esCortados = m.eventosRevisao({ a: cortado }, agora);
  assert.equal(esCortados.length, 2);
  assert.equal(
    esCortados[0].intervalo,
    null,
    "não inventa intervalo da tentativa truncada",
  );
  const serie = m.serieRevisoes(
    [
      { ...es[0], em: hoje - 2 * 3600000 },
      { ...es[1], em: hoje + 3600000 },
    ],
    2,
    agora,
  );
  assert.deepEqual(
    serie.map((d) => d.feitas),
    [1, 1],
    "agrupa por dia de Brasília",
  );
  assert.equal(m.faixasRetencao(es).find((f) => f.nome === "7–29 dias").n, 2);
  assert.equal(
    m.segundosPorRevisao([
      { descricao: "Revisar hoje", respondidas: 10, segundos: 600 },
    ]),
    60,
  );
  assert.equal(
    m.segundosPorRevisao([
      { descricao: "Todas", respondidas: 10, segundos: 600 },
    ]),
    40,
  );
  let ciclo;
  for (let i = 0; i < 5; i++)
    ciclo = m.proximoRegistro(ciclo, true, agora - (4 - i) * D, "chute");
  const mov = m.movimentosDoCiclo({ a: ciclo, b: cortado }, 30, agora);
  assert.equal(
    mov.serie.reduce((s, d) => s + d.entradas, 0),
    1,
  );
  assert.equal(
    mov.serie.reduce((s, d) => s + d.concluidas, 0),
    1,
  );
  assert.equal(mov.omitidas, 1, "não reconstrói fluxo com tentativas perdidas");
  console.log(
    "Central de revisões: catálogo, modo leve, retomada, teto, filtros, datas, previsão e retenção passaram.",
  );
} finally {
  await rm(pasta, { recursive: true, force: true });
}
