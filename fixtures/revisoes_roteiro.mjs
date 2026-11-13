// Só dados artificiais numa conta falsa local. Nunca altera o progresso de produção.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const indice=JSON.parse(readFileSync(new URL('../public/acervo/indice.json',import.meta.url),'utf8'))
const CONTA='11111111-2222-4333-8444-555555555555', prefixo=`ortoquestoes:conta:${CONTA}:`
export async function antes(p) {
 const itens=indice.questoes.filter(q=>!q.an&&!q.dup&&q.c).slice(0,600)
 await p.addInitScript(({itens,prefixo})=>{
  const D=86400000,agora=Date.now(),regs={}
  itens.forEach((q,i)=>{
   const h=[],tentativas=2+i%5;let corretas=0,erradas=0
   for(let j=0;j<tentativas;j++){const em=agora-(70-(i%50)-j*3)*D;const correta=(i+j)%5>1;h.push({em,correta,confianca:((i+j)%4===0?'duvida':(i+j)%7===0?'chute':'seguro')});if(correta)corretas++;else erradas++}
   const u=h[h.length-1];regs[q.id]={c:u.correta,q:u.em,tentativas,acertos:corretas,erros:erradas,sequencia:u.correta?2:0,confianca:u.confianca,proximaRevisao:agora+((i%40)-28)*D,historico:h}
  })
  regs['id-antigo-indisponivel']={c:false,q:agora-60*D,tentativas:1,confianca:'seguro',proximaRevisao:agora-60*D}
  localStorage.setItem(prefixo+'respondidas',JSON.stringify(regs))
  localStorage.setItem(prefixo+'revisao:ritmo',JSON.stringify({limite:30,folgas:[]}))
 },{itens,prefixo})
}
export default async function(p,foto,nome) {
 await p.getByRole('heading',{name:'Sua revisão',exact:true}).waitFor()
 assert.equal(await p.locator('.rp-resumo dl>div:nth-child(2) dd').innerText(),'30')
 await foto('inicio')
 await p.getByRole('button',{name:'Leve · ~5 min',exact:true}).click()
 assert.equal(await p.locator('.rp-resumo dl>div:nth-child(2) dd').innerText(),'7')
 await foto('leve')
 await p.getByRole('button',{name:'Fazer meu passo de hoje'}).click()
 await p.locator('dialog[open]').waitFor()
 await foto('previa')
 await p.getByLabel('Tentar lembrar antes das alternativas').check()
 await p.getByRole('button',{name:'Voltar',exact:true}).click()
 await p.getByRole('button',{name:'Explorar fila',exact:true}).click()
 await p.getByRole('button',{name:'Histórico',exact:true}).first().click()
 await foto('fila')
 await p.getByRole('button',{name:'Calendário',exact:true}).click()
 await foto('calendario')
 await p.getByRole('button',{name:'Mês',exact:true}).click()
 await foto('mes')
 await p.getByRole('button',{name:'Aprendizado',exact:true}).click()
 await p.getByRole('heading',{name:'O que suas revisões estão construindo'}).waitFor()
 await p.locator('#rp-analise-titulo').scrollIntoViewIfNeeded()
 await foto('analise')
 await p.locator('.rp-graficos').scrollIntoViewIfNeeded()
 await foto('graficos')
 assert.ok((await p.locator('.rp-graficos svg').count())>=3)
 await p.getByRole('button',{name:'Hoje',exact:true}).click()
 await p.getByRole('button',{name:'Visual compacto',exact:true}).click()
 await foto('compacto')
 const dims=await p.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}))
 assert.ok(dims.s<=dims.w+1,`Sem rolagem lateral (${nome}): ${JSON.stringify(dims)}`)
}
