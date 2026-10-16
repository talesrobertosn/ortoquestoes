// Pré-carga das páginas (util/preCarga.ts e o script do index.html gerado pelo vite.config.ts):
// o endereço precisa levar à mesma página que o App mostra, inclusive nas exceções em que a
// subpágina ou a aba trocam de componente (#/conta/assinatura e #/ranking?aba=flashcards).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const pasta = await mkdtemp(join(raiz, 'node_modules', '.oq-precarga-'))
try {
  const saida = join(pasta, 'p.mjs')
  // Só o mapa importa aqui: os import() das páginas viram módulos vazios.
  await build({
    stdin: { contents: `export { paginaDoEndereco } from './src/util/preCarga'`, resolveDir: raiz, loader: 'ts' },
    outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    plugins: [{ name: 'sem-paginas', setup(b) { b.onResolve({ filter: /\/paginas\// }, () => ({ path: 'vazio', namespace: 'vazio' })); b.onLoad({ filter: /.*/, namespace: 'vazio' }, () => ({ contents: 'export {}' })) } }],
  })
  const { paginaDoEndereco: p } = await import(pathToFileURL(saida))
  const casos = {
    '#/': 'Inicio', '': 'Inicio', '#/treinar': 'Treinar', '#/treinar?temas=mao': 'Treinar',
    '#/conta': 'Conta', '#/conta?modo=criar&voltar=%2Ftreinar': 'Conta', '#/conta/assinatura': 'DetalhesAssinatura', '#/conta/assinatura?x=1': 'DetalhesAssinatura',
    '#/ranking': 'Ranking', '#/ranking?aba=semana': 'Ranking', '#/ranking?aba=flashcards': 'RankingCripta', '#/ranking?aba=cripta': 'RankingCripta',
    '#/cronograma': 'PlanoEstudo', '#/flashcards/biblioteca': 'Flashcards', '#/inexistente': null, 'https://fora': null,
  }
  for (const [hash, esperado] of Object.entries(casos)) assert.equal(p(hash), esperado, `${hash || '(vazio)'}: esperava ${esperado}`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
console.log('pré-carga: endereços levam à página certa, inclusive conta/assinatura e ranking dos flashcards')
