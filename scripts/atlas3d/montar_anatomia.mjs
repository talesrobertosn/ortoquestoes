// Banco anatômico do Atlas 3D: junta os lotes de scripts/atlas3d/anatomia/*.json (redação própria,
// conferida página a página no livro de referência) e gera public/atlas3d/v1/anatomia.json.
//
// Validação (sai com erro se algo falhar; rodar antes de publicar):
//   - chave única, tipo e região conhecidos, status verificado | pendente | conflito
//   - todo id existe no catálogo 3D (com ou sem _l/_r) e é da camada certa (músculo em muscle, nervo em nerve…)
//   - nenhum id de malha em dois registros (duplicação)
//   - nervos citados existem e são do tipo nervo; relações "ver" apontam para chaves existentes, sem apontar para si
//   - marcos de origem/inserção existem em pontos.json (osso:nome), no osso certo
//   - todo registro tem fonte com página; fonte conhecida. As páginas são as posições no PDF local do livro
//     (o mesmo número que pdftoppm -f usa), para auditoria interna; não são a paginação impressa.
// Derivados: nervo → músculos que inerva; osso → músculos que nele se originam ou inserem.
// Relatório: docs/atlas3d/COBERTURA-ANATOMIA.md
//
//   node scripts/atlas3d/montar_anatomia.mjs            monta e valida
//   node scripts/atlas3d/montar_anatomia.mjs --checar   só valida (não grava)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PASTA = join(RAIZ, 'scripts/atlas3d/anatomia')
const SO_CHECAR = process.argv.includes('--checar')

const FONTES = {
  'netter-ao2': 'Thompson JC. Netter Atlas de Anatomia Ortopédica. 2ª ed. Rio de Janeiro: Elsevier; 2012.',
}
const TIPOS = { musculo: 'muscle', nervo: 'nerve', ligamento: 'connective', osso: 'bone', arteria: 'vessel', veia: 'vessel', fascia: 'fascia' }
const REGIOES = ['coluna', 'ombro', 'braco', 'cotovelo', 'antebraco', 'punho-mao', 'pelve-quadril', 'coxa', 'joelho', 'perna', 'tornozelo-pe']
const STATUS = ['verificado', 'pendente', 'conflito']

const catalogo = JSON.parse(readFileSync(join(RAIZ, 'public/atlas3d/v1/estruturas.json'), 'utf8'))
const pontos = JSON.parse(readFileSync(join(RAIZ, 'public/atlas3d/v1/pontos.json'), 'utf8'))
const base = (id) => id.replace(/_[lr]$/, '')
const camadaDaBase = new Map()
for (const e of catalogo.estruturas) camadaDaBase.set(base(e.id), e.k)
const marcos = new Set(pontos.map((p) => `${base(p.o)}:${p.en}`))

// Ossos inteiros (campo "o" de origem/inserção), para onde o modelo não tem marco pontual: aceita
// atalhos "C7-T12" (vértebras; C1 e C2 são atlas e áxis) e "costelas:3-5".
const VERTEBRAS = ['atlas_c1', 'axis_c2', ...[3, 4, 5, 6, 7].map((n) => `vertebra_c${n}`), ...Array.from({ length: 12 }, (_, i) => `vertebra_t${i + 1}`), ...[1, 2, 3, 4, 5].map((n) => `vertebra_l${n}`)]
const ROTULO_VERT = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', ...Array.from({ length: 12 }, (_, i) => `T${i + 1}`), 'L1', 'L2', 'L3', 'L4', 'L5']
const COSTELAS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'].map((n) => `${n}_rib`)
function expandir(lista) {
  return (lista ?? []).flatMap((x) => {
    const v = x.match(/^([CTL]\d+)-([CTL]\d+)$/)
    if (v) return VERTEBRAS.slice(ROTULO_VERT.indexOf(v[1]), ROTULO_VERT.indexOf(v[2]) + 1)
    const c = x.match(/^costelas:(\d+)-(\d+)$/)
    if (c) return COSTELAS.slice(+c[1] - 1, +c[2])
    return [x]
  })
}

const lotes = readdirSync(PASTA).filter((f) => f.endsWith('.json')).sort()
const registros = []
const erros = []
const avisos = []
for (const arq of lotes) {
  const lote = JSON.parse(readFileSync(join(PASTA, arq), 'utf8'))
  for (const r of lote.registros) registros.push({ ...r, _lote: arq })
}

// Campos aceitos por tipo: um nervo com "inserção" ou um ligamento com "nervos" é erro de lote.
const COMUNS = ['chave', 'tipo', 'nome', 'en', 'ids', 'regiao', 'grupo', 'relacoes', 'clinica', 'ver', 'fonte', 'status', 'notas', '_lote']
const CAMPOS = {
  musculo: [...COMUNS, 'origem', 'insercao', 'nervos', 'acao'],
  nervo: [...COMUNS, 'raizes', 'trajeto', 'sensitivo'],
  ligamento: [...COMUNS, 'articulacao', 'origem', 'insercao', 'funcao', 'restringe'],
}
const porChave = new Map()
const donoDoId = new Map()
for (const r of registros) {
  const onde = `${r._lote} › ${r.chave}`
  if (!r.chave || !/^[a-z0-9-]+$/.test(r.chave)) erros.push(`${onde}: chave inválida`)
  if (porChave.has(r.chave)) erros.push(`${onde}: chave repetida (também em ${porChave.get(r.chave)._lote})`)
  porChave.set(r.chave, r)
  if (!TIPOS[r.tipo]) erros.push(`${onde}: tipo desconhecido "${r.tipo}"`)
  if (!REGIOES.includes(r.regiao)) erros.push(`${onde}: região desconhecida "${r.regiao}"`)
  if (!STATUS.includes(r.status)) erros.push(`${onde}: status "${r.status}"`)
  if (r.status === 'conflito' && !r.notas) erros.push(`${onde}: conflito sem nota explicando`)
  if (!r.nome) erros.push(`${onde}: sem nome`)
  else if (!/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(r.nome) || /(muscle|nerve|ligament)/i.test(r.nome)) erros.push(`${onde}: nome fora do padrão (português, inicial maiúscula)`)
  for (const k of Object.keys(r)) if (CAMPOS[r.tipo] && !CAMPOS[r.tipo].includes(k)) erros.push(`${onde}: campo "${k}" não cabe em ${r.tipo}`)
  for (const k of ['origem', 'insercao']) if (r[k] && typeof r[k].t !== 'string') erros.push(`${onde}: ${k} sem texto`)
  if (r.ver && new Set(r.ver).size !== r.ver.length) erros.push(`${onde}: relação repetida em "ver"`)
  if (!r.fonte?.length) erros.push(`${onde}: sem fonte`)
  for (const f of r.fonte ?? []) {
    if (!FONTES[f.l]) erros.push(`${onde}: fonte desconhecida "${f.l}"`)
    if (!f.p?.length) erros.push(`${onde}: fonte sem página`)
  }
  if (!r.ids?.length) avisos.push(`${onde}: sem malha no modelo 3D (só texto)`)
  for (const id of r.ids ?? []) {
    const k = camadaDaBase.get(id)
    if (!k) erros.push(`${onde}: id inexistente no catálogo "${id}"`)
    else if (k !== TIPOS[r.tipo]) erros.push(`${onde}: "${id}" é da camada ${k}, não ${TIPOS[r.tipo]}`)
    if (donoDoId.has(id)) erros.push(`${onde}: "${id}" já pertence a ${donoDoId.get(id)}`)
    donoDoId.set(id, r.chave)
  }
  for (const campo of ['origem', 'insercao']) for (const m of r[campo]?.m ?? []) if (!marcos.has(m)) erros.push(`${onde}: marco inexistente em pontos.json "${m}"`)
  for (const campo of ['origem', 'insercao']) if (r[campo]?.o) {
    r[campo] = { ...r[campo], o: expandir(r[campo].o) }
    for (const o of r[campo].o) if (camadaDaBase.get(o) !== 'bone') erros.push(`${onde}: osso inexistente "${o}" em ${campo}`)
  }
  if (r.tipo === 'musculo' && !r.nervos?.length) avisos.push(`${onde}: músculo sem nervo`)
}
for (const r of registros) {
  const onde = `${r._lote} › ${r.chave}`
  for (const n of r.nervos ?? []) {
    const alvo = porChave.get(n)
    if (!alvo) erros.push(`${onde}: nervo "${n}" sem registro`)
    else if (alvo.tipo !== 'nervo') erros.push(`${onde}: "${n}" não é nervo`)
  }
  for (const v of r.ver ?? []) {
    if (v === r.chave) erros.push(`${onde}: relação aponta para si mesmo`)
    else if (!porChave.has(v)) erros.push(`${onde}: relação para chave inexistente "${v}"`)
  }
}

// Derivados
const inerva = new Map()
const noOsso = new Map()
for (const r of registros) {
  for (const n of r.nervos ?? []) inerva.set(n, [...(inerva.get(n) ?? []), r.chave])
  // osso → [{c: chave, t: 'o' (origem) | 'i' (inserção), m?: marcos naquele osso}]; os marcos deixam a ficha
  // do osso longo filtrar pela faixa clicada (proximal, diáfise, distal)
  for (const campo of ['origem', 'insercao']) for (const m of [...(r[campo]?.m ?? []), ...(r[campo]?.o ?? [])]) {
    const [osso, marco] = m.split(':')
    const lista = noOsso.get(osso) ?? []
    let item = lista.find((x) => x.c === r.chave && x.t === campo[0])
    if (!item) { item = { c: r.chave, t: campo[0] }; lista.push(item) }
    if (marco) item.m = [...(item.m ?? []), marco]
    noOsso.set(osso, lista)
  }
}

const limpo = registros.map(({ _lote, ...r }) => ({ ...r, ...(r.tipo === 'nervo' && inerva.get(r.chave) ? { inerva: inerva.get(r.chave) } : {}) }))
const saida = {
  versao: 1,
  fontes: FONTES,
  registros: limpo,
  porId: Object.fromEntries(donoDoId),
  noOsso: Object.fromEntries(noOsso),
}

// Relatório de cobertura
const contar = (f) => registros.filter(f).length
const linhas = []
linhas.push('# Cobertura do banco anatômico do Atlas 3D', '', `Gerado por \`scripts/atlas3d/montar_anatomia.mjs\` a partir de ${lotes.length} lote(s). Não editar à mão.`, '')
linhas.push('## Totais', '', '| Tipo | Registros | Verificados | Pendentes | Conflitos | Com malha 3D |', '|---|---|---|---|---|---|')
for (const t of Object.keys(TIPOS)) {
  const n = contar((r) => r.tipo === t)
  if (!n) continue
  linhas.push(`| ${t} | ${n} | ${contar((r) => r.tipo === t && r.status === 'verificado')} | ${contar((r) => r.tipo === t && r.status === 'pendente')} | ${contar((r) => r.tipo === t && r.status === 'conflito')} | ${contar((r) => r.tipo === t && r.ids?.length)} |`)
}
linhas.push('', '## Por região', '', '| Região | Músculos | Nervos | Ligamentos | Outros |', '|---|---|---|---|---|')
for (const g of REGIOES) {
  const d = registros.filter((r) => r.regiao === g)
  if (!d.length) continue
  linhas.push(`| ${g} | ${d.filter((r) => r.tipo === 'musculo').length} | ${d.filter((r) => r.tipo === 'nervo').length} | ${d.filter((r) => r.tipo === 'ligamento').length} | ${d.filter((r) => !['musculo', 'nervo', 'ligamento'].includes(r.tipo)).length} |`)
}
const musculos = registros.filter((r) => r.tipo === 'musculo')
const campos = [['origem', (r) => r.origem?.t], ['inserção', (r) => r.insercao?.t], ['inervação', (r) => r.nervos?.length], ['ação', (r) => r.acao], ['importância ortopédica', (r) => r.clinica], ['relações', (r) => r.relacoes?.length], ['marco 3D da origem', (r) => r.origem?.m?.length], ['marco 3D da inserção', (r) => r.insercao?.m?.length], ['origem marcada no modelo (marco ou osso)', (r) => r.origem?.m?.length || r.origem?.o?.length], ['inserção marcada no modelo (marco ou osso)', (r) => r.insercao?.m?.length || r.insercao?.o?.length]]
linhas.push('', '## Campos preenchidos (músculos)', '', '| Campo | Músculos |', '|---|---|')
for (const [nome, f] of campos) linhas.push(`| ${nome} | ${musculos.filter(f).length} de ${musculos.length} |`)
const semRegistro = [...new Set(catalogo.estruturas.filter((e) => e.k === 'muscle').map((e) => base(e.id)))].filter((b) => !donoDoId.has(b))
linhas.push('', '## Pendentes e conflitos', '')
for (const r of registros.filter((r) => r.status !== 'verificado')) linhas.push(`- **${r.nome}** (${r.status}): ${r.notas ?? 'sem nota'}`)
linhas.push('', `## Malhas de músculo ainda sem registro (${semRegistro.length})`, '', 'Músculos da cabeça, face, laringe e faringe ficam fora do foco ortopédico do livro de referência.', '', semRegistro.map((b) => `\`${b}\``).join(', '), '')
if (avisos.length) linhas.push('## Avisos', '', ...avisos.map((a) => `- ${a}`), '')

if (erros.length) {
  console.error(`${erros.length} erro(s) no banco anatômico:\n  ` + erros.join('\n  '))
  process.exit(1)
}
const json = JSON.stringify(saida)
if (SO_CHECAR) {
  // na checagem (npm test), o arquivo publicado precisa estar em dia com os lotes
  let atual = ''
  try { atual = readFileSync(join(RAIZ, 'public/atlas3d/v1/anatomia.json'), 'utf8') } catch { /* sem arquivo */ }
  if (atual !== json) { console.error('public/atlas3d/v1/anatomia.json está desatualizado: rode node scripts/atlas3d/montar_anatomia.mjs'); process.exit(1) }
}
if (!SO_CHECAR) {
  writeFileSync(join(RAIZ, 'public/atlas3d/v1/anatomia.json'), json)
  writeFileSync(join(RAIZ, 'docs/atlas3d/COBERTURA-ANATOMIA.md'), linhas.join('\n'))
}
console.log(`banco anatômico ok: ${registros.length} registros (${musculos.length} músculos), ${donoDoId.size} malhas ligadas, ${avisos.length} aviso(s)${SO_CHECAR ? ' (só checagem)' : ''}`)
