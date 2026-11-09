// API fictícia: falha inicial não deve pedir SQL nem ser tratada como lista vazia.
import assert from 'node:assert/strict'
import { instalarDados, usuarios } from './admin-negocio-dados.mjs'
export async function antes(p) {
  await instalarDados(p)
  let tentativas = 0
  await p.route('**/rest/v1/rpc/listar_fora_publico_admin', async r => {
    tentativas++
    if (tentativas === 1) {
      const ausente = process.env.OQ_SQL_AUSENTE === '1'
      await r.fulfill({status:ausente?404:503,contentType:'application/json',body:JSON.stringify({code:ausente?'PGRST202':'57014',message:ausente?'Could not find the function':'Consulta indisponível no teste'})})
    } else await r.fulfill({json:usuarios.slice(0,2).map(u=>({id_usuario:u.id_usuario,motivo:'Exemplo fictício',marcado_em:'2026-11-08T15:00:00Z'}))})
  })
}
export default async function(p,foto,nome) {
  const secao = p.locator('#cr-dados')
  await secao.waitFor()
  const erro = process.env.OQ_SQL_AUSENTE === '1' ? 'Recurso de marcação indisponível' : 'Não foi possível carregar as marcações'
  await secao.getByText(erro,{exact:true}).waitFor()
  assert.ok(!(await secao.innerText()).includes('Rode o SQL'))
  assert.equal(await secao.getByText('Nenhuma conta marcada.',{exact:true}).count(),0)
  await secao.scrollIntoViewIfNeeded(); await foto('01-falha')
  await secao.getByRole('button',{name:'Tentar carregar novamente'}).click()
  await secao.getByText('Já marcadas (2)',{exact:true}).waitFor()
  assert.equal(await secao.getByText(erro,{exact:true}).count(),0)
  await foto('02-recuperado')
  console.log('Público',nome,': falha identificada corretamente, sem instrução indevida de SQL, lista preservada e retry recupera duas marcações.')
}
