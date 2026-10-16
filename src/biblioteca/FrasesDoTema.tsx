import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { recurso } from '../config'
import { Icone } from '../componentes/Icone'
import { usarPremium } from '../conta/premium'
import type { DadosResumao, FocoResumao } from '../dados/resumao'
import { href } from '../util/rotas'

let dados: Promise<DadosResumao | null> | null = null
const carregar = () => (dados ??= fetch(recurso('acervo/resumao.json')).then((r) => (r.ok ? r.json() as Promise<DadosResumao> : null)).catch(() => { dados = null; return null }))

/** Quem não assina vê esta quantidade de frases do adendo, como amostra. */
const AMOSTRA = 2
/** O adendo é pequeno: mostra estas primeiro e o resto só se a pessoa pedir. */
const CURTO = 5

const comNegrito = (t: string): ReactNode => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>)

/**
 * Adendo pequeno no fim do resumo (pedido do Tales, 16/10/2026: o Resumão virou adendo da Biblioteca):
 * as frases "Na prova" dos assuntos que o capítulo ensina, para reler em minutos. A lista completa,
 * de todas as áreas, fica em #/resumos/frases.
 */
export function FrasesDoTema({ subtemas }: { subtemas: string[] }) {
  const { premium } = usarPremium()
  const [focos, definir] = useState<FocoResumao[] | null>(null)
  const [tudo, definirTudo] = useState(false)
  useEffect(() => {
    let vivo = true
    const alvo = new Set(subtemas)
    carregar().then((d) => { if (vivo) definir(d ? d.areas.flatMap((a) => a.focos).filter((f) => alvo.has(f.nome) && f.frases.length) : []) })
    return () => { vivo = false }
  }, [subtemas.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!focos?.length) return null
  const todas = focos.flatMap((f) => f.frases.map((fr) => ({ ...fr, foco: f.nome })))
  const liberadas = premium ? todas : todas.slice(0, AMOSTRA)
  const visiveis = tudo ? liberadas : liberadas.slice(0, CURTO)
  return (
    <aside className="lr-adendo" aria-labelledby="lr-adendo-titulo">
      <p className="lr-adendo__selo">Adendo</p>
      <h2 id="lr-adendo-titulo" className="lr-adendo__titulo">Frases que caem neste tema</h2>
      <p className="lr-adendo__sub">Uma frase por questão de prova, tirada dos comentários. Para reler em minutos antes das questões.</p>
      <ul className="lr-adendo__lista">
        {visiveis.map((fr) => <li key={fr.id}>
          <span>{comNegrito(fr.texto)}</span>
          <a href={href(`/questao/${fr.id}`)}>{fr.origem ? `${fr.origem} · ` : ''}ver questão <Icone nome="direita" tamanho={12} /></a>
        </li>)}
      </ul>
      {liberadas.length > visiveis.length && <button type="button" className="lr-adendo__ver" onClick={() => definirTudo(true)}>Mostrar mais {liberadas.length - visiveis.length} <Icone nome="baixo" tamanho={13} /></button>}
      {!premium && todas.length > AMOSTRA && <p className="lr-adendo__mais"><Icone nome="cadeado" tamanho={14} /> Mais {todas.length - AMOSTRA} {todas.length - AMOSTRA === 1 ? 'frase' : 'frases'} para assinantes. <a href={href('/assinatura')}>Ver os planos</a></p>}
      <a className="lr-adendo__todas" href={href('/resumos/frases')}>Todas as frases que caem, de todas as áreas <Icone nome="direita" tamanho={14} /></a>
    </aside>
  )
}
