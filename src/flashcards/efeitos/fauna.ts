import { recurso } from '../../config'
import type { Cena, Clima } from './ambiente'

const imagens = new Map<string, HTMLImageElement>()
function imagem(nome: string) {
  let img = imagens.get(nome)
  if (!img) { img = new Image(); img.src = recurso(`flashcards/animais/${nome}.png`); imagens.set(nome, img) }
  return img.complete && img.naturalWidth ? img : null
}

/** Reutiliza o quadro do ambiente; não cria timer nem altera o estado da partida. */
export function pintarFauna(c: CanvasRenderingContext2D, cena: Cena, clima: Clima, t: number, w: number, h: number, dpr: number) {
  if ((cena !== 'campo' && cena !== 'jardim') || clima === 'chuva') return
  const s = Math.max(1, Math.round(dpr * (w / dpr < 600 ? 1 : 2)))
  const desenhar = (nome: string, x: number, y: number, quadro: number, angulo = 0) => {
    const img = imagem(nome)
    if (!img) return
    c.save(); c.imageSmoothingEnabled = false
    c.translate(Math.round(x), Math.round(y)); c.rotate(angulo)
    c.drawImage(img, (quadro % 2) * 32, 0, 32, 24, -16*s, -12*s, 32*s, 24*s)
    c.restore()
  }
  if (clima !== 'noite') {
    desenhar('passaro', ((t*.035+.1)%1.2-.1)*w, h*.18+Math.sin(t*1.5)*6*s, Math.floor(t*5))
    const salto = Math.max(0, Math.sin(t*2.2)) * 4*s
    desenhar('coelho', w*.07+Math.sin(t*.35)*w*.018, h*.89-salto, Math.floor(t*2.2))
  }
  if (cena === 'jardim') {
    // Mesma projeção das camadas pintadas; o peixe precisa sair do lago.
    const cssW=w/dpr, cssH=h/dpr, retrato=cssH>cssW*1.05
    const iw=retrato?250:520, ih=retrato?470:330
    const escala=Math.max(2,Math.ceil(Math.max(cssW/iw,cssH/ih)-.02))
    const W=Math.ceil(cssW/escala),H=Math.ceil(cssH/escala)
    const ox=Math.round((W-iw)/2),oy=Math.round((H-ih)*.55)
    const px=(ox+iw*(retrato?.24:.27))*w/W
    const py=(oy+ih*(retrato?.4:.48))*h/H
    const fase=t%9
    if(fase<1.4){
      const arco=Math.sin(fase/1.4*Math.PI)
      desenhar('peixe',px+fase*12*s,py-arco*22*s,Math.floor(t*4),-.4+fase*.6)
    }
  }
}
