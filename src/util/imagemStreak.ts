import { CAMINHOS } from '../componentes/Icone'
import { SITE } from '../config'

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

/** Ícones do site são desenhados a traço (sem preenchimento) — reproduz isso
 * aqui para a chama sair igual à que aparece no resto da interface. */
function desenharIcone(ctx: CanvasRenderingContext2D, nome: keyof typeof CAMINHOS, x: number, y: number, tamanho: number, cor: string) {
  const escala = tamanho / 24
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(escala, escala)
  ctx.strokeStyle = cor
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(CAMINHOS[nome]))
  ctx.restore()
}

/**
 * Desenha o cartão de sequência (1080×1080, formato de post) num canvas e
 * devolve um PNG pronto para baixar ou compartilhar. Tudo desenhado na hora
 * — nada de captura de tela, então funciona igual claro ou escuro.
 */
export async function gerarImagemStreak(dias: number): Promise<Blob> {
  const tela = document.createElement('canvas')
  tela.width = LADO
  tela.height = LADO
  const ctx = tela.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  const grafite = '#12181a'
  const verdete = '#14655e'
  const verdeteTinta = '#0f4f49'
  const porcelana = '#f1f3f2'

  const fundo = ctx.createLinearGradient(0, 0, LADO, LADO)
  fundo.addColorStop(0, verdeteTinta)
  fundo.addColorStop(1, verdete)
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, LADO, LADO)

  // Auréola sutil atrás da chama, só para dar profundidade ao centro.
  const auréola = ctx.createRadialGradient(LADO / 2, 430, 40, LADO / 2, 430, 420)
  auréola.addColorStop(0, 'rgba(255,255,255,0.16)')
  auréola.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = auréola
  ctx.fillRect(0, 0, LADO, LADO)

  desenharIcone(ctx, 'fogo', LADO / 2 - 90, 190, 180, '#ffd166')

  ctx.textAlign = 'center'
  ctx.fillStyle = porcelana
  ctx.font = '700 260px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(String(dias), LADO / 2, 660)

  ctx.font = '600 54px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillText(dias === 1 ? 'dia seguido' : 'dias seguidos', LADO / 2, 730)

  ctx.font = '400 32px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = 'rgba(241,243,242,0.85)'
  ctx.fillText('estudando ortopedia todo dia', LADO / 2, 800)

  // Rodapé: selo + nome do site, e o Instagram como assinatura de quem compartilha.
  ctx.fillStyle = porcelana
  desenharSelo(ctx, LADO / 2 - 220, 940, 40, porcelana)
  ctx.font = '700 40px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(SITE.nome, LADO / 2 - 170, 954)

  ctx.textAlign = 'center'
  ctx.font = '400 30px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = 'rgba(241,243,242,0.75)'
  ctx.fillText(`@${SITE.instagramUsuario}`, LADO / 2, 1010)

  ctx.strokeStyle = grafite
  return await new Promise<Blob>((resolver, rejeitar) => {
    tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('Falha ao gerar imagem'))), 'image/png')
  })
}
