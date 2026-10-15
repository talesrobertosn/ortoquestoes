import { useEffect, useRef, useState } from 'react'
import { carregarCenarioPintado } from '../efeitos/cenariosPintados'
import { HORAS_BIBLIOTECA } from '../biblioteca/horas'
import { Cenario } from './Cenario'

/**
 * O fundo da sessão da Biblioteca, que muda de hora com os acertos (biblioteca/horas.ts).
 * Fica por cima do cenário da arena e por baixo de tudo o mais. A hora nova só entra
 * quando a pintura já carregou (nada de piscar o desenho provisório) e chega num
 * esmaecimento lento; com efeitos reduzidos, a troca é imediata. A próxima hora é
 * pré-carregada para a transição não esperar a rede.
 */
export function FundoBiblioteca({ indice, reduzido }: { indice: number; reduzido: boolean }) {
  const [camadas, definirCamadas] = useState<Array<{ indice: number; chave: number }>>([])
  const contador = useRef(0)
  useEffect(() => {
    let vivo = true
    const hora = HORAS_BIBLIOTECA[indice]
    void carregarCenarioPintado(hora.pintura).then((ok) => {
      if (!vivo || !ok) return
      contador.current++
      // fica no máximo a anterior (esmaecendo) e a nova
      definirCamadas((v) => (v[v.length - 1]?.indice === indice ? v : [...v.slice(-1), { indice, chave: contador.current }]))
    })
    const proxima = HORAS_BIBLIOTECA[indice + 1]
    if (proxima) void carregarCenarioPintado(proxima.pintura)
    return () => { vivo = false }
  }, [indice])
  // a de baixo sai depois que a de cima terminou de aparecer
  useEffect(() => {
    if (camadas.length < 2) return
    const t = window.setTimeout(() => definirCamadas((v) => v.slice(-1)), reduzido ? 0 : 1900)
    return () => window.clearTimeout(t)
  }, [camadas, reduzido])
  return (
    <div className={`fc-fundo-estudo${reduzido ? ' fc-fundo-estudo--parado' : ''}`} aria-hidden="true">
      {camadas.map((c, i) => (
        <div key={c.chave} className="fc-fundo-estudo__hora" data-hora={HORAS_BIBLIOTECA[c.indice].id}>
          <Cenario cena="biblioteca" pintura={HORAS_BIBLIOTECA[c.indice].pintura} reduzido={reduzido || i < camadas.length - 1} />
        </div>
      ))}
    </div>
  )
}
