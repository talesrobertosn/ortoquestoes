// Quem vê o cronograma real e quem vê o cenário fictício (pedido do Tales, 19/10/2026).
// 1. assinante (e cortesia/administrador, que chegam como premium) vê o real; o modo demo também;
// 2. visitante e conta sem assinatura veem o fictício; conta logada sem resposta do servidor espera;
// 3. no fictício só a semana de hoje fica aberta no calendário;
// 4. as ações que abririam uma sessão ou gravariam no plano param no convite quando é fictício.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ entryPoints: ['src/dados/vistaCronograma.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const { vistaDoCronograma, semanaAbertaNoFicticio } = await import(pathToFileURL(arquivo))

  const casos = [
    [{ premium: true, logado: true, carregado: true }, 'real', 'assinante'],
    [{ premium: true, logado: true, carregado: true, demo: false }, 'real', 'cortesia ou administrador (premium pelo servidor)'],
    [{ premium: false, logado: true, carregado: true }, 'ficticio', 'conta sem assinatura'],
    [{ premium: false, logado: false, carregado: false }, 'ficticio', 'visitante'],
    [{ premium: false, logado: true, carregado: false }, 'carregando', 'conta logada antes da resposta do servidor'],
    [{ premium: false, logado: false, carregado: false, demo: true }, 'real', 'modo demo de desenvolvimento'],
  ]
  for (const [acesso, esperado, quem] of casos) assert.equal(vistaDoCronograma(acesso), esperado, quem)

  const seg = new Date(2026, 9, 19)
  assert.equal(semanaAbertaNoFicticio(new Date(2026, 9, 19), seg), true, 'a semana de hoje fica aberta')
  assert.equal(semanaAbertaNoFicticio(new Date(2026, 9, 26), seg), false, 'a próxima semana mostra a trava')
  assert.equal(semanaAbertaNoFicticio(new Date(2026, 9, 12), seg), false, 'a semana passada mostra a trava')

  // Guardas no código da página: nada do plano de exemplo vira sessão ou gravação.
  const fonte = await readFile('src/paginas/PlanoEstudo.tsx', 'utf8')
  for (const funcao of ['comecarHoje', 'puxarDia', 'adiantar', 'comecarIds', 'comecarMini']) {
    const corpo = fonte.slice(fonte.indexOf(`async function ${funcao}(`), fonte.indexOf(`async function ${funcao}(`) + 400)
    assert.match(corpo, /if \(ficticio\) \{ convidar\(/, `${funcao} para no convite no cenário fictício`)
  }
  assert.match(fonte, /if \(!ficticio\) conferirMetaCronograma/, 'a conquista da meta não conta no fictício')
  assert.match(fonte, /if \(exemplo \|\| !premium \|\| !plano \|\| !opcoesComMarcas/, 'as marcas do dia não sobem no fictício')
  assert.match(fonte, /if \(exemplo \|\| !sincronizado \|\| !plano \|\| !calculo \|\| !extraHoje/, 'o adiantamento não é gravado no fictício')
  const calendario = await readFile('src/paginas/CronogramaCalendario.tsx', 'utf8')
  assert.match(calendario, /if \(!ficticio\) gravarVista\(v\)/, 'o fictício não muda a vista guardada do assinante')
  console.log('Vista do cronograma (real × fictício): todos corretos.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
