import { LADO_MAXIMO, medidaReduzida } from './suporte'

/** Uma imagem pronta para o suporte: a prévia para a tela e o conteúdo para o e-mail. */
export interface ImagemSuporte { id: string; nome: string; tipo: 'image/jpeg' | 'image/png'; base64: string; previa: string; bytes: number }

/**
 * Reduz a imagem no próprio aparelho antes de enviar (03/11/2026): lado maior de até 1600 px.
 * Print pequeno continua PNG (texto nítido); foto ou print grande vira JPG. Funciona com
 * arquivo escolhido, arrastado ou colado (Ctrl+V).
 */
export async function prepararImagem(arquivo: File): Promise<ImagemSuporte> {
  if (!arquivo.type.startsWith('image/')) throw new Error('nao_e_imagem')
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const i = new Image()
      i.onload = () => resolver(i)
      i.onerror = () => rejeitar(new Error('nao_abriu'))
      i.src = url
    })
    const { largura, altura } = medidaReduzida(img.naturalWidth, img.naturalHeight, LADO_MAXIMO)
    const tela = document.createElement('canvas')
    tela.width = largura; tela.height = altura
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('nao_abriu')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, largura, altura)
    ctx.drawImage(img, 0, 0, largura, altura)
    let tipo: ImagemSuporte['tipo'] = 'image/png'
    let dados = tela.toDataURL(tipo)
    if (dados.length > 900_000) { tipo = 'image/jpeg'; dados = tela.toDataURL(tipo, 0.85) }
    const base64 = dados.slice(dados.indexOf(',') + 1)
    const nome = (arquivo.name && arquivo.name !== 'image.png' ? arquivo.name : 'print').slice(0, 60)
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, nome, tipo, base64, previa: dados, bytes: Math.floor(base64.length * 3 / 4) }
  } finally {
    URL.revokeObjectURL(url)
  }
}
