// Biblioteca de resumos (16/10/2026): ancoragem das marcações, junção entre aparelhos, conflito pela
// fila de sincronização, recusa do banco sem a migração e o gerador de conteúdo.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules/.oq-biblioteca-'))
try {
  const arquivo = join(pasta, 'm.mjs')
  await build({
    stdin: { contents: `export * from './src/biblioteca/ancoras'; export * from './src/biblioteca/juntar'; export * from './src/conta/modeloSync'; export { tipoAindaNaoAceito } from './src/conta/sincronizacao'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', loader: { '.css': 'empty' }, external: ['react', 'react-dom'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))

  // ── Ancoragem ──
  const ordem = ['a', 'b', 'c']
  const textos = new Map([['a', 'A cabeça femoral depende dos vasos retinaculares superiores.'], ['b', 'O índice de Garden é de 160 graus no AP e 180 graus no perfil.'], ['c', 'Garden aparece duas vezes: Garden III e Garden IV.']])
  const i160 = textos.get('b').indexOf('160 graus')
  const ancora = m.criarAncora('cap', 1, ordem, textos, { bloco: 'b', offset: i160 }, { bloco: 'b', offset: i160 + 9 })
  assert.equal(ancora.trechos[0].exato, '160 graus')
  assert.equal(m.resolverAncora(ancora, ordem, textos).estado, 'exata')

  // Seleção que atravessa dois blocos (e ignora os espaços nas pontas).
  const dupla = m.criarAncora('cap', 1, ordem, textos, { bloco: 'a', offset: textos.get('a').indexOf('vasos') - 1 }, { bloco: 'b', offset: 'O índice de Garden'.length })
  assert.equal(dupla.trechos.length, 2)
  assert.equal(dupla.trechos[0].exato, 'vasos retinaculares superiores.')
  assert.equal(dupla.trechos[1].exato, 'O índice de Garden')

  // Revisão editorial: texto inserido antes do trecho → reencontra no mesmo bloco ("movida").
  const v2 = new Map(textos); v2.set('b', 'Segundo o capítulo, o índice de Garden é de 160 graus no AP e 180 graus no perfil.')
  const r2 = m.resolverAncora(ancora, ordem, v2)
  assert.equal(r2.estado, 'movida'); assert.equal(v2.get('b').slice(r2.trechos[0].inicio, r2.trechos[0].fim), '160 graus')

  // Parágrafo dividido com id novo → reencontra em outro bloco.
  const ordem3 = ['a', 'b1', 'b2', 'c']
  const v3 = new Map([['a', textos.get('a')], ['b1', 'O índice de Garden é'], ['b2', 'de 160 graus no AP e 180 graus no perfil.'], ['c', textos.get('c')]])
  const r3 = m.resolverAncora(ancora, ordem3, v3)
  assert.equal(r3.estado, 'movida'); assert.equal(r3.trechos[0].bloco, 'b2')

  // Trecho repetido: o contexto decide qual ocorrência ("Garden" de "Garden IV", não de "Garden III").
  const iIV = textos.get('c').lastIndexOf('Garden')
  const iv = m.criarAncora('cap', 1, ordem, textos, { bloco: 'c', offset: iIV }, { bloco: 'c', offset: iIV + 6 })
  assert.equal(iv.trechos[0].exato, 'Garden')
  const v4 = new Map(textos); v4.set('c', 'Atenção: Garden aparece duas vezes: Garden III e Garden IV.')
  const r4 = m.resolverAncora(iv, ordem, v4)
  assert.equal(v4.get('c').slice(r4.trechos[0].inicio, r4.trechos[0].fim + 3), 'Garden IV')

  // Trecho que deixou de existir: órfã, com o texto original preservado (nunca some em silêncio).
  const v5 = new Map(textos); v5.set('b', 'O índice de alinhamento foi reescrito.')
  const r5 = m.resolverAncora(ancora, ordem, v5)
  assert.equal(r5.estado, 'orfa'); assert.equal(r5.trechos[0].exato, '160 graus')

  // Marcações sobrepostas no mesmo parágrafo: pedaços sem buraco nem repetição.
  const faixas = m.faixasDoBloco(20, [{ id: 'x', inicio: 2, fim: 10 }, { id: 'y', inicio: 6, fim: 14 }])
  assert.deepEqual(faixas.map((f) => [f.inicio, f.fim, f.ids.join()]), [[0, 2, ''], [2, 6, 'x'], [6, 10, 'x,y'], [10, 14, 'y'], [14, 20, '']])

  // ── Junção entre aparelhos ──
  const base = { tipo: 'marca', id: 'm1', capitulo: 'cap', ancora, cor: 'amarelo', nota: 'rever Garden', criadaEm: 1, editadaEm: 1 }
  const noComputador = { ...base, nota: 'rever Garden antes do TEOT', editadaEm: 10 }
  const noCelular = { ...base, nota: 'Garden: AP 160, perfil 180', cor: 'verde', editadaEm: 12 }
  const j1 = m.juntarBiblioteca(noComputador, noCelular), j2 = m.juntarBiblioteca(noCelular, noComputador)
  assert.deepEqual(j1, j2, 'a junção é a mesma nos dois aparelhos')
  assert.equal(j1.nota, 'Garden: AP 160, perfil 180'); assert.equal(j1.cor, 'verde')
  assert.deepEqual(j1.notasDeOutroAparelho, ['rever Garden antes do TEOT'], 'a nota do outro aparelho fica guardada')
  // Exclusão antes da edição do outro lado: a edição vence; exclusão depois: a exclusão vence.
  assert.equal(m.juntarBiblioteca({ ...base, apagadaEm: 5 }, { ...base, editadaEm: 8 }).apagadaEm, undefined)
  assert.equal(m.juntarBiblioteca({ ...base, apagadaEm: 9 }, { ...base, editadaEm: 8 }).apagadaEm, 9)
  // Posição: vale a mais recente; o progresso e a conclusão não andam para trás.
  const l = m.juntarBiblioteca({ tipo: 'leitura', capitulo: 'cap', bloco: 'b', deslocamento: 0, progresso: 80, em: 5, concluidoEm: 4 }, { tipo: 'leitura', capitulo: 'cap', bloco: 'a', deslocamento: 0, progresso: 20, em: 9 })
  assert.equal(l.bloco, 'a'); assert.equal(l.progresso, 80); assert.equal(l.concluidoEm, 4)

  // ── Pela fila de sincronização: o mesmo item editado nos dois aparelhos ──
  const estado = m.estadoVazio()
  estado.versoes['biblioteca/m.m1'] = 3
  m.registrarAlteracoes(estado, 'biblioteca', { 'm.m1': base }, { 'm.m1': noComputador })
  assert.equal(estado.pendentes['biblioteca/m.m1'].base, 3)
  // O servidor já tem a versão do celular (versão 4): conflito resolvido juntando, sem perder a nota.
  const doc = { tipo: 'biblioteca', item: 'm.m1', valor: noCelular, versao: 4, operacao: 'outra' }
  assert.equal(m.receberDocumento(estado, doc), true)
  assert.equal(doc.valor.nota, 'Garden: AP 160, perfil 180')
  assert.deepEqual(doc.valor.notasDeOutroAparelho, ['rever Garden antes do TEOT'])
  assert.equal(estado.pendentes['biblioteca/m.m1'].base, 4, 'a junção sobe de novo sobre a versão do servidor')
  assert.ok(m.TIPOS_SYNC.includes('biblioteca'))

  // ── Banco sem a parte 29: não é erro do item (fica pendente, não vai para "não enviados") ──
  const recusa = { code: '23514', message: 'new row for relation "progresso_usuario" violates check constraint "progresso_usuario_tipo_check"' }
  assert.equal(m.tipoAindaNaoAceito('biblioteca', recusa), true)
  assert.equal(m.tipoAindaNaoAceito('respondidas', recusa), false)
  assert.equal(m.tipoAindaNaoAceito('biblioteca', { code: '23514', message: 'violates check constraint "tamanho_documento"' }), false)

  // ── Gerador: o conteúdo confere (questões existem, prova real, sem duplicata, no máximo 5 abertos) ──
  execFileSync('node', ['scripts/biblioteca/gerar.mjs', '--conferir'], { stdio: 'pipe' })

  console.log('Biblioteca: âncoras (exata, movida, outro bloco, repetida, órfã, sobreposição), junção entre aparelhos, conflito na fila, banco sem migração e gerador: OK')
} finally { await rm(pasta, { recursive: true, force: true }) }
