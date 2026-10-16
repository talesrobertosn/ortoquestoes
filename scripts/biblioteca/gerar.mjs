// Gera a Biblioteca (resumos de capítulos) a partir de conteudo/biblioteca/*.md.
// Uso: node scripts/biblioteca/gerar.mjs        (grava public/biblioteca/)
//      node scripts/biblioteca/gerar.mjs --conferir   (só valida; sai com erro se algo estiver errado)
//
// Formato de autoria: ver docs/biblioteca/README.md. Cada bloco de texto ganha um id estável
// (hash do texto normalizado + seção). As marcações das pessoas se ancoram nesse id e no trecho
// exato; se um parágrafo for reescrito, o leitor reencontra o trecho pelo texto (src/biblioteca/ancoras.ts).
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const RAIZ = new URL('../../', import.meta.url).pathname
const ORIGEM = join(RAIZ, 'conteudo/biblioteca')
const DESTINO = join(RAIZ, 'public/biblioteca')
const conferir = process.argv.includes('--conferir')
const RADARES = new Set(['confirmado', 'fundamento', 'clinico', 'oportunidade'])
/** Regra do Tales (16/10/2026, revista no mesmo dia): todos os resumos ficam abertos (também para o Google);
 * resolver as questões citadas é do assinante. O limite antigo de 5 grátis deixou de valer. */
const MAXIMO_GRATIS = Infinity

const indice = JSON.parse(await readFile(join(RAIZ, 'public/acervo/indice.json'), 'utf8'))
const porId = new Map(indice.questoes.map((q) => [q.id, q]))
const erros = []
const avisos = []

const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
const hash = (t) => createHash('sha1').update(t).digest('hex').slice(0, 8)
const semMarcas = (t) => t.replace(/\*\*/g, '')

function conferirQuestoes(lista, real, onde) {
  for (const id of lista) {
    const q = porId.get(id)
    if (!q) { erros.push(`${onde}: questão ${id} não existe no acervo`); continue }
    if (q.dup) erros.push(`${onde}: ${id} é duplicata de ${q.dup}; cite a original`)
    // "Já caiu" só com questão de prova real (com prova). Simulados do site vão em treino=.
    if (real && (q.sim || q.p === null || q.p === undefined)) erros.push(`${onde}: ${id} não é de prova real; use treino=`)
  }
}

function analisar(texto, arquivo) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) throw new Error(`${arquivo}: falta o cabeçalho ---`)
  const meta = {}
  for (const linha of m[1].split('\n')) { const i = linha.indexOf(':'); if (i > 0) meta[linha.slice(0, i).trim()] = linha.slice(i + 1).trim() }
  for (const campo of ['id', 'versao', 'titulo', 'especialidade', 'livro', 'edicao', 'capitulo', 'autores', 'fonte']) if (!meta[campo]) erros.push(`${arquivo}: cabeçalho sem ${campo}`)
  if (meta.acesso && !['gratis', 'assinante'].includes(meta.acesso)) erros.push(`${arquivo}: acesso deve ser gratis ou assinante`)
  if (!indice.temas.some((t) => t.slug === meta.especialidade)) erros.push(`${arquivo}: especialidade ${meta.especialidade} não é um tema do acervo`)
  const linhas = texto.slice(m[0].length).split('\n')
  const secoes = []
  let secao = null, paragrafo = [], usados = new Set()
  const idBloco = (base) => { let id = `${secao?.id ?? 'x'}-${hash(base)}`; while (usados.has(id)) id += 'x'; usados.add(id); return id }
  const fecharParagrafo = () => {
    if (!paragrafo.length) return
    const t = paragrafo.join(' ').trim(); paragrafo = []
    secao.blocos.push({ id: idBloco(t), tipo: 'p', t })
  }
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    const titulo = l.match(/^# (.+?)(?:\s*\{radar=(\w+)\})?\s*$/)
    if (titulo) {
      fecharParagrafo()
      const radar = titulo[2] ?? 'fundamento'
      if (!RADARES.has(radar)) erros.push(`${arquivo}: radar inválido ${radar}`)
      let id = slug(titulo[1]); while (secoes.some((s) => s.id === id)) id += '-2'
      secao = { id, titulo: titulo[1], radar, blocos: [] }
      secoes.push(secao)
      continue
    }
    if (!secao) { if (l.trim()) erros.push(`${arquivo}: texto antes da primeira seção (# título)`); continue }
    if (/^## /.test(l)) { fecharParagrafo(); const t = l.slice(3).trim(); secao.blocos.push({ id: idBloco('h3' + t), tipo: 'h3', t }); continue }
    if (/^- /.test(l)) { fecharParagrafo(); const t = l.slice(2).trim(); secao.blocos.push({ id: idBloco(t), tipo: 'li', t }); continue }
    if (/^> /.test(l)) { fecharParagrafo(); const t = l.slice(2).trim().replace(/^Na prova:\s*/i, ''); secao.blocos.push({ id: idBloco('prova' + t), tipo: 'prova', t }); continue }
    const diretiva = l.match(/^!(questoes|figura|tabela)\s*(.*)$/)
    if (diretiva) {
      fecharParagrafo()
      const corpo = []
      for (i++; i < linhas.length && linhas[i].trim() !== '!fim'; i++) corpo.push(linhas[i])
      if (i >= linhas.length) erros.push(`${arquivo}: !${diretiva[1]} sem !fim`)
      const onde = `${arquivo} › ${secao.titulo}`
      if (diretiva[1] === 'questoes') {
        const params = Object.fromEntries([...diretiva[2].matchAll(/(\w+)=([\w.,-]+)/g)].map((x) => [x[1], x[2].split(',').filter(Boolean)]))
        const central = params.central ?? [], relacionadas = params.relacionadas ?? [], treino = params.treino ?? []
        conferirQuestoes(central, true, onde); conferirQuestoes(relacionadas, true, onde); conferirQuestoes(treino, false, onde)
        const campos = { armadilhas: [] }
        for (const c of corpo) {
          const k = c.match(/^(conceito|como|armadilha|alerta):\s*(.+)$/)
          if (!k) { if (c.trim()) erros.push(`${onde}: linha desconhecida em !questoes: ${c}`); continue }
          if (k[1] === 'armadilha') campos.armadilhas.push(k[2]); else campos[k[1]] = k[2]
        }
        if (!campos.conceito) erros.push(`${onde}: !questoes sem conceito:`)
        if (!central.length && !relacionadas.length && !treino.length) erros.push(`${onde}: !questoes sem nenhuma questão`)
        secao.blocos.push({ id: idBloco('q' + [...central, ...relacionadas, ...treino].join()), tipo: 'questoes', central, relacionadas, treino, conceito: campos.conceito, ...(campos.como ? { como: campos.como } : {}), ...(campos.armadilhas.length ? { armadilhas: campos.armadilhas } : {}), ...(campos.alerta ? { alerta: campos.alerta } : {}) })
      } else if (diretiva[1] === 'figura') {
        const numero = diretiva[2].trim()
        const legenda = corpo.join(' ').trim()
        // Sem licença de reprodução confirmada, a figura original não é publicada: o leitor mostra a referência.
        secao.blocos.push({ id: idBloco('fig' + numero), tipo: 'figura', numero, legenda, imagem: null, licenca: 'pendente' })
      } else {
        const linhasTabela = corpo.filter((c) => c.trim().startsWith('|')).map((c) => c.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim()))
        secao.blocos.push({ id: idBloco('tab' + diretiva[2]), tipo: 'tabela', titulo: diretiva[2].trim(), cab: linhasTabela[0] ?? [], linhas: linhasTabela.slice(1).filter((r) => !r.every((x) => /^-+$/.test(x))) })
      }
      continue
    }
    if (!l.trim()) { fecharParagrafo(); continue }
    paragrafo.push(l.trim())
  }
  fecharParagrafo()
  const palavras = secoes.flatMap((s) => s.blocos).map((b) => [b.t, b.conceito, b.como, ...(b.armadilhas ?? [])].filter(Boolean).join(' ')).join(' ').split(/\s+/).length
  const questoes = new Set(secoes.flatMap((s) => s.blocos).flatMap((b) => [...(b.central ?? []), ...(b.relacionadas ?? [])]))
  const treino = new Set(secoes.flatMap((s) => s.blocos).flatMap((b) => b.treino ?? []))
  const capitulo = {
    id: meta.id, versao: Number(meta.versao), titulo: meta.titulo, especialidade: meta.especialidade,
    livro: meta.livro, edicao: meta.edicao, capitulo: meta.capitulo, autores: meta.autores, fonte: meta.fonte, resumo: meta.resumo ?? '',
    acesso: meta.acesso === 'gratis' ? 'gratis' : 'assinante',
    minutos: Math.max(1, Math.round(palavras / 200)), secoes,
  }
  // Radar honesto: "cobrança confirmada" exige questão de prova real citada na seção.
  for (const s of secoes) if (s.radar === 'confirmado' && !s.blocos.some((b) => b.tipo === 'questoes' && (b.central.length || b.relacionadas.length))) erros.push(`${arquivo} › ${s.titulo}: radar=confirmado sem questão de prova real (use fundamento, clinico ou oportunidade)`)
  for (const s of secoes) for (const b of s.blocos) if (b.t && /\*\*[^*]*$/.test(b.t.replace(/\*\*[^*]+\*\*/g, ''))) erros.push(`${arquivo}: negrito sem fechar em "${semMarcas(b.t).slice(0, 60)}"`)
  // Assuntos do acervo que o resumo ensina (para o cronograma e a página da questão sugerirem a leitura):
  // os subtemas com pelo menos um quarto das questões de prova citadas, ou os do cabeçalho (subtemas: A; B).
  const contagem = new Map()
  for (const id of questoes) for (const s of porId.get(id)?.s ?? []) contagem.set(s, (contagem.get(s) ?? 0) + 1)
  const subtemas = meta.subtemas
    ? meta.subtemas.split(';').map((x) => x.trim()).filter(Boolean)
    : [...contagem].filter(([, n]) => n >= 2 && n >= questoes.size / 4).sort((a, b) => b[1] - a[1]).map(([s]) => indice.subtemas[s])
  for (const s of subtemas) if (!indice.subtemas.includes(s)) erros.push(`${arquivo}: subtema "${s}" não existe no acervo`)
  capitulo.subtemas = subtemas
  return { capitulo, resumo: { id: capitulo.id, versao: capitulo.versao, titulo: capitulo.titulo, especialidade: capitulo.especialidade, livro: capitulo.livro, edicao: capitulo.edicao, capitulo: capitulo.capitulo, resumo: capitulo.resumo, acesso: capitulo.acesso, minutos: capitulo.minutos, secoes: secoes.map((s) => ({ id: s.id, titulo: s.titulo, radar: s.radar })), questoes: [...questoes], treino: [...treino], subtemas } }
}

const arquivos = (await readdir(ORIGEM)).filter((a) => a.endsWith('.md') && !a.startsWith('_')).sort()
const capitulos = []
for (const a of arquivos) capitulos.push(analisar(await readFile(join(ORIGEM, a), 'utf8'), a))
const ids = capitulos.map((c) => c.capitulo.id)
if (new Set(ids).size !== ids.length) erros.push('ids de capítulo repetidos')
const gratis = capitulos.filter((c) => c.capitulo.acesso === 'gratis').length
if (gratis > MAXIMO_GRATIS) erros.push(`${gratis} resumos com acesso: gratis; o máximo é ${MAXIMO_GRATIS}`)

for (const a of avisos) console.warn('aviso:', a)
if (erros.length) { for (const e of erros) console.error('erro:', e); process.exit(1) }
if (conferir) { console.log(`Biblioteca: ${capitulos.length} capítulo(s) conferido(s).`); process.exit(0) }

await mkdir(join(DESTINO, 'capitulos'), { recursive: true })
for (const { capitulo } of capitulos) await writeFile(join(DESTINO, 'capitulos', `${capitulo.id}.json`), JSON.stringify(capitulo))
// Caminho inverso: de cada questão citada para o trecho do resumo que a ensina ("Estudar este assunto").
const porQuestao = {}
for (const { capitulo } of capitulos) for (const s of capitulo.secoes) s.blocos.forEach((b, i) => {
  if (b.tipo !== 'questoes') return
  // O alvo é o texto que explica (o bloco de texto logo antes do cartão), não o cartão da questão.
  const explica = [...s.blocos.slice(0, i)].reverse().find((x) => x.tipo === 'p' || x.tipo === 'li' || x.tipo === 'prova')
  for (const [lista, papel] of [[b.central, 'central'], [b.relacionadas, 'relacionada'], [b.treino, 'treino']]) for (const q of lista) {
    (porQuestao[q] ??= []).push({ c: capitulo.id, b: explica?.id ?? b.id, s: s.titulo, t: capitulo.titulo, p: papel })
  }
})
for (const l of Object.values(porQuestao)) l.sort((x, y) => ['central', 'relacionada', 'treino'].indexOf(x.p) - ['central', 'relacionada', 'treino'].indexOf(y.p))
await writeFile(join(DESTINO, 'questoes.json'), JSON.stringify(porQuestao))
await writeFile(join(DESTINO, 'indice.json'), JSON.stringify({ geradoEm: new Date().toISOString().slice(0, 10), capitulos: capitulos.map((c) => c.resumo) }, null, 1))
console.log(`Biblioteca: ${capitulos.length} capítulo(s) gravado(s) em public/biblioteca/.`)
