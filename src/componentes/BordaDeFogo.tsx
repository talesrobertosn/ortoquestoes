import type { CSSProperties } from 'react'
import { urlCss } from '../config'
import '../estilos/componentes/BordaDeFogo.css'

/**
 * O botão pegando fogo (Tales, 10/11/2026: "faça o botão pegar fogo", no lugar do halo borrado): uma fileira de
 * chamas em pixel (a folha do fogo da sequência, public/pixel/inicio/fogo.png) queimando na borda de cima, brasas
 * subindo e o clarão por baixo. O pai precisa de `position: relative` e `isolation: isolate`; é só enfeite.
 */
export function BordaDeFogo({ chamas = 7 }: { chamas?: number }) {
  return (
    <span className="fogo-borda" aria-hidden="true" style={{ '--sprite-fogo': urlCss('pixel/inicio/fogo.png') } as CSSProperties}>
      {Array.from({ length: chamas }, (_, i) => {
        // As do meio são mais altas; as das pontas, menores. O atraso tira o compasso.
        const meio = 1 - Math.abs((i + 0.5) / chamas - 0.5) * 2
        return <i key={i} style={{ '--x': `${((i + 0.5) / chamas) * 100}%`, '--s': 0.62 + meio * 0.5 + (i % 2) * 0.1, '--d': `${-((i * 0.29) % 0.75)}s`, '--linha': i % 3 === 1 ? 4 : 3 } as CSSProperties} />
      })}
      {Array.from({ length: 5 }, (_, i) => <b key={i} style={{ '--x': `${10 + i * 20}%`, '--d': `${i * 0.55}s` } as CSSProperties} />)}
    </span>
  )
}
