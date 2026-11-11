import { useEffect, useRef } from 'react'
import type { Motor } from '../motor/Motor'

const MAXIMO = 28

/**
 * Nomes que acompanham o modelo (como nos atlas de bancada): um rótulo no centro de cada estrutura
 * isolada (visualização pronta, sistema aberto, relações). A posição é atualizada direto no DOM a cada
 * quadro desenhado, sem renderizar o React de novo; rótulos atrás da câmera somem.
 */
export function Rotulos({ motor, ids, nome }: { motor: Motor; ids: string[]; nome: (id: string) => string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const chave = ids.slice(0, MAXIMO).join('|')
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    el.replaceChildren()
    const vistos = new Set<string>()
    const itens = ids.slice(0, MAXIMO).flatMap((id) => {
      const c = motor.centroDe(id)
      const texto = nome(id)
      // o mesmo nome dos dois lados aparece uma vez só (o lado mais perto da câmera é escolhido a cada quadro)
      const d = document.createElement('span')
      d.className = 'at-rotulo'
      d.textContent = texto
      el.appendChild(d)
      vistos.add(texto)
      return c ? [{ c, d, texto }] : []
    })
    const atualizar = () => {
      const largura = el.clientWidth, altura = el.clientHeight
      // posição e distância de cada rótulo; o mesmo nome dos dois lados fica com o mais perto da câmera
      const melhor = new Map<string, { it: (typeof itens)[number]; x: number; y: number; z: number }>()
      for (const it of itens) {
        const t = motor.naTela(it.c)
        it.d.style.transform = `translate(${Math.round(t.x)}px, ${Math.round(t.y)}px) translate(-50%, -50%)`
        const fora = t.atras || t.x < -40 || t.y < -20 || t.x > largura + 40 || t.y > altura + 20
        if (fora) continue
        const z = motor.camera.position.distanceTo(it.c)
        const atual = melhor.get(it.texto)
        if (!atual || z < atual.z) melhor.set(it.texto, { it, x: t.x, y: t.y, z })
      }
      // sem amontoar: do mais perto ao mais longe, um rótulo só entra se não cobrir outro já posto
      const postos: { x0: number; y0: number; x1: number; y1: number }[] = []
      const visiveis = new Set<HTMLElement>()
      for (const m of [...melhor.values()].sort((a, b) => a.z - b.z)) {
        const w = (m.it.d.offsetWidth || 80) / 2 + 3, h = (m.it.d.offsetHeight || 18) / 2 + 2
        const r = { x0: m.x - w, y0: m.y - h, x1: m.x + w, y1: m.y + h }
        if (postos.some((p) => r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0)) continue
        postos.push(r)
        visiveis.add(m.it.d)
      }
      for (const it of itens) it.d.style.opacity = visiveis.has(it.d) ? '1' : '0'
    }
    atualizar()
    return motor.ouvirQuadro(atualizar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor, chave])
  return <div className="at-rotulos" ref={caixa} aria-hidden="true" />
}
