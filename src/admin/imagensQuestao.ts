import type { Imagem } from '../dados/tipos'
import { enviarImagemQuestao } from '../servicos/supabase'

/**
 * Imagens das questões enviadas pelo administrador: do editor do painel e do
 * atalho "Foto no comentário" do site. Aceita arquivo, Ctrl+V (inclusive
 * "Copiar imagem" do Google) e arrastar de uma pasta ou de outra aba.
 * Tudo é reduzido e convertido para WebP antes de subir.
 */

const LADO_MAXIMO = 1800
const LIMITE = 5 * 1024 * 1024

/** Uma imagem escolhida, ainda no aparelho. `fonte` vem do endereço quando chega por link. */
export interface ImagemLocal { arquivo: File; fonte?: string | null }

/** Reduz e converte para WebP (ou JPEG) antes do envio; GIF segue como está. */
export async function prepararImagem(arquivo: Blob, nome = 'imagem'): Promise<{ blob: Blob; extensao: string; largura: number | null; altura: number | null }> {
  if (arquivo.type === 'image/gif') return { blob: arquivo, extensao: 'gif', largura: null, altura: null }
  const endereco = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = endereco
    await img.decode().catch(() => { throw new Error(`Não consegui abrir "${nome}". Tente salvar como JPG ou PNG.`) })
    const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
    const tela = document.createElement('canvas')
    tela.width = Math.max(1, Math.round(img.naturalWidth * escala)); tela.height = Math.max(1, Math.round(img.naturalHeight * escala))
    const ctx = tela.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tela.width, tela.height); ctx.drawImage(img, 0, 0, tela.width, tela.height)
    const gerar = (tipo: string) => new Promise<Blob | null>(ok => tela.toBlob(ok, tipo, 0.86))
    const medidas = { largura: tela.width, altura: tela.height }
    const webp = await gerar('image/webp')
    if (webp && webp.type === 'image/webp') return { blob: webp, extensao: 'webp', ...medidas }
    const jpeg = await gerar('image/jpeg')
    if (!jpeg) throw new Error('Seu navegador não conseguiu converter a imagem.')
    return { blob: jpeg, extensao: 'jpg', ...medidas }
  } finally { URL.revokeObjectURL(endereco) }
}

const nomeSeguro = (nome: string) => nome.toLowerCase().normalize('NFKD').replace(/\.[^.]*$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'imagem'

/** Reduz e envia ao Storage; devolve as imagens prontas para gravar na edição. */
export async function enviarImagens(locais: ImagemLocal[], idQuestao: string, pasta: string): Promise<Imagem[]> {
  const novas: Imagem[] = []
  for (const { arquivo, fonte } of locais) {
    const { blob, extensao, largura, altura } = await prepararImagem(arquivo, arquivo.name)
    if (blob.size > LIMITE) throw new Error(`"${arquivo.name}" passa de 5 MB mesmo depois de reduzida.`)
    const endereco = await enviarImagemQuestao(`${idQuestao}/${pasta}/${Date.now()}-${nomeSeguro(arquivo.name)}.${extensao}`, blob)
    novas.push({ arquivo: endereco, legenda: null, ...(fonte ? { fonte } : {}), ...(largura && altura ? { largura, altura } : {}) })
  }
  return novas
}

/** Baixa a imagem de um endereço (ou data:). Muitos sites bloqueiam: aí a mensagem ensina o caminho que funciona. */
async function baixar(endereco: string): Promise<ImagemLocal> {
  const ehDados = endereco.startsWith('data:')
  try {
    const resposta = await fetch(endereco, ehDados ? undefined : { mode: 'cors', referrerPolicy: 'no-referrer' })
    if (!resposta.ok) throw new Error(String(resposta.status))
    const blob = await resposta.blob()
    if (!blob.type.startsWith('image/')) throw new Error('nao_imagem')
    const nome = ehDados ? 'colada' : decodeURIComponent(new URL(endereco).pathname.split('/').pop() || 'imagem')
    return { arquivo: new File([blob], nome, { type: blob.type }), fonte: ehDados ? null : endereco }
  } catch {
    throw new Error('Esse site não deixa baixar a imagem pelo link. No Google, clique com o botão direito na imagem, escolha "Copiar imagem" e cole aqui (Ctrl+V).')
  }
}

const ENDERECO = /^(https?:\/\/|data:image\/)/i

/** Tira as imagens de um colar ou de um arrastar: arquivos primeiro; senão, o endereço da imagem. */
export async function imagensDaTransferencia(dados: DataTransfer | null): Promise<ImagemLocal[]> {
  if (!dados) return []
  const arquivos = Array.from(dados.files).filter(f => f.type.startsWith('image/'))
  if (!arquivos.length) {
    for (const item of Array.from(dados.items ?? [])) {
      const f = item.kind === 'file' && item.type.startsWith('image/') ? item.getAsFile() : null
      if (f) arquivos.push(f)
    }
  }
  // Ao colar uma imagem copiada, o navegador costuma dar o nome genérico "image.png".
  if (arquivos.length) return arquivos.map(f => ({ arquivo: f, fonte: fonteDoHtml(dados) }))
  const html = dados.getData('text/html')
  const doHtml = html ? new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src') : null
  const texto = (dados.getData('text/uri-list') || dados.getData('text/plain')).split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#'))
  const endereco = [doHtml, texto].find(e => e && ENDERECO.test(e))
  return endereco ? [await baixar(endereco)] : []
}

/** Copiando do navegador, o HTML junto traz o endereço da imagem: vira a fonte, editável depois. */
function fonteDoHtml(dados: DataTransfer): string | null {
  const html = dados.getData('text/html')
  if (!html) return null
  const src = new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src') ?? ''
  // Miniatura do Google (gstatic) não é a fonte de verdade: melhor deixar em branco.
  return /^https?:\/\//i.test(src) && !/gstatic\.com|googleusercontent\.com/i.test(src) ? src : null
}
