// Quem desligou os e-mails não recebe e-mail (18/10/2026). Confere:
//   1) a regra (preferencias.ts): cada interruptor barra a sua categoria, os quatro desligados barram
//      tudo, sem linha é tudo ligado e leitura que falhou (null) é não;
//   2) que todo enviarEmail de enviar-email/index.ts para a pessoa passa antes por podeReceber com a
//      categoria certa, no mesmo bloco (lotes, automáticos, relato, marco, carta da ficha e parabéns).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-descadastro-'))
const arquivo = join(pasta, 'p.mjs')
try {
  await build({
    stdin: { contents: `export * from './supabase/functions/_shared/preferencias.ts'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
  })
  const { permiteEnvio, preferenciasDaLinha, desligouTudo } = await import(pathToFileURL(arquivo))
  const CATEGORIAS = ['conquistas', 'relatorio', 'lembretes', 'cartas']
  const COLUNA = { conquistas: 'conquistas', relatorio: 'relatorio_mensal', lembretes: 'lembretes', cartas: 'cartas' }

  // Sem linha: tudo ligado. Leitura que falhou: nada sai.
  for (const c of CATEGORIAS) {
    assert.equal(permiteEnvio(preferenciasDaLinha(null), c), true, `sem linha, ${c} sai`)
    assert.equal(permiteEnvio(null, c), false, `leitura falhou, ${c} não sai`)
  }
  // Cada interruptor desligado barra só a sua categoria.
  for (const c of CATEGORIAS) {
    const p = preferenciasDaLinha({ [COLUNA[c]]: false })
    for (const outra of CATEGORIAS) assert.equal(permiteEnvio(p, outra), outra !== c, `${COLUNA[c]} desligado, ${outra}`)
  }
  // Os quatro desligados: nada sai, nem por outra categoria.
  const tudoDesligado = preferenciasDaLinha({ conquistas: false, relatorio_mensal: false, lembretes: false, cartas: false })
  assert.equal(desligouTudo(tudoDesligado), true)
  for (const c of CATEGORIAS) assert.equal(permiteEnvio(tudoDesligado, c), false, `tudo desligado, ${c}`)
  // Só false explícito desliga (null/ausente = padrão ligado).
  assert.equal(permiteEnvio(preferenciasDaLinha({ cartas: null }), 'cartas'), true)

  // Todo envio para a pessoa passa por podeReceber antes, com a categoria certa.
  const fonte = await readFile('supabase/functions/enviar-email/index.ts', 'utf8')
  const linhas = fonte.split('\n')
  const envios = linhas.map((l, i) => [l, i]).filter(([l]) => /await enviarEmail\(/.test(l)).map(([, i]) => i)
  assert.equal(envios.length, 7, 'número de envios mudou: confira se o novo passa por podeReceber e atualize este teste')
  const esperado = ['relatorio', 'lembretes', 'cartas', 'cartas', 'conquistas', 'cartas', 'cartas']
  envios.forEach((i, n) => {
    // Procura para trás, até a função ou a ação que contém o envio, a checagem mais próxima.
    let j = i, achou = null
    while (j-- > 0) {
      const m = linhas[j].match(/podeReceber\([^,]+, '([a-z]+)'\)/)
      if (m) { achou = m[1]; break }
      if (/^(async )?function |^\s{4}if \(corpo\.acao === /.test(linhas[j])) break
    }
    assert.equal(achou, esperado[n], `envio da linha ${i + 1} sem podeReceber('${esperado[n]}') antes`)
  })
  console.log('Descadastro: regra e todos os envios conferidos.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
