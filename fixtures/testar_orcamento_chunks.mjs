// Orçamento de tamanho do código (gzip). Faz um build de produção numa pasta
// temporária (sem copiar public/) e confere que:
//  - o código inicial (entrada + o que ela importa de saída + CSS global) não
//    passou do orçamento: é o que todo celular baixa antes da primeira tela;
//  - nenhuma página passou do teto por arquivo;
//  - módulos pesados que só servem a algumas páginas não voltaram para a
//    entrada (tabela de conquistas, motor dos flashcards, cronograma).
// Se um aumento for de propósito, ajuste o número aqui e explique no commit.
// Medições e contexto: docs/DESEMPENHO-SITE-16-10.md.
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'

const KB = 1024
const ORCAMENTO = {
  /** index-*.js (código do site que roda em toda página) */
  // 56 → 57 KB em 21/10/2026: o crachá do perfil no topo do site decide em toda página se aparece
  // (src/conta/passosPerfil.ts, ~0,5 KB); o componente e o CSS dele seguem sob demanda.
  entradaJs: 57 * KB,
  /** index-*.css (estilos globais, bloqueiam a pintura) */
  entradaCss: 34 * KB,
  /** entrada + react + supabase + CSS global */
  inicialTotal: 165 * KB,
  /** qualquer outro arquivo .js (páginas e pedaços compartilhados) */
  porArquivoJs: 120 * KB,
  /** Atlas 3D (25/10/2026): o three.js (~150 KB gzip) vai num pedaço só, baixado apenas por quem abre o atlas. */
  atlas3d: 190 * KB,
}
// Trechos de código que denunciam um módulo pesado de volta na entrada.
const FORA_DA_ENTRADA = [
  ['src/estado/conquistas.ts (tabela de conquistas)', 'Sequência atual'],
  ['src/flashcards/motor/bestiario.ts', 'Golem de Gesso'],
  ['three.js (Atlas 3D)', 'WebGLRenderer'],
]

const saida = await mkdtemp(join(tmpdir(), 'orto-orcamento-'))
try {
  const resultado = await build({
    logLevel: 'silent',
    build: { outDir: saida, emptyOutDir: true, copyPublicDir: false, write: true, sourcemap: false },
  })
  const pacote = (Array.isArray(resultado) ? resultado[0] : resultado).output
  const entrada = pacote.find((p) => p.type === 'chunk' && p.isEntry)
  assert.ok(entrada, 'build sem arquivo de entrada')
  const gz = async (nome) => gzipSync(await readFile(join(saida, nome)), { level: 9 }).length
  const cssEntrada = [...(entrada.viteMetadata?.importedCss ?? [])]
  const entradaJs = await gz(entrada.fileName)
  let entradaCss = 0
  for (const c of cssEntrada) entradaCss += await gz(c)
  let importados = 0
  for (const i of entrada.imports) importados += await gz(i)
  const inicial = entradaJs + entradaCss + importados
  const fmt = (b) => `${(b / KB).toFixed(1)} KB`
  console.log(`entrada JS ${fmt(entradaJs)} · CSS global ${fmt(entradaCss)} · bibliotecas ${fmt(importados)} · inicial ${fmt(inicial)}`)

  assert.ok(entradaJs <= ORCAMENTO.entradaJs, `entrada JS ${fmt(entradaJs)} > orçamento ${fmt(ORCAMENTO.entradaJs)}`)
  assert.ok(entradaCss <= ORCAMENTO.entradaCss, `CSS global ${fmt(entradaCss)} > orçamento ${fmt(ORCAMENTO.entradaCss)}`)
  assert.ok(inicial <= ORCAMENTO.inicialTotal, `código inicial ${fmt(inicial)} > orçamento ${fmt(ORCAMENTO.inicialTotal)}`)

  const codigoEntrada = await readFile(join(saida, entrada.fileName), 'utf8')
  for (const [modulo, marca] of FORA_DA_ENTRADA) {
    assert.ok(!codigoEntrada.includes(marca), `${modulo} voltou para o código inicial (importe sob demanda)`)
  }

  const arquivos = (await readdir(join(saida, 'assets'))).filter((f) => f.endsWith('.js'))
  for (const f of arquivos) {
    const tamanho = await gz(join('assets', f))
    const teto = (await readFile(join(saida, 'assets', f), 'utf8')).includes('WebGLRenderer') ? ORCAMENTO.atlas3d : ORCAMENTO.porArquivoJs
    assert.ok(tamanho <= teto, `assets/${f} tem ${fmt(tamanho)} > teto ${fmt(teto)}`)
  }
  console.log(`orçamento de chunks ok (${arquivos.length} arquivos JS)`)
} finally {
  await rm(saida, { recursive: true, force: true })
}
