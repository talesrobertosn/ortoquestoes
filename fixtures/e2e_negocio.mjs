// Executado pelo capturador: --roteiro fixtures/e2e_negocio.mjs. Só usa API fictícia.
import assert from 'node:assert/strict'
import { instalarDados } from './admin-negocio-dados.mjs'
let chamadas=[]
export async function antes(page){chamadas=await instalarDados(page,{vazio:process.env.OQ_VAZIO==='1',falha:process.env.OQ_FALHA==='1'})}
export default async function roteiro(page,foto,nome){
  const erros=[];page.on('pageerror',e=>erros.push(e.message))
  await page.getByRole('heading',{name:'Seu crescimento, com contexto'}).waitFor()
  await foto('crescimento-topo')
  await page.getByText('Explorar o histórico: linhas, médias e calendário',{exact:true}).click()
  await page.getByRole('group',{name:'Escala do crescimento'}).getByRole('button',{name:'Mês',exact:true}).click()
  await page.getByRole('button',{name:'Linhas',exact:true}).click()
  await page.getByRole('img',{name:/Evolução de cadastros/}).focus()
  await page.keyboard.press('ArrowLeft')
  assert.ok((await page.locator('.mp-explorar .ng-leitura').first().innerText()).includes('Cadastros'))
  assert.equal(await page.locator('.mp-periodo').count(),3,'dia, semana e mês aparecem juntos')
  await page.getByRole('button',{name:/Novos cadastros: .*hoje/i}).click()
  assert.ok(await page.getByRole('button',{name:'Fechar pessoas',exact:true}).isVisible())
  await page.getByRole('button',{name:'Fechar pessoas',exact:true}).click()
  await page.getByText('Ver os três períodos em tabela',{exact:true}).click()
  await foto('crescimento-graficos',{fullPage:true})
  if(process.env.OQ_FALHA!=='1'){
    await page.getByText('O que aconteceu nesses dias?',{exact:false}).click()
    await page.getByLabel('O que aconteceu?',{exact:true}).fill('Campanha de teste no ambiente fictício')
    await page.getByRole('button',{name:'Salvar anotação',exact:true}).click()
    await page.getByText('Campanha de teste no ambiente fictício',{exact:true}).waitFor()
    await page.getByRole('button',{name:'Fechar aviso',exact:true}).click()
  }
  const antes=chamadas.filter(n=>n==='jornada_crescimento_admin').length
  const atualizar=page.getByRole('button',{name:'Atualizar os dados',exact:true})
  if(await atualizar.isVisible()) await atualizar.click()
  else await page.getByRole('button',{name:'Atualizar',exact:true}).click()
  await page.waitForTimeout(200)
  assert.ok(chamadas.filter(n=>n==='jornada_crescimento_admin').length>antes,'Atualizar alcança a jornada de Crescimento')
  await page.goto(page.url().split('#')[0]+'#/admin?aba=financeiro')
  await page.getByRole('heading',{name:/Quanto entrou, quem paga/}).waitFor()
  await page.evaluate(()=>window.scrollTo(0,0))
  await foto('financeiro-topo')
  await page.locator('.hb-numero-grande').click()
  await page.locator('#fi-pessoas').waitFor()
  await page.locator('#fi-pessoas').getByRole('button',{name:'Fechar',exact:true}).click()
  await page.getByRole('group',{name:'Período'}).getByRole('button',{name:'Semana',exact:true}).click()
  await page.locator('#fi-calendario').scrollIntoViewIfNeeded()
  await foto('financeiro-calendario')
  const calendario=page.getByRole('group',{name:'Quantos do Pix pagam de novo'}).first()
  await calendario.getByRole('button',{name:'50%',exact:true}).click()
  assert.ok((await page.locator('.hb-sim__pergunta').innerText()).includes('50%'),'o calendário e o simulador usam a mesma taxa')
  await foto('financeiro-tudo',{fullPage:true})
  await page.goto(page.url().split('#')[0]+'#/admin?aba=metas')
  await page.getByRole('heading',{name:/Onde estamos, quanto falta/}).waitFor()
  await page.evaluate(()=>window.scrollTo(0,0))
  await foto('metas-topo')
  await page.getByRole('group',{name:'Objetivo no gráfico'}).getByRole('button',{name:'Recebido',exact:true}).click()
  await page.locator('#mt-caminho').scrollIntoViewIfNeeded()
  await foto('metas-grafico')
  await page.getByText('Entenda os tipos de receita',{exact:false}).click()
  await foto('metas-tudo',{fullPage:true})
  await page.goto(page.url().split('#')[0]+'#/admin?aba=cobrancas')
  await page.getByRole('searchbox',{name:'Buscar pessoa, e-mail ou número do pagamento'}).fill('pessoa196@exemplo.test')
  if(process.env.OQ_VAZIO!=='1') assert.match(await page.locator('.a3-extrato-topo .a3-metrica__valor').innerText(),/39,90/,'totais do extrato acompanham a busca')
  await foto('extrato-filtrado')
  await page.goto(page.url().split('#')[0]+'#/admin?aba=pagamentos')
  if(process.env.OQ_VAZIO!=='1'){
    await page.getByRole('button',{name:/Primeiro evento de exemplo/}).click()
    assert.equal(await page.getByLabel('Referência do pagamento',{exact:true}).inputValue(),'111111')
    await page.getByLabel('Nota',{exact:true}).fill('Nota do primeiro evento')
    await page.getByRole('button',{name:/Segundo evento de exemplo/}).click()
    assert.equal(await page.getByLabel('Referência do pagamento',{exact:true}).inputValue(),'222222')
    assert.equal(await page.getByLabel('Nota',{exact:true}).inputValue(),'')
  }
  await foto('avisos')
  for(const largura of (nome==='pc'?[768,1024,1440,1920]:[320,390])){
    await page.setViewportSize({width:largura,height:900})
    for(const aba of ['crescimento','financeiro','metas']){
      await page.goto(page.url().split('#')[0]+`#/admin?aba=${aba}`)
      await page.locator('.ng-cabeca h1, .hb-cabeca h1').first().waitFor()
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
      if(overflow) console.log(await page.evaluate(()=>[...document.querySelectorAll('.ng *, .hb *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'}).slice(0,12).map(e=>({tag:e.tagName,classe:e.className,texto:e.textContent.slice(0,80),largura:e.getBoundingClientRect().width}))))
      assert.equal(overflow,false,`${aba}: sem transbordamento em ${largura}px`)
    }
  }
  assert.deepEqual(erros,[])
  console.log(`Negócio ${nome}: filtros, dados, teclado, pessoas, metas, anotações, atualização e larguras ok.`)
}
