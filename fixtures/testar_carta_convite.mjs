// A carta de convite (12/11/2026): quando aparece, quem entrega, o que oferece e as vagas das indicações.
// Regras em src/componentes/convite/regras.ts; folhas dos bichos de scripts/sprites/convite_bichos.py.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-convite-'))
try {
  const saida = join(pasta, 'regras.mjs')
  await build({ entryPoints: ['src/componentes/convite/regras.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const r = await import(pathToFileURL(saida))

  // Relógio: 5 minutos de uso abrem a carta uma vez no dia; depois, só a hora de uso contínuo.
  let estado = r.estadoDoDia(null, '2026-11-12')
  let continuo = 0, abriu = 0
  for (let s = 0; s < r.USO_NECESSARIO; s += r.PASSO) {
    const p = r.passo(estado, continuo, 0)
    estado = p.estado; continuo = p.continuo
    if (p.abrir) { abriu++; estado = { ...estado, mostrado: true }; continuo = 0 }
  }
  assert.equal(abriu, 1, 'abre uma vez aos 5 minutos')
  assert.equal(r.passo(estado, r.USO_CONTINUO - r.PASSO, 0).abrir, true, 'volta depois de uma hora de uso contínuo')
  assert.equal(r.passo(estado, 0, 0).abrir, false, 'já mostrada hoje: não abre de novo antes da hora')
  // Quem compartilhou fica um mês sem ver, mesmo num dia novo.
  const pausado = { ...estado, pausaAte: 10_000 }
  assert.equal(r.passo(pausado, r.USO_CONTINUO, 5_000).abrir, false)
  const amanha = r.estadoDoDia(pausado, '2026-11-13')
  assert.deepEqual([amanha.segundos, amanha.mostrado, amanha.pausaAte], [0, false, 10_000])

  // Rotas protegidas: nunca no meio da sessão, do login, do pagamento ou do admin.
  for (const c of ['/sessao/abc', '/entrar', '/assinatura', '/admin/x', '/flashcards/estudo', '/dev/convite']) assert.equal(r.rotaLivre(c), false, c)
  for (const c of ['/', '/treinar', '/resumos', '/indicar']) assert.equal(r.rotaLivre(c), true, c)
  assert.ok(r.JANELAS_ABERTAS.includes('.cvc') && r.JANELAS_ABERTAS.includes('.jc') && r.JANELAS_ABERTAS.includes('.nc'))

  // Um bicho por dia, alternando; o mesmo o dia inteiro.
  const dias = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-12-31', '2027-01-01']
  const bichos = dias.map(r.bichoDoDia)
  for (const b of bichos) assert.ok(b === 'coruja' || b === 'gato')
  assert.notEqual(bichos[0], bichos[1]); assert.notEqual(bichos[1], bichos[2]); assert.notEqual(bichos[4], bichos[5])
  assert.equal(r.bichoDoDia('2026-11-12'), r.bichoDoDia('2026-11-12'))
  assert.equal(r.hoje(Date.UTC(2026, 10, 13, 2, 0)), '2026-11-12', 'dia de São Paulo (23h do dia 12)')

  // O que a carta oferece.
  const dados = (convidados, confirmados) => ({ codigo: 'X', convidados, confirmados, dias_ganhos: confirmados * 7, limite: 12 })
  assert.equal(r.situacao(false, true, null, 0), 'visitante')
  assert.equal(r.situacao(true, false, null, 0), 'carregando')
  assert.equal(r.situacao(true, true, null, 0), 'sem-link')
  assert.equal(r.situacao(true, true, dados(2, 1), 0), 'indicar')
  assert.equal(r.situacao(true, true, dados(2, 1), 1), 'agradecer')
  assert.equal(r.situacao(true, true, dados(12, 12), 0), 'completo')

  // Só festeja quem confirmou depois da última carta (na primeira vez, guarda sem festejar).
  assert.equal(r.novosConfirmados(3, undefined), 0)
  assert.equal(r.novosConfirmados(3, 1), 2)
  assert.equal(r.novosConfirmados(1, 3), 0)

  // As 12 vagas.
  const v = r.vagas(dados(5, 3))
  assert.equal(v.length, 12)
  assert.deepEqual([v.filter((x) => x === 'confirmada').length, v.filter((x) => x === 'caminho').length], [3, 2])
  assert.equal(r.vagas(dados(20, 12)).filter((x) => x === 'caminho').length, 0, 'nunca passa das 12')

  // As folhas dos bichos têm o tamanho que BichoCarta.tsx espera.
  const tamanho = async (arq) => { const b = await readFile(arq); return [b.readUInt32BE(16), b.readUInt32BE(20)] }
  assert.deepEqual(await tamanho('public/pixel/mascote/gato-convite.png'), [64 * 6, 64 * 6])
  assert.deepEqual(await tamanho('public/pixel/mascote/coruja-convite.png'), [44 * 5, 32 * 5])
  assert.deepEqual(await tamanho('public/pixel/mascote/carta-mini.png'), [9, 7])
  const bicho = await readFile('src/componentes/convite/BichoCarta.tsx', 'utf8')
  assert.ok(bicho.includes("w: 64, h: 64, colunas: 6") && bicho.includes("w: 44, h: 32, colunas: 5"))
  console.log('Carta de convite: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
