// Canais de aquisição (05/11/2026): a origem registrada vira Google, Instagram, WhatsApp, Indicação, Acesso direto ou Outras.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-qualidade-'))
const arquivo = join(pasta, 'q.mjs')
try {
  await build({ stdin: { contents: `export { canalDe } from './src/admin/dados/canais'`, resolveDir: process.cwd(), loader: 'ts' }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' },
    external: ['react', 'react-dom', 'react/*', 'react-dom/*', '@supabase/*'], define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_SUPABASE_URL': '""', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '""' }, logLevel: 'error' })
  const { canalDe } = await import(pathToFileURL(arquivo))
  assert.equal(canalDe(null), 'Acesso direto')
  assert.equal(canalDe({}), 'Acesso direto')
  assert.equal(canalDe({ fonte: 'google', meio: 'cpc' }), 'Google')
  assert.equal(canalDe({ fonte: 'instagram', meio: 'bio' }), 'Instagram')
  assert.equal(canalDe({ fonte: 'ig' }), 'Instagram')
  assert.equal(canalDe({ fonte: 'whatsapp', campanha: 'grupo-r1' }), 'WhatsApp')
  assert.equal(canalDe({ fonte: 'indicacao' }), 'Indicação')
  assert.equal(canalDe({ fonte: 'chatgpt.com' }), 'Outras fontes')
  console.log('Canais de aquisição ok.')
} finally { await rm(pasta, { recursive: true, force: true }) }
