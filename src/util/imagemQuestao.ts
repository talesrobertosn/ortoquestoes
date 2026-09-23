import type { Questao } from '../dados/tipos'
import { FONTE, caminhoArredondado, desenharSelo } from './imagemStreak'

const LARGURA = 1080
const ALTURA = 1350
const MARGEM = 72

const branco = '#ffffff'
const suave = 'rgba(255,255,255,0.74)'
const ouroClaro = '#ffe3a3'
const tinta = '#14201e'
const tinta2 = '#4d5b58'
const verde = '#14655e'
const acerto = '#1f7a4d'

/** Tira a marcação editorial (negrito, grifo, subtítulos, listas) para texto corrido. */
function textoPuro(texto: string): string {
  return texto
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = []
  for (const paragrafo of texto.split('\n')) {
    let linha = ''
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = linha ? linha + ' ' + palavra : palavra
      if (ctx.measureText(tentativa).width > largura && linha) { linhas.push(linha); linha = palavra }
      else linha = tentativa
    }
    if (linha) linhas.push(linha)
  }
  return linhas
}

function fundo(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, LARGURA, ALTURA)
  g.addColorStop(0, '#0a332f')
  g.addColorStop(0.55, '#14655e')
  g.addColorStop(1, '#1f8676')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LARGURA, ALTURA)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 2
  for (const raio of [260, 360, 460]) { ctx.beginPath(); ctx.arc(LARGURA, 0, raio, 0, Math.PI * 2); ctx.stroke() }
}

function topo(ctx: CanvasRenderingContext2D, etiqueta: string) {
  desenharSelo(ctx, MARGEM, 66, 46, branco)
  ctx.fillStyle = branco
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `800 38px ${FONTE}`
  ctx.fillText('Orto', MARGEM + 58, 90)
  const w = ctx.measureText('Orto').width
  ctx.font = `400 38px ${FONTE}`
  ctx.fillText('Questões', MARGEM + 58 + w, 90)
  ctx.font = `700 24px ${FONTE}`
  const larg = ctx.measureText(etiqueta).width + 48
  caminhoArredondado(ctx, LARGURA - MARGEM - larg, 66, larg, 48, 24)
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = ouroClaro
  ctx.textAlign = 'center'
  ctx.fillText(etiqueta, LARGURA - MARGEM - larg / 2, 91)
}

function rodape(ctx: CanvasRenderingContext2D, esquerda: string, direita: string) {
  ctx.textBaseline = 'alphabetic'
  ctx.font = `600 28px ${FONTE}`
  ctx.fillStyle = suave
  ctx.textAlign = 'left'
  ctx.fillText(esquerda, MARGEM, ALTURA - 64)
  ctx.textAlign = 'right'
  ctx.fillStyle = branco
  ctx.font = `700 28px ${FONTE}`
  ctx.fillText(direita, LARGURA - MARGEM, ALTURA - 64)
}

function cartao(ctx: CanvasRenderingContext2D, y: number, altura: number) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.28)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 14
  caminhoArredondado(ctx, MARGEM, y, LARGURA - 2 * MARGEM, altura, 36)
  ctx.fillStyle = '#fbfcfb'
  ctx.fill()
  ctx.restore()
}

function paraBlob(tela: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, falha) => tela.toBlob((b) => (b ? ok(b) : falha(new Error('Falha ao gerar a imagem'))), 'image/png'))
}

function novaTela() {
  const tela = document.createElement('canvas')
  tela.width = LARGURA
  tela.height = ALTURA
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  return { tela, ctx }
}

/**
 * A pergunta com as alternativas. Com `revelar`, a alternativa correta aparece
 * marcada em verde: é a imagem única, que se explica sozinha para quem chega
 * pelo Instagram sem ter visto o site.
 */
async function slidePergunta(q: Questao, dataTexto: string, revelar = false): Promise<Blob> {
  const { tela, ctx } = novaTela()
  fundo(ctx)
  topo(ctx, 'QUESTÃO DO DIA')

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = ouroClaro
  // O assunto cabe na largura: reduz a fonte e, no limite, corta com reticências.
  let assunto = `${q.tema}${q.subtemas[0] ? ' · ' + q.subtemas[0] : ''}`
  let fonteAssunto = 30
  ctx.font = `700 ${fonteAssunto}px ${FONTE}`
  while (ctx.measureText(assunto).width > LARGURA - 2 * MARGEM && fonteAssunto > 24) { fonteAssunto -= 2; ctx.font = `700 ${fonteAssunto}px ${FONTE}` }
  while (ctx.measureText(assunto).width > LARGURA - 2 * MARGEM) assunto = assunto.slice(0, -2).trimEnd() + '…'
  ctx.fillText(assunto, MARGEM, 200)
  ctx.fillStyle = suave
  ctx.font = `500 26px ${FONTE}`
  ctx.fillText(dataTexto, MARGEM, 240)

  const topoCartao = 280, baseCartao = ALTURA - 190
  const interno = LARGURA - 2 * MARGEM - 2 * 56
  // Maior fonte que ainda cabe no cartão.
  let tamanho = 44, linhasEnunciado: string[] = [], alternativas: string[][] = [], altura = 0
  for (; tamanho >= 26; tamanho -= 2) {
    ctx.font = `600 ${tamanho}px ${FONTE}`
    linhasEnunciado = quebrar(ctx, q.enunciado, interno)
    ctx.font = `400 ${tamanho - 4}px ${FONTE}`
    alternativas = q.alternativas.map((a) => quebrar(ctx, a.texto, interno - 76))
    const alturaLinha = tamanho * 1.36, alturaAlt = (tamanho - 4) * 1.36
    altura = 56 + linhasEnunciado.length * alturaLinha + 36 + alternativas.reduce((n, l) => n + Math.max(l.length * alturaAlt, 56) + 18, 0) + 40
    if (altura <= baseCartao - topoCartao) break
  }
  const alturaCartao = Math.min(baseCartao - topoCartao, altura)
  // Cartão centrado no espaço livre, sem sobrar um vazio embaixo.
  const inicioCartao = topoCartao + Math.max(0, (baseCartao - topoCartao - alturaCartao) / 2)
  cartao(ctx, inicioCartao, alturaCartao)

  let y = inicioCartao + 56 + tamanho
  const x = MARGEM + 56
  ctx.fillStyle = tinta
  ctx.font = `600 ${tamanho}px ${FONTE}`
  for (const linha of linhasEnunciado) { ctx.fillText(linha, x, y); y += tamanho * 1.36 }
  y += 36 - tamanho * 0.36
  const tAlt = tamanho - 4
  q.alternativas.forEach((a, i) => {
    const linhas = alternativas[i]
    const alturaBloco = Math.max(linhas.length * tAlt * 1.36, 56)
    const certa = revelar && a.letra === q.gabarito
    if (certa) {
      caminhoArredondado(ctx, x - 14, y - 10, LARGURA - 2 * MARGEM - 84, alturaBloco + 20, 18)
      ctx.fillStyle = '#e3f3ea'
      ctx.fill()
      ctx.strokeStyle = acerto
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(x + 26, y + 26, 26, 0, Math.PI * 2)
    ctx.fillStyle = certa ? acerto : '#e6f0ee'
    ctx.fill()
    ctx.fillStyle = certa ? branco : verde
    ctx.font = `800 ${Math.min(28, tAlt)}px ${FONTE}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(a.letra, x + 26, y + 27)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = certa ? tinta : tinta2
    ctx.font = `${certa ? 700 : 400} ${tAlt}px ${FONTE}`
    let yl = y + (linhas.length === 1 ? 26 + tAlt * 0.36 : tAlt)
    for (const linha of linhas) { ctx.fillText(linha, x + 76, yl); yl += tAlt * 1.36 }
    y += alturaBloco + 18
  })

  ctx.fillStyle = branco
  ctx.font = `700 34px ${FONTE}`
  ctx.textAlign = 'left'
  ctx.fillText(revelar ? `Gabarito: ${q.gabarito} · comentário completo no site` : 'Qual você marcaria? Gabarito no próximo slide →', MARGEM, ALTURA - 124)
  rodape(ctx, 'ortoquestoes.com.br', '@ortoquestoes')
  return paraBlob(tela)
}

/** Segundo slide: gabarito e o conceito-chave resumido. */
async function slideGabarito(q: Questao, conceito: string | null): Promise<Blob> {
  const { tela, ctx } = novaTela()
  fundo(ctx)
  topo(ctx, 'GABARITO COMENTADO')
  const certa = q.alternativas.find((a) => a.letra === q.gabarito)
  const x = MARGEM + 56, interno = LARGURA - 2 * MARGEM - 112

  // Alternativa correta em destaque.
  ctx.font = `700 40px ${FONTE}`
  const linhasCerta = quebrar(ctx, certa?.texto ?? '', interno - 110)
  const alturaCerta = Math.max(110, 60 + linhasCerta.length * 54)
  cartao(ctx, 200, alturaCerta)
  ctx.beginPath()
  ctx.arc(x + 40, 200 + alturaCerta / 2, 40, 0, Math.PI * 2)
  ctx.fillStyle = acerto
  ctx.fill()
  ctx.fillStyle = branco
  ctx.font = `800 40px ${FONTE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(q.gabarito ?? '', x + 40, 202 + alturaCerta / 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = tinta
  ctx.font = `700 40px ${FONTE}`
  let y = 200 + alturaCerta / 2 - ((linhasCerta.length - 1) * 54) / 2 + 14
  for (const l of linhasCerta) { ctx.fillText(l, x + 110, y); y += 54 }

  // Conceito-chave: o texto inteiro se couber; senão, até onde couber, cortando no fim de uma frase.
  const topoConceito = 200 + alturaCerta + 48
  const base = ALTURA - 190
  ctx.fillStyle = ouroClaro
  ctx.font = `800 26px ${FONTE}`
  ctx.fillText('CONCEITO-CHAVE', MARGEM, topoConceito + 26)
  // Parágrafos inteiros enquanto couberem; se nem o primeiro couber, corta no fim de uma frase.
  const paragrafos = (conceito ?? '').split(/\n\s*\n/).map(textoPuro).filter(Boolean)
  const disponivel = base - topoConceito - 70
  let tamanho = 38, blocos: string[][] = []
  const alturaDe = (bs: string[][], t: number) => bs.reduce((n, b) => n + b.length * t * 1.42, 0) + Math.max(0, bs.length - 1) * t * 0.7
  for (; tamanho >= 32; tamanho -= 2) {
    ctx.font = `400 ${tamanho}px ${FONTE}`
    blocos = []
    for (const p of paragrafos) {
      const linhas = quebrar(ctx, p, LARGURA - 2 * MARGEM)
      if (alturaDe([...blocos, linhas], tamanho) > disponivel) break
      blocos.push(linhas)
    }
    if (blocos.length === paragrafos.length) break
  }
  if (!blocos.length && paragrafos.length) {
    tamanho = 34
    ctx.font = `400 ${tamanho}px ${FONTE}`
    const frases = paragrafos[0].match(/[^.!?]+[.!?]+(\s|$)/g) ?? [paragrafos[0]]
    let texto = ''
    for (const f of frases) {
      const tentativa = (texto + f).trim()
      if (alturaDe([quebrar(ctx, tentativa, LARGURA - 2 * MARGEM)], tamanho) > disponivel) break
      texto = tentativa
    }
    blocos = [quebrar(ctx, texto || paragrafos[0].slice(0, 300) + '…', LARGURA - 2 * MARGEM)]
  }
  ctx.fillStyle = branco
  ctx.font = `400 ${tamanho}px ${FONTE}`
  y = topoConceito + 70 + tamanho
  for (const bloco of blocos) {
    for (const l of bloco) { ctx.fillText(l, MARGEM, y); y += tamanho * 1.42 }
    y += tamanho * 0.7
  }

  ctx.fillStyle = branco
  ctx.font = `700 34px ${FONTE}`
  ctx.fillText('Comentário de cada alternativa no site', MARGEM, ALTURA - 124)
  rodape(ctx, 'ortoquestoes.com.br', '@ortoquestoes')
  return paraBlob(tela)
}

/** Imagem única (4:5): pergunta, alternativas e a correta marcada. */
export function gerarImagemCompletaQuestao(q: Questao, dataTexto: string): Promise<Blob> {
  return slidePergunta(q, dataTexto, true)
}

/** Carrossel para o Instagram (4:5): pergunta e gabarito comentado. */
export async function gerarImagensQuestaoDoDia(q: Questao, conceito: string | null, dataTexto: string): Promise<Blob[]> {
  return [await slidePergunta(q, dataTexto), await slideGabarito(q, conceito)]
}
