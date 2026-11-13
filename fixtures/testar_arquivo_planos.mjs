// A página de Planos atual precisa estar arquivada (13/11/2026): cada mudança na oferta ganha uma cópia datada,
// que prova o que foi anunciado (Condições da Assinatura, Cláusula 3). Falhou? Rode:
//   node scripts/juridico/arquivar_planos.mjs
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { hashDaOferta } from '../scripts/juridico/hash_planos.mjs'

const indice = JSON.parse(readFileSync('docs/juridico/planos/indice.json', 'utf8'))
const hash = await hashDaOferta()
const versao = indice.versoes.find((v) => v.hash === hash)
assert.ok(versao, `A página de Planos mudou (${hash}) e ainda não foi arquivada. Rode: node scripts/juridico/arquivar_planos.mjs`)
for (const f of ['texto.txt', 'computador.jpg', 'celular.jpg']) assert.ok(existsSync(`docs/juridico/planos/${versao.pasta}/${f}`), `falta ${f} em ${versao.pasta}`)
console.log(`arquivo dos Planos: versão atual arquivada em ${versao.pasta}`)
