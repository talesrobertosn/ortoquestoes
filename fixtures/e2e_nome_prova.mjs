import assert from 'node:assert/strict'
export async function antes(p) {
  await p.route('**/rest/v1/rpc/salvar_plano_estudo', async r => {
    const a = r.request().postDataJSON()
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ data_prova: a.p_data_prova, intensidade: a.p_intensidade, folgas: a.p_folgas, prova: a.p_prova, base_respondidas: a.p_base, criado_em: new Date().toISOString(), incluir_simulados: true, opcoes: {} }]) })
  })
}
export default async function(p, foto, nome) {
  const prova = p.locator('.pe-form select').first()
  await prova.waitFor()
  await prova.selectOption('Outra prova')
  const campo = p.getByRole('textbox', {name:'Qual é a prova?'})
  await campo.waitFor()
  assert.equal(await p.getByRole('button', {name:'Continuar', exact:true}).isDisabled(), true, 'não avança sem nome')
  await foto('01-outra-prova', {fullPage:true})
  await campo.fill('Cirurgia da mão — USP')
  await prova.selectOption('TEOT')
  assert.equal(await campo.count(), 0, 'o campo desaparece para provas conhecidas')
  await prova.selectOption('Outra prova')
  assert.equal(await campo.inputValue(), 'Cirurgia da mão — USP', 'preserva o nome ao alternar')
  await foto('02-nome-informado', {fullPage:true})
  for (let i=0; i<3; i++) {
    const avancar = p.getByRole('button', {name:/Continuar|Próximo/}).first()
    if (await avancar.count()) await avancar.click()
  }
  const pedido = p.waitForRequest(r => r.url().endsWith('/rpc/salvar_plano_estudo'))
  await p.getByRole('button', {name:'Criar meu cronograma', exact:true}).click()
  assert.equal((await pedido).postDataJSON().p_prova, 'Cirurgia da mão — USP', 'nome real enviado ao banco')
  console.log('Nome da prova', nome, ': campo condicional, limite e preservação ao alternar conferidos')
}
