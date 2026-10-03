// Sprites em pixel art desenhados por mapa de caracteres (cada letra é uma cor da paleta).
// Uso no HTML: <div data-sprite="heroi" data-escala="12"></div>
const PALETA = {
  K: '#1b1208', S: '#9eacb1', s: '#5f6d72', W: '#e9f0f2', R: '#d33a3a', r: '#8f1d1d',
  G: '#f5cd6b', g: '#946512', P: '#f2c08a', p: '#c98a5a', T: '#14655e', t: '#0b3a35',
  B: '#7a4220', b: '#4a2a14', E: '#3a2a2e', D: '#5b8fd8', d: '#1d3a7a', V: '#2f9a86',
}
const SPRITES = {
  heroi: [
    '..........RR..........',
    '.........RRrR.........',
    '........RRr.....K.....',
    '......KKKKKK...KWK....',
    '.....KWSSSSSK..KWK....',
    '.....KSSSSSSK..KWK....',
    '.....KKKKKKKK..KWK....',
    '.....KSKPPKSK..KWK....',
    '.....KSSSSSsK..KWK....',
    '......KsssssK..KWK....',
    '....KKKKTTKKKKKKWKK...',
    '...KddKTTGTTKSSKGGGK..',
    '..KdDDdKTGTTKSKPPGK...',
    '..KDDGDdKTTTKSKPPK....',
    '..KDGGGDKTTTTKKKK.....',
    '..KDDGDdKTTTTTK.......',
    '..KdDDdKggGggGK.......',
    '...KddKTTTTTTTK.......',
    '....KKKTTTKTTTK.......',
    '......KSSsKSSsK.......',
    '......KSSsKSSsK.......',
    '......KbBBKbBBK.......',
    '.....KbBBBKbBBBK......',
    '.....KKKKKKKKKKK......',
  ],
  coracao: ['.KK...KK.', 'KRRK.KRRK', 'KRWRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....'],
  meio: ['.KK...KK.', 'KRRK.KEEK', 'KRWRKEEEK', 'KRRRKEEEK', '.KRRKEEK.', '..KRKEK..', '...KKK...', '....K....'],
  vazio: ['.KK...KK.', 'KEEK.KEEK', 'KEEEKEEEK', 'KEEEEEEEK', '.KEEEEEK.', '..KEEEK..', '...KEK...', '....K....'],
  espada: ['......KK', '.....KWK', '....KWK.', 'K..KWK..', 'KK KWK...', '.KGKK....', '.KgK.....', 'KK.KK....'],
}
function sprite(nome, escala) {
  const linhas = SPRITES[nome]
  const w = Math.max(...linhas.map(l => l.length)), h = linhas.length
  let r = ''
  linhas.forEach((l, y) => [...l].forEach((c, x) => { if (PALETA[c]) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PALETA[c]}"/>` }))
  return `<svg viewBox="0 0 ${w} ${h}" width="${w * escala}" height="${h * escala}" shape-rendering="crispEdges">${r}</svg>`
}
// Arco do pé como ponte de pedras: altura (0 a 1) cai a cada fase.
function arco(altura, larg = 40, escala = 10) {
  const H = 14, pedras = []
  for (let x = 0; x < larg; x++) {
    const t = x / (larg - 1), topo = Math.round(H - 2 - Math.sin(Math.PI * t) * (H - 4) * altura)
    for (let y = topo; y < topo + 3; y++) pedras.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${(x + y) % 4 === 0 ? '#5f6d72' : y === topo ? '#d4dde0' : '#9eacb1'}"/>`)
  }
  pedras.push(`<rect x="0" y="${H}" width="${larg}" height="2" fill="#4a3418"/><rect x="0" y="${H}" width="${larg}" height="1" fill="#9c7a45"/>`)
  return `<svg viewBox="0 0 ${larg} ${H + 2}" width="${larg * escala}" height="${(H + 2) * escala}" shape-rendering="crispEdges">${pedras.join('')}</svg>`
}
document.querySelectorAll('[data-sprite]').forEach(el => { el.innerHTML = sprite(el.dataset.sprite, +(el.dataset.escala || 8)) })
document.querySelectorAll('[data-arco]').forEach(el => { el.innerHTML = arco(+el.dataset.arco, 40, +(el.dataset.escala || 10)) })
document.querySelectorAll('[data-vida]').forEach(el => {
  const v = +el.dataset.vida, e = +(el.dataset.escala || 6)
  el.innerHTML = [0, 1, 2, 3].map(i => sprite(v >= i + 1 ? 'coracao' : v >= i + 0.5 ? 'meio' : 'vazio', e)).join('')
})
