// Imagens do Atlas 3D para as páginas públicas (SEO): cenas reais montadas no próprio atlas, com a conta
// assinante de exemplo do capturar_telas.mjs. Uso (Windows, com o Chrome instalado):
//   CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" CENAS_SAIDA=<pasta> \
//   node scripts/capturar_telas.mjs /atlas atlas-seo --roteiro scripts/atlas3d/capturas_seo.mjs --pasta <pasta temporária>
// Grava <CENAS_SAIDA>/<cena>.jpg (1440×900, só no tamanho de computador).
const SAIDA = (process.env.CENAS_SAIDA ?? 'public/atlas3d/telas').replace(/\/?$/, '/')
const espera = (p, ms) => p.waitForTimeout(ms)

/** Fecha o tutorial e os painéis; o modelo fica limpo. */
async function limpar(p) {
  await p.evaluate(() => {
    document.querySelector('[aria-label="Fechar o tutorial"]')?.click()
    if (document.querySelector('.atlas__explorar')) document.querySelector('.at-chip--explorar')?.click()
  })
  await espera(p, 400)
}
async function abrirAtlas(p, rota) {
  await p.goto(p.url().replace(/#.*$/, `#${rota}`))
  await p.reload()
  await espera(p, 7000)
  await p.addStyleTag({ content: '.aviso-termos, .aviso-cookies, vite-error-overlay { display: none !important; }' })
  await limpar(p)
}
const clicar = (p, seletor, texto) => p.evaluate(([s, t]) => { [...document.querySelectorAll(s)].find((b) => new RegExp(t).test(b.textContent))?.click() }, [seletor, texto])
const motor = (p, codigo) => p.evaluate(codigo)
const SO = process.env.CENAS ? new Set(process.env.CENAS.split(',')) : null
async function foto(p, nome) { if (SO && !SO.has(nome)) return; await espera(p, 1600); await p.screenshot({ path: `${SAIDA}${nome}.jpg`, type: 'jpeg', quality: 86 }) }

export default async function (p, _foto, tamanho) {
  if (tamanho !== 'pc') return
  const { mkdirSync } = await import('node:fs')
  mkdirSync(SAIDA, { recursive: true })

  // 1. Plexo braquial (visualização pronta, ombro direito, nomes no modelo)
  await abrirAtlas(p, '/atlas/ombro?lado=d')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-preset', 'Plexo braquial'); await espera(p, 5000)
  await foto(p, 'atlas-3d-plexo-braquial')

  // 2. Manguito rotador
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-preset', 'Manguito rotador'); await espera(p, 4000)
  await motor(p, () => window.__atlas3d.vista('posterior')); await espera(p, 900)
  await foto(p, 'atlas-3d-manguito-rotador')

  // 3. Pivô central e meniscos do joelho
  await abrirAtlas(p, '/atlas/joelho?lado=d')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-preset', 'Pivô central'); await espera(p, 4500)
  await foto(p, 'atlas-3d-joelho-lca-lcp-meniscos')

  // 4. Fêmur proximal: a ficha ortopédica (classificações, questões de anatomia e de fraturas)
  await abrirAtlas(p, '/atlas?e=femur_r&f=proximal')
  await foto(p, 'atlas-3d-femur-proximal-ficha-ortopedica')

  // 4b. Fêmur: áreas de origem e inserção pintadas no osso (aba Inserções)
  await clicar(p, '.at-abas button', 'Inserções'); await espera(p, 500)
  await clicar(p, '.atlas__ficha button', 'Pintar as áreas no osso'); await espera(p, 3500)
  await motor(p, () => window.__atlas3d.vista('posterior')); await espera(p, 1000)
  await foto(p, 'atlas-3d-femur-origem-e-insercao-muscular')

  // 5. Músculo com origem e inserção acesas (bíceps femoral)
  await abrirAtlas(p, '/atlas?e=long_head_of_biceps_femoris_r&c=osso,musculo')
  await motor(p, () => window.__atlas3d.vista('posterior')); await espera(p, 900)
  await foto(p, 'atlas-3d-musculo-origem-insercao-inervacao')

  // 6. Coluna: discos, ligamentos, medula e raízes
  await abrirAtlas(p, '/atlas/coluna')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-preset', 'Disco, ligamentos'); await espera(p, 5000)
  await foto(p, 'atlas-3d-coluna-disco-ligamentos-raizes')

  // 7. Teste-se no joelho, com ossos e músculos
  await abrirAtlas(p, '/atlas/joelho?lado=d&c=osso,musculo')
  await p.evaluate(() => document.querySelector('.at-chip--estudo')?.click()); await espera(p, 3500)
  await clicar(p, '.at-estudo__opcao', '.'); await espera(p, 1200)
  await foto(p, 'atlas-3d-teste-se-anatomia')

  // 8. Corpo inteiro: coração e vasos
  await abrirAtlas(p, '/atlas?m=corpo')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-sistema', 'Coração e vasos'); await espera(p, 7000)
  await foto(p, 'atlas-3d-coracao-e-vasos')

  // 9. Corpo inteiro: coração por dentro (câmaras e valvas, com nomes)
  await clicar(p, '.at-nav__filhos button', '^Coração'); await espera(p, 4000)
  await foto(p, 'atlas-3d-coracao-camaras-e-valvas')

  // 10. Corpo inteiro: órgãos do abdome (digestório)
  await abrirAtlas(p, '/atlas?m=corpo')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-sistema', 'Digestório'); await espera(p, 6000)
  await foto(p, 'atlas-3d-orgaos-sistema-digestorio')

  // 11. Encéfalo e medula
  await abrirAtlas(p, '/atlas?m=corpo')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-sistema', 'Encéfalo e medula'); await espera(p, 7000)
  await motor(p, () => window.__atlas3d.vista('direita')); await espera(p, 900)
  await foto(p, 'atlas-3d-encefalo-e-medula')

  // 13. Músculos do corpo inteiro (de frente)
  await abrirAtlas(p, '/atlas?c=osso,musculo')
  await foto(p, 'atlas-3d-musculos-do-corpo-humano')

  // 14. Ligamentos do tornozelo e do pé, sobre os ossos
  await abrirAtlas(p, '/atlas/tornozelo-pe?lado=d')
  await p.evaluate(() => { const b = [...document.querySelectorAll('.atlas__camadas button')].find((x) => /Ligamentos/.test(x.textContent)); b?.click() }); await espera(p, 5000)
  await motor(p, () => window.__atlas3d.vista('direita')); await espera(p, 900)
  await foto(p, 'atlas-3d-ligamentos-do-tornozelo-e-pe')

  // 15. Nervos e ossos do corpo inteiro
  await abrirAtlas(p, '/atlas')
  await p.evaluate(() => { const b = [...document.querySelectorAll('.atlas__camadas button')].find((x) => /Nervos/.test(x.textContent)); b?.click() }); await espera(p, 5000)
  await foto(p, 'atlas-3d-nervos-e-ossos-do-corpo-humano')

  // 16. Artérias e veias do corpo inteiro
  await abrirAtlas(p, '/atlas')
  await p.evaluate(async () => { for (const n of ['Artérias', 'Veias']) { const b = [...document.querySelectorAll('.atlas__camadas button')].find((x) => x.textContent.includes(n)); b?.click(); await new Promise((r) => setTimeout(r, 400)) } }); await espera(p, 6000)
  await foto(p, 'atlas-3d-arterias-e-veias-do-corpo-humano')

  // 17. Órgãos do tórax e do abdome (Corpo inteiro, região do tronco)
  await abrirAtlas(p, '/atlas/abdome?m=corpo')
  await espera(p, 5000)
  // o omento maior cobre as alças: fora dele, aparecem fígado, estômago, intestinos e baço
  await motor(p, () => { for (const id of ['greater_omentum', 'greater_omentum_r', 'greater_omentum_l']) window.__atlas3d.ocultar(id) }); await espera(p, 900)
  await foto(p, 'atlas-3d-orgaos-do-torax-e-abdome')

  // 18. Sistema respiratório
  await abrirAtlas(p, '/atlas?m=corpo')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-sistema', 'Respiratório'); await espera(p, 6000)
  await foto(p, 'atlas-3d-sistema-respiratorio-pulmoes')

  // 19. Dentes e boca (arcadas, língua, glândulas salivares) para a odontologia
  await abrirAtlas(p, '/atlas/cabeca-pescoco?m=corpo')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 400)
  await clicar(p, '.at-sistema', 'Dentes'); await espera(p, 6000)
  await motor(p, () => window.__atlas3d.vista('direita')); await espera(p, 900)
  await foto(p, 'atlas-3d-dentes-e-boca-odontologia')

  // 12. Esqueleto inteiro, a abertura do atlas
  await abrirAtlas(p, '/atlas')
  await p.evaluate(() => document.querySelector('.at-chip--explorar')?.click()); await espera(p, 600)
  await foto(p, 'atlas-3d-esqueleto-humano-regioes')
}
