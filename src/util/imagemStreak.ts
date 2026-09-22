import { SITE } from '../config'
import { MARCOS_STREAK } from '../estado/streak'

const LADO = 1080

/** Símbolo do OrtoQuestões (direção B, ver src/marca/Simbolo.tsx) desenhado
 * direto no canvas: um círculo com um fio de Kirschner atravessando. */
function desenharSelo(ctx: CanvasRenderingContext2D, x: number, y: number, tamanho: number, cor: string) {
  const escala = tamanho / 32
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(escala, escala)
  ctx.strokeStyle = cor
  ctx.lineWidth = 3.3
  ctx.beginPath()
  ctx.arc(14, 14, 9.6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = cor
  ctx.fill(new Path2D('M14.37 16.63 16.63 14.37 24.63 22.37 26.2 26.2 22.37 24.63Z'))
  ctx.restore()
}

const LEGENDAS = ['Estudando ortopedia todos os dias', 'Questão por questão, dia após dia', 'Constância que vira resultado', 'Um pouco todo dia, sem pular nenhum']

const FONTE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Retângulo arredondado como caminho, para cápsulas e quadradinhos da semana. */
function caminhoArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + l, y, x + l, y + a, r)
  ctx.arcTo(x + l, y + a, x, y + a, r)
  ctx.arcTo(x, y + a, x, y, r)
  ctx.arcTo(x, y, x + l, y, r)
  ctx.closePath()
}

/**
 * Desenha o cartão de sequência (1080×1080, formato de post) num canvas e
 * devolve um PNG pronto para baixar ou compartilhar. O centro é um anel
 * dourado que enche rumo ao próximo marco (cheio quando o marco é hoje), e
 * embaixo a semana aparece em sete quadradinhos.
 */
export async function gerarImagemStreak(dias: number): Promise<Blob> {
  const tela = document.createElement('canvas')
  tela.width = LADO
  tela.height = LADO
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  const branco = '#ffffff'
  const suave = 'rgba(255,255,255,0.72)'
  const ouroClaro = '#ffe3a3'
  const ouro = '#e8b34f'

  const fundo = ctx.createLinearGradient(0, 0, LADO, LADO)
  fundo.addColorStop(0, '#0a332f')
  fundo.addColorStop(0.55, '#14655e')
  fundo.addColorStop(1, '#1f8676')
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LADO, LADO)

  // Círculos concêntricos no canto e brilho atrás do anel: profundidade sem ruído.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 2
  for (const raio of [260, 360, 460]) { ctx.beginPath(); ctx.arc(LADO, 0, raio, 0, Math.PI * 2); ctx.stroke() }
  const brilho = ctx.createRadialGradient(LADO / 2, 470, 60, LADO / 2, 470, 420)
  brilho.addColorStop(0, 'rgba(255,227,163,0.16)')
  brilho.addColorStop(1, 'rgba(255,227,163,0)')
  ctx.fillStyle = brilho
  ctx.fillRect(0, 0, LADO, LADO)

  // Topo: marca à esquerda, etiqueta à direita.
  desenharSelo(ctx, 80, 78, 46, branco)
  ctx.fillStyle = branco
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `800 38px ${FONTE}`
  ctx.fillText('Orto', 138, 102)
  const larguraOrto = ctx.measureText('Orto').width
  ctx.font = `400 38px ${FONTE}`
  ctx.fillText('Questões', 138 + larguraOrto, 102)
  ctx.font = `700 24px ${FONTE}`
  const etiqueta = 'SEQUÊNCIA DE ESTUDO'
  const larguraEtiqueta = ctx.measureText(etiqueta).width + 48
  caminhoArredondado(ctx, LADO - 80 - larguraEtiqueta, 78, larguraEtiqueta, 48, 24)
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = ouroClaro
  ctx.textAlign = 'center'
  ctx.fillText(etiqueta, LADO - 80 - larguraEtiqueta / 2, 103)

  // Anel de progresso rumo ao próximo marco.
  const cx = LADO / 2, cy = 480, raio = 250
  const proximo = MARCOS_STREAK.find((m) => m > dias) ?? null
  const bateuMarco = (MARCOS_STREAK as readonly number[]).includes(dias)
  const fracao = bateuMarco || !proximo ? 1 : Math.max(0.04, dias / proximo)
  ctx.lineCap = 'round'
  ctx.lineWidth = 34
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath(); ctx.arc(cx, cy, raio, 0, Math.PI * 2); ctx.stroke()
  const inicio = -Math.PI / 2, fim = inicio + fracao * Math.PI * 2
  const gradiente = ctx.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio)
  gradiente.addColorStop(0, ouroClaro)
  gradiente.addColorStop(1, ouro)
  ctx.strokeStyle = gradiente
  ctx.shadowColor = 'rgba(232,179,79,0.55)'
  ctx.shadowBlur = 30
  ctx.beginPath(); ctx.arc(cx, cy, raio, inicio, fim); ctx.stroke()
  ctx.shadowBlur = 0
  // Ponto de luz na ponta do arco.
  ctx.fillStyle = '#fff6df'
  ctx.beginPath(); ctx.arc(cx + raio * Math.cos(fim), cy + raio * Math.sin(fim), 9, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = branco
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `800 ${dias >= 100 ? 190 : 230}px ${FONTE}`
  ctx.fillText(String(dias), cx, cy + 70)
  ctx.font = `600 44px ${FONTE}`
  ctx.fillStyle = suave
  ctx.fillText(dias === 1 ? 'dia seguido' : 'dias seguidos', cx, cy + 140)

  // Frase e a semana em sete quadradinhos.
  ctx.font = `600 38px ${FONTE}`
  ctx.fillStyle = branco
  ctx.fillText(LEGENDAS[dias % LEGENDAS.length], cx, 832)
  const lado = 52, espaco = 18, total = 7 * lado + 6 * espaco
  const preenchidos = Math.min(7, dias)
  for (let i = 0; i < 7; i++) {
    const x = cx - total / 2 + i * (lado + espaco), y = 870
    caminhoArredondado(ctx, x, y, lado, lado, 14)
    const cheio = i >= 7 - preenchidos
    ctx.fillStyle = cheio ? ouro : 'rgba(255,255,255,0.1)'
    ctx.fill()
    if (cheio) {
      ctx.strokeStyle = '#0a332f'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(x + 15, y + 27); ctx.lineTo(x + 23, y + 35); ctx.lineTo(x + 38, y + 18); ctx.stroke()
    }
  }

  // Rodapé: próximo marco à esquerda, Instagram à direita.
  ctx.font = `500 28px ${FONTE}`
  ctx.fillStyle = suave
  ctx.textAlign = 'left'
  ctx.fillText(proximo && !bateuMarco ? `Próximo marco: ${proximo} dias` : `Marco de ${dias} dias alcançado`, 80, 1010)
  ctx.textAlign = 'right'
  ctx.fillText(`@${SITE.instagramUsuario}`, LADO - 80, 1010)

  return await new Promise<Blob>((resolver, rejeitar) => {
    tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Falha ao gerar imagem'))), 'image/png')
  })
}
