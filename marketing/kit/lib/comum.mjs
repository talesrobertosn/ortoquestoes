// Funções comuns dos scripts do kit (renderizar, conferir, questao, proximo, registrar).
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

export const KIT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const RAIZ = resolve(KIT, '..', '..')
export const INSTAGRAM = join(RAIZ, 'marketing', 'instagram')
export const ler = (p) => JSON.parse(readFileSync(p, 'utf8'))

// Estilos com modelo parametrizado no kit. "historico" é o nome usado em estilos/historico.json.
export const ESTILOS = {
  snellen: { nome: 'Tabela de Snellen', formato: 'feed', imagens: 5, guia: 'marketing/instagram/estilos/SNELLEN-E-CUPOM.md' },
  'cofre-duas-chaves': { nome: 'Cofre de duas chaves', formato: 'feed', imagens: 6, guia: 'marketing/instagram/estilos/COFRE-E-MECANICA-FINA.md' },
  'mecanica-fina': { nome: 'Mecânica fina', formato: 'stories', imagens: 6, guia: 'marketing/instagram/estilos/COFRE-E-MECANICA-FINA.md' },
  'cupom-fiscal': { nome: 'Cupom fiscal', formato: 'stories', imagens: 3, guia: 'marketing/instagram/estilos/SNELLEN-E-CUPOM.md' },
  var: { nome: 'VAR da questão', formato: 'feed e stories', imagens: 8, guia: 'marketing/instagram/estilos/VAR-DA-QUESTAO.md' },
  'treine-gratis': { nome: 'Treine grátis', formato: 'story de propaganda', imagens: 1, guia: 'marketing/instagram/estilos/TREINE-GRATIS.md' },
}

// Aceita "fila/post-07.json", "post-07", "7" ou um caminho qualquer.
export function acharPost(arg) {
  if (!arg) return null
  const tentativas = [resolve(arg), join(KIT, arg), join(KIT, 'fila', arg), join(KIT, 'fila', arg + '.json')]
  if (/^\d+$/.test(arg)) tentativas.push(join(KIT, 'fila', `post-${arg.padStart(2, '0')}.json`))
  return tentativas.find((p) => existsSync(p) && p.endsWith('.json')) ?? null
}

export function filaInteira() {
  const pasta = join(KIT, 'fila')
  return readdirSync(pasta).filter((f) => /^post-\d+\.json$/.test(f)).sort()
    .map((f) => ({ arquivo: join(pasta, f), ...ler(join(pasta, f)) }))
}

let cacheAcervo = null
export function acervo() {
  if (cacheAcervo) return cacheAcervo
  const temas = join(RAIZ, 'public', 'acervo', 'temas')
  const mapa = new Map()
  for (const f of readdirSync(temas).filter((x) => x.endsWith('.json'))) {
    const dados = ler(join(temas, f))
    const com = existsSync(join(temas, '..', 'comentarios', f)) ? ler(join(temas, '..', 'comentarios', f)) : {}
    for (const q of dados.questoes) mapa.set(q.id, { q, c: com[q.id] ?? null, area: dados.tema, slug: dados.slug })
  }
  cacheAcervo = mapa
  return mapa
}

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

// Ids já publicados: publicadas.md, pastas de posts e o mesmo enunciado com outro id.
export function publicadas() {
  const ids = new Set()
  const re = /\b(?:coluna|conceitos-basicos|joelho|mao|ombro-cotovelo|osteometabolicas|pe-tornozelo|pediatria|quadril|trauma|tumores)-\d{4}\b/g
  const md = join(INSTAGRAM, 'publicadas.md')
  if (existsSync(md)) for (const m of readFileSync(md, 'utf8').matchAll(re)) ids.add(m[0])
  const varrer = (pasta) => {
    for (const nome of readdirSync(pasta, { withFileTypes: true })) {
      const p = join(pasta, nome.name)
      if (nome.isDirectory()) { if (nome.name !== 'saida' && nome.name !== 'prints') varrer(p) } else if (/\.(html|md)$/.test(nome.name)) for (const m of readFileSync(p, 'utf8').matchAll(re)) ids.add(m[0])
    }
  }
  varrer(join(INSTAGRAM, 'posts'))
  const enunciados = new Map()
  for (const [id, { q }] of acervo()) {
    const k = norm(q.enunciado).slice(0, 90)
    if (!enunciados.has(k)) enunciados.set(k, [])
    enunciados.get(k).push(id)
  }
  const gemeas = (id) => { const a = acervo().get(id); return a ? enunciados.get(norm(a.q.enunciado).slice(0, 90)) ?? [id] : [id] }
  return { ids, gemeas, jaSaiu: (id) => gemeas(id).filter((g) => ids.has(g)) }
}

export function historico() {
  const p = join(INSTAGRAM, 'estilos', 'historico.json')
  return existsSync(p) ? ler(p) : []
}

// Bloco "questao" do JSON da fila, copiado do acervo sem mudança.
export function blocoQuestao(id) {
  const a = acervo().get(id)
  if (!a) return null
  const { q, c } = a
  const conceito = c?.conceito ?? ''
  const naProva = conceito.split('\n').find((l) => /na prova/i.test(l)) ?? ''
  const primeiro = conceito.split(/\n\s*\n/)[0] ?? ''
  return {
    id: q.id,
    area: a.area,
    subtema: (q.subtemas ?? [])[0] ?? null,
    prova: q.prova ?? null,
    ano: q.ano ?? null,
    simulado: !!q.simulado,
    enunciado: q.enunciado,
    alternativas: q.alternativas.map(({ letra, texto }) => ({ letra, texto })),
    gabarito: q.gabarito,
    imagens: (q.imagens ?? []).map((i) => ({ arquivo: 'public/imagens/' + (i.arquivo ?? i), legenda: i.legenda ?? null })),
    comentario: c ? {
      correta: c.correta ?? null,
      incorretas: c.incorretas ?? {},
      conceito_trechos: [primeiro, naProva].filter((x, i, arr) => x && arr.indexOf(x) === i),
      conferido: c.conferido ?? null,
      alerta: c.alerta ?? null,
    } : null,
  }
}

export const dataBR = (iso) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}` }
export const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5)
