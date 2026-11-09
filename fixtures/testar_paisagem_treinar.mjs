import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'oq-treinar-cenas-'))
try {
  const arquivo = join(pasta, 'cenas.mjs')
  await build({ entryPoints: ['src/estado/paisagemTreinar.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })
  const { paisagemTreinar } = await import(pathToFileURL(arquivo))
  for (const [hora, cena] of [['04:59:59','observatorio-noite'],['05:00:00','manha'],['11:59:59','manha'],['12:00:00','cais-manha'],['16:59:59','cais-manha'],['17:00:00','cais-tarde'],['18:59:59','cais-tarde'],['19:00:00','observatorio-noite'],['23:59:59','observatorio-noite'],['00:00:00','observatorio-noite']]) {
    const resultado = paisagemTreinar(new Date(`2026-11-09T${hora}-03:00`))
    assert.equal(resultado, `cena-${cena}-960.webp`, hora)
    await access(`public/pixel/inicio/${resultado}`)
  }
  for (const [fixo, cena] of [['manha','manha'],['tarde','cais-tarde'],['noite','observatorio-noite']])
    for (const h of ['08:00:00','14:00:00','18:00:00','22:00:00'])
      assert.equal(paisagemTreinar(new Date(`2026-11-09T${h}-03:00`), fixo), `cena-${cena}-960.webp`)
  // Mesmo instante em fusos diferentes precisa escolher a mesma arte.
  assert.equal(paisagemTreinar(new Date('2026-11-09T20:00:00Z')), paisagemTreinar(new Date('2026-11-10T05:00:00+09:00')))
  console.log('Treinar: quatro paisagens, limites de horário, madrugada, fuso e cenários fixos conferidos.')
} finally { await rm(pasta, { recursive: true, force: true }) }
