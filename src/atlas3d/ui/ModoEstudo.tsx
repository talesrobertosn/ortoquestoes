import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icone } from '../../componentes/Icone'
import type { Motor } from '../motor/Motor'
import type { Estrutura, Grupo } from '../tipos'
import { grupoDe } from '../config'
import { nomeDe, temNomePt, SINGULAR } from '../dados/nomes'

interface Props {
  motor: Motor
  estruturas: Estrutura[]
  /** camadas que o quiz pode usar (as ligadas, no modo atual) */
  grupos: Set<Grupo>
  aoFechar: () => void
  aoVerFicha: (e: Estrutura) => void
}
interface Rodada { alvo: Estrutura; opcoes: string[]; resposta?: string }
interface Placar { acertos: number; total: number; seguidas: number; melhor: number }

const OURO = '#f0c46a'
const embaralhar = <T,>(lista: T[]) => { const a = [...lista]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const tamanho = (e: Estrutura) => Math.max(e.b[3] - e.b[0], e.b[4] - e.b[1], e.b[5] - e.b[2])

/**
 * Teste-se (modo estudo): o atlas acende uma estrutura em dourado entre as que estão na tela e pergunta o nome,
 * com quatro opções da mesma camada. Funciona com o que a pessoa montou (região, camadas, lado), então
 * serve tanto para "ossos do pé" quanto para "nervos do braço". Teclas 1 a 4 respondem, Enter avança.
 */
export function ModoEstudo({ motor, estruturas, grupos, aoFechar, aoVerFicha }: Props) {
  const [rodada, definirRodada] = useState<Rodada | null>(null)
  const [placar, definirPlacar] = useState<Placar>({ acertos: 0, total: 0, seguidas: 0, melhor: 0 })
  const recentes = useRef<string[]>([])

  // candidatas: na tela quando o teste começou (camadas e região), com nome em português e grandes o bastante para ver
  const candidatas = useMemo(() => estruturas.filter((e) => grupos.has(grupoDe(e)) && motor.estaVisivel(e.id) && temNomePt(e) && tamanho(e) >= 14),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estruturas, grupos, motor])

  const nova = useCallback(() => {
    const pool = candidatas.filter((e) => !recentes.current.includes(nomeDe(e)))
    const base = pool.length >= 4 ? pool : candidatas
    if (base.length < 4) { definirRodada(null); return }
    const alvo = base[Math.floor(Math.random() * base.length)]
    const nomeAlvo = nomeDe(alvo)
    recentes.current = [nomeAlvo, ...recentes.current].slice(0, Math.min(12, Math.floor(candidatas.length / 2)))
    const mesmos = embaralhar(candidatas.filter((e) => grupoDe(e) === grupoDe(alvo)).map(nomeDe))
    const outros = embaralhar(candidatas.map(nomeDe))
    const opcoes = [nomeAlvo]
    for (const n of [...mesmos, ...outros]) { if (opcoes.length >= 4) break; if (!opcoes.includes(n)) opcoes.push(n) }
    definirRodada({ alvo, opcoes: embaralhar(opcoes) })
    motor.selecionar(null, false)
    // o resto fica translúcido (dá contexto sem esconder o alvo atrás de músculo ou órgão)
    motor.isolar([alvo.id], true)
    motor.mostrarRelacoes([{ id: alvo.id, cor: OURO }])
    motor.focar([alvo.id])
  }, [candidatas, motor])

  useEffect(() => { nova(); return () => { motor.mostrarRelacoes([]); motor.isolar(null) } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const responder = useCallback((opcao: string) => {
    if (!rodada || rodada.resposta) return
    const certo = opcao === nomeDe(rodada.alvo)
    definirRodada({ ...rodada, resposta: opcao })
    definirPlacar((p) => {
      const seguidas = certo ? p.seguidas + 1 : 0
      return { acertos: p.acertos + (certo ? 1 : 0), total: p.total + 1, seguidas, melhor: Math.max(p.melhor, seguidas) }
    })
    motor.mostrarRelacoes([{ id: rodada.alvo.id, cor: certo ? '#1f9d63' : '#d64541' }])
  }, [rodada, motor])

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.closest('input, textarea')) return
      if (!rodada) return
      const n = Number(ev.key)
      if (n >= 1 && n <= rodada.opcoes.length && !rodada.resposta) { ev.preventDefault(); responder(rodada.opcoes[n - 1]) }
      else if (ev.key === 'Enter' && rodada.resposta) { ev.preventDefault(); nova() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [rodada, responder, nova])

  const nomeCerto = rodada ? nomeDe(rodada.alvo) : ''
  const aproveitamento = placar.total ? Math.round((placar.acertos / placar.total) * 100) : 0
  return (
    <section className="at-estudo" aria-label="Teste-se: que estrutura é esta?">
      <header className="at-estudo__topo">
        <p className="at-estudo__selo"><Icone nome="alvo" tamanho={14} /> Teste-se</p>
        <dl className="at-estudo__placar">
          <div><dt>Acertos</dt><dd>{placar.acertos}/{placar.total}</dd></div>
          <div><dt>Seguidas</dt><dd>{placar.seguidas}</dd></div>
          {placar.total > 0 && <div><dt>Aproveit.</dt><dd>{aproveitamento}%</dd></div>}
        </dl>
        <button type="button" className="at-estudo__fechar" onClick={aoFechar} aria-label="Sair do Teste-se"><Icone nome="fechar" tamanho={18} /></button>
      </header>
      {rodada ? (
        <>
          <h2 className="at-estudo__pergunta">{rodada.resposta ? (rodada.resposta === nomeCerto ? 'Isso mesmo!' : 'Quase lá.') : 'Que estrutura está acesa?'}
            <small>{SINGULAR[grupoDe(rodada.alvo)]}{rodada.alvo.s !== 'm' ? ` · lado ${rodada.alvo.s === 'd' ? 'direito' : 'esquerdo'}` : ''}</small></h2>
          <ol className="at-estudo__opcoes">
            {rodada.opcoes.map((o, i) => {
              const estado = !rodada.resposta ? '' : o === nomeCerto ? ' at-estudo__opcao--certa' : o === rodada.resposta ? ' at-estudo__opcao--errada' : ' at-estudo__opcao--apagada'
              return (
                <li key={o}><button type="button" className={`at-estudo__opcao${estado}`} onClick={() => responder(o)} disabled={!!rodada.resposta}>
                  <kbd>{i + 1}</kbd><span>{o}</span>{rodada.resposta && o === nomeCerto && <Icone nome="certo" tamanho={16} />}{rodada.resposta === o && o !== nomeCerto && <Icone nome="errado" tamanho={16} />}
                </button></li>
              )
            })}
          </ol>
          {rodada.resposta && (
            <div className="at-estudo__acoes">
              <button type="button" className="at-estudo__proxima" onClick={nova}>Próxima<Icone nome="direita" tamanho={16} /></button>
              <button type="button" className="at-link" onClick={() => aoVerFicha(rodada.alvo)}>Ver a ficha de {nomeCerto.toLowerCase()}</button>
            </div>
          )}
          {!rodada.resposta && <p className="at-nota">Gire o modelo para achar o dourado. Teclas 1 a 4 respondem.</p>}
        </>
      ) : (
        <p className="at-estudo__vazio">Para o teste, deixe pelo menos quatro estruturas com nome na tela: ligue uma camada ou escolha uma região maior.</p>
      )}
    </section>
  )
}
