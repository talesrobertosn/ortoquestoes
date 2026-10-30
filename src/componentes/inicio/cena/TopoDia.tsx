import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { META_STREAK_DIARIA, type Streak } from '../../../estado/streak'
import type { QuaseLa } from '../../../estado/conquistas'
import { href } from '../../../util/rotas'
import { Icone } from '../../Icone'
import { Medalha } from '../../Medalha'
import { estagioDaSequencia, textoProximoEstagio } from '../estagiosFogueira'
import type { DiaSequencia } from '../PainelSequencia'
import { CenaAcampamento, periodoAgora, type Periodo } from './CenaAcampamento'

/**
 * Topo do painel do dia (30/10/2026): a cena do acampamento por trás e, por cima, o título, o cartão da próxima ação
 * (passado pronto em `acao`) e o painel da sequência no estilo da interface dos jogos (barras com nome claro, as sete
 * tochas da semana e o "quase lá"). Os textos e destinos são os mesmos do painel de antes.
 */
const LEGENDA: Record<DiaSequencia['estado'], string> = {
  feito: 'meta da sequência feita', 'hoje-feito': 'hoje, meta feita', hoje: 'hoje, ainda falta',
  parcial: 'estudou, mas abaixo da meta', perdido: 'sem estudo', futuro: 'ainda vai chegar',
}

/** Período do dia, refeito a cada 5 minutos (a página aberta da tarde para a noite acende as tochas sozinha). */
function usarPeriodo(): Periodo {
  const escuro = () => document.documentElement.dataset.tema === 'escuro'
  const calcular = (): Periodo => (escuro() ? 'noite' : periodoAgora())
  const [p, definir] = useState<Periodo>(calcular)
  useEffect(() => {
    const id = window.setInterval(() => definir(calcular()), 300_000)
    const obs = new MutationObserver(() => definir(calcular()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => { window.clearInterval(id); obs.disconnect() }
  }, [])
  return p
}

export function TopoDia({ selo, titulo, lide, acao, streak, dias, quaseLa, conquistadas, totalConquistas, depois }: {
  selo: string; titulo: string; lide: ReactNode; acao: ReactNode; depois?: ReactNode
  streak: Streak; dias: DiaSequencia[]; quaseLa: QuaseLa[]; conquistadas: number; totalConquistas: number
}) {
  const periodo = usarPeriodo()
  const fogo = estagioDaSequencia(streak.atual)
  const proximo = textoProximoEstagio(streak.atual)
  const hoje = Math.min(META_STREAK_DIARIA, streak.hojeContagem)
  const faltam = META_STREAK_DIARIA - hoje
  const recorde = streak.recorde > streak.atual

  return (
    <section className={`cn-heroi cn-heroi--${periodo}`} aria-labelledby="ip-painel-titulo">
      <CenaAcampamento linhaFogo={fogo.indice} estagio={fogo.estagio.id} periodo={periodo} />

      <div className="cn-heroi__titulo">
        <p className="cn-selo">{selo}</p>
        <h1 id="ip-painel-titulo">{titulo}</h1>
        <p className="cn-lide">{lide}</p>
      </div>

      <div className="cn-heroi__acao">
        {acao}
        {depois}
      </div>

      <aside className="cn-hud" aria-label="Sua sequência e próximas conquistas">
        <div className="cn-hud__seq">
          <span className={`cn-hud__chama cn-hud__chama--${fogo.estagio.id}`} aria-hidden="true" />
          <div>
            <p className="cn-hud__rotulo">Sequência</p>
            <p className="cn-hud__numero"><strong className="numerico">{streak.atual}</strong> {streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</p>
            <p className="cn-hud__nota"><b>{fogo.estagio.nome}</b>{proximo ? ` · ${proximo}` : ' · o estágio máximo'}</p>
            <p className="cn-hud__nota">{recorde ? `Seu recorde: ${streak.recorde} dias` : streak.atual >= 3 ? 'É o seu recorde. Continue!' : 'Acenda e mantenha a chama.'}</p>
          </div>
        </div>

        <div className="cn-hud__barra-linha">
          <p className="cn-hud__rotulo"><span>Hoje para a sequência</span><b className="numerico">{hoje}/{META_STREAK_DIARIA}</b></p>
          <span className="cn-barra cn-barra--verde" role="img" aria-label={streak.metaHojeAtingida ? 'Hoje já conta para a sequência' : `${hoje} de ${META_STREAK_DIARIA}; faltam ${faltam}`}>
            <span style={{ width: `${(hoje / META_STREAK_DIARIA) * 100}%` }} />
          </span>
          <small>{streak.metaHojeAtingida ? 'Hoje já conta para a sequência' : `${faltam === 1 ? 'Falta 1 questão' : `Faltam ${faltam} questões`}${streak.emRisco ? ' para manter' : ' para acender'}`}</small>
        </div>

        <div>
          <p className="cn-hud__rotulo"><span>Esta semana</span></p>
          <ol className="cn-tochas">
            {dias.map((d) => (
              <li key={d.chave} className={`cn-tocha cn-tocha--${d.estado}`} title={`${d.nome}: ${d.total} ${d.total === 1 ? 'questão' : 'questões'} (${LEGENDA[d.estado]})`}>
                <span className="cn-tocha__fogo" aria-hidden="true" />
                <span className="cn-tocha__haste" aria-hidden="true" />
                <small aria-hidden="true">{d.estado.startsWith('hoje') ? 'Hoje' : d.inicial}</small>
                <span className="ip-invisivel">{d.nome}: {LEGENDA[d.estado]}</span>
              </li>
            ))}
          </ol>
        </div>

        {quaseLa.length > 0 && (
          <div className="cn-hud__quase">
            <p className="cn-hud__rotulo"><span>Quase lá</span><a href={href('/conquistas')}>{conquistadas} de {totalConquistas} conquistas <Icone nome="direita" tamanho={12} /></a></p>
            <ul>
              {quaseLa.map((q) => (
                <li key={q.emblema.id}>
                  <Medalha conquista={q.emblema} tamanho={28} />
                  <span><strong>{q.emblema.rotulo}</strong><small>Faltam {q.texto}</small>
                    <span className="cn-barra cn-barra--azul" aria-hidden="true"><span style={{ width: `${Math.max(6, Math.round(q.fracao * 100))}%` } as CSSProperties} /></span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </section>
  )
}
