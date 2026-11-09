import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta=await mkdtemp(join(process.cwd(),'node_modules','.oq-negocio-'))
try {
  const arquivo=join(pasta,'negocio.mjs')
  await build({stdin:{contents:`export * from './src/admin/dados/negocio';export * from './src/admin/dados/metas';export * from './src/componentes/admin/receita';export * from './src/componentes/admin/financeiro'`,resolveDir:process.cwd(),loader:'ts'},outfile:arquivo,bundle:true,format:'esm',platform:'node',logLevel:'error'})
  const m=await import(pathToFileURL(arquivo))
  const agora=new Date('2026-11-08T21:00:00Z')
  for(const fuso of ['UTC','Asia/Tokyo','America/Sao_Paulo']) {
    process.env.TZ=fuso
    const j=m.janelas('semana',agora)
    assert.equal(new Date(j.inicio).toISOString(),'2026-11-02T03:00:00.000Z')
    assert.equal(j.fim-j.inicio,j.ateAnterior-j.anterior,'comparação com o mesmo tempo transcorrido')
    assert.equal(m.chavePeriodo(new Date('2026-11-01T02:59:00Z'),'mes'),'2026-10')
    const fimCurto=m.janelas('mes',new Date('2027-03-31T21:00:00Z'))
    assert.ok(fimCurto.ateAnterior<=fimCurto.inicio,'mês anterior nunca invade o mês atual')
  }
  const u=(id,criado)=>({id_usuario:id,criado_em:criado,respondidas:10})
  const usuarios=[u('antigo','2026-10-01T12:00:00Z'),u('recente','2026-11-07T12:00:00Z')]
  const c=(id,em,valor=39.9)=>({id_usuario:id,em:new Date(em),plano:'mensal',valor,meio:'pix',tipo:'nova',estimada:false})
  const cobrancas=[c('antigo','2026-10-03T12:00:00Z'),c('recente','2026-11-08T12:00:00Z'),c('fora','2026-11-08T12:00:00Z')]
  const eventos=m.eventosNegocio(usuarios,cobrancas)
  assert.equal(eventos.filter(e=>e.id==='fora').length,0,'numerador de compras respeita o público dos cadastros')
  const coortes=m.coortesCompra(usuarios,cobrancas,null,agora.getTime())
  assert.equal(coortes[0].compraram,1)
  assert.equal(coortes[0].janelas[0].elegiveis,0,'compra recente não força maturidade do denominador')
  assert.equal(coortes[1].janelas[0].pagaram,1)
  assert.equal(coortes[1].janelas[2].elegiveis,1)
  assert.equal(m.mediana([9,1,5,3]),4)
  const futura={id:'futuro',em:new Date('2027-01-01T12:00:00Z'),tipo:'cadastro',valor:0}
  assert.equal(m.serieNegocio([...eventos,futura],'mes',agora).reduce((n,s)=>n+s.cadastro,0),2)
  const cartao={id_usuario:'cartao',plano:'mensal',status:'ativa',meio:'cartao',criada_em:'2026-11-01T12:00:00Z',ultima_cobranca_em:'2026-11-01T12:00:00Z',fim_periodo:'2026-12-01T12:00:00Z'}
  assert.equal(m.cobrancas([cartao],[])[0].estimada,true,'sem valor histórico não recebe selo de confirmação')
  const registro={...c('cartao',cartao.ultima_cobranca_em,19.9),em:cartao.ultima_cobranca_em,meio:'cartao',situacao:'reembolsada',id_pagamento:'123456'}
  const devolvida={...cartao,status:'reembolsada',fim_periodo:'2026-11-04T12:00:00Z'}
  assert.equal(m.mesAMes([devolvida],1,agora,[registro])[0].valorReembolsado,19.9,'reembolso usa valor histórico, não preço de hoje')
  const tentativa={...cartao,id_usuario:'nunca-pagou',status:'vencida',meio:'pix',ultima_cobranca_em:null,fim_periodo:'2026-11-03T12:00:00Z'}
  const fin=m.calcularFinanceiro([tentativa],[],agora)
  assert.equal(fin.perderamMes,0)
  assert.equal(fin.taxaRenovacaoMes,null,'sem pagantes observáveis, não inventa renovação 0%')
  const pix={...cartao,id_usuario:'pix',meio:'pix',cancelar_ao_fim:true,fim_periodo:'2026-11-20T12:00:00Z'}
  for(const taxaPix of [0,.1,.3,.6,1]) {
    const p=m.projetarMes({agora:agora.getTime(),cadastros:[],cobrancas:[],assinaturas:[pix],taxaPix})
    assert.ok(p.faturamento.baixo<=p.faturamento.centro&&p.faturamento.centro<=p.faturamento.alto,'cenários contêm a estimativa central')
  }
  const args={agora:agora.getTime(),cadastros:[new Date('2026-11-01T12:00:00Z')],cobrancas:[],assinaturas:[],taxaPix:.6}
  assert.equal(m.projetarMes({...args,meta:{cadastros:10,novosPagantes:2}}).cadastros.centro,m.projetarMes({...args,meta:{cadastros:1000,novosPagantes:200}}).cadastros.centro,'mudar objetivo não muda a previsão')
  console.log('Negócio: fuso, janelas equivalentes, público, coortes maduras, histórico, renovação, reembolso e independência de metas ok.')
} finally { await rm(pasta,{recursive:true,force:true}) }
