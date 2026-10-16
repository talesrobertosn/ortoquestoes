import type { CSSProperties } from 'react'
import { recurso } from '../../config'
import { META_STREAK_DIARIA, type Streak } from '../../estado/streak'
import type { QuaseLa } from '../../estado/conquistas'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { Medalha } from '../Medalha'

/**
 * Sequência de dias e "quase lá", no topo do painel (16/10/2026). A fogueira e os
 * ícones dos dias são pixel art feita do zero por scripts/gerar_pixel_inicio.py.
 */
export type EstadoDia = 'feito' | 'parcial' | 'perdido' | 'hoje-feito' | 'hoje' | 'futuro'
export interface DiaSequencia { chave: string; inicial: string; nome: string; numero: number; total: number; estado: EstadoDia }

const ICONE: Partial<Record<EstadoDia, number>> = { feito: 0, 'hoje-feito': 1, hoje: 2, parcial: 2, perdido: 3 }
const LEGENDA: Record<EstadoDia, string> = {
  feito: 'meta da sequência feita', 'hoje-feito': 'hoje, meta feita', hoje: 'hoje, ainda falta',
  parcial: 'estudou, mas abaixo da meta', perdido: 'sem estudo', futuro: 'ainda vai chegar',
}

export function PainelSequencia({ streak, dias, quaseLa, conquistadas, totalConquistas }: {
  streak: Streak; dias: DiaSequencia[]; quaseLa: QuaseLa[]; conquistadas: number; totalConquistas: number
}) {
  const acesa = streak.atual > 0 || streak.metaHojeAtingida
  const hoje = Math.min(META_STREAK_DIARIA, streak.hojeContagem)
  const faltam = META_STREAK_DIARIA - hoje
  const recorde = streak.recorde > streak.atual
  return (
    <aside className="ip-seq" aria-label="Sua sequência e próximas conquistas">
      <div className="ip-seq__topo">
        <span className={`ip-fogueira${acesa ? '' : ' ip-fogueira--apagada'}`} role="img" aria-label={acesa ? 'Fogueira acesa' : 'Fogueira apagada'}
          style={{ '--sprite': `url(${recurso(acesa ? 'pixel/inicio/fogueira.png' : 'pixel/inicio/fogueira-apagada.png')})` } as CSSProperties} />
        <div className="ip-seq__numero">
          <strong>{streak.atual}</strong>
          <span>{streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          <small>{recorde ? `Seu recorde: ${streak.recorde} dias` : streak.atual >= 3 ? 'É o seu recorde. Continue!' : 'Acenda e mantenha a chama.'}</small>
        </div>
      </div>

      <div className="ip-seq__hoje">
        <span className="ip-seq__hoje-texto">{streak.metaHojeAtingida
          ? <><Icone nome="certo" tamanho={14} /> Hoje já conta para a sequência</>
          : <>Hoje: <strong>{hoje} de {META_STREAK_DIARIA}</strong> · {faltam === 1 ? 'falta 1 questão' : `faltam ${faltam} questões`}{streak.emRisco ? ' para manter' : ' para acender'}</>}</span>
        <span className="ip-seq__brasas" aria-hidden="true">
          {Array.from({ length: META_STREAK_DIARIA }, (_, i) => <span key={i} className={i < hoje ? 'acesa' : ''} />)}
        </span>
      </div>

      <ol className="ip-dias" aria-label="Esta semana">
        {dias.map((d) => (
          <li key={d.chave} className={`ip-dia ip-dia--${d.estado}`} title={`${d.nome}: ${d.total} ${d.total === 1 ? 'questão' : 'questões'} (${LEGENDA[d.estado]})`}>
            <small className="ip-dia__inicial">{d.estado.startsWith('hoje') ? 'Hoje' : d.inicial}</small>
            <span className="ip-dia__ficha">
              {ICONE[d.estado] !== undefined && <span className="ip-dia__icone" style={{ '--pos': ICONE[d.estado], '--sprite': `url(${recurso('pixel/inicio/dias.png')})` } as CSSProperties} />}
            </span>
            <small className="ip-dia__numero numerico">{d.numero}</small>
            <span className="ip-invisivel">{d.nome}: {LEGENDA[d.estado]}</span>
          </li>
        ))}
      </ol>

      {quaseLa.length > 0 && (
        <div className="ip-seq__quase">
          <p className="ip-seq__rotulo"><span>Quase lá</span><a href={href('/conquistas')}>{conquistadas} de {totalConquistas} conquistas <Icone nome="direita" tamanho={13} /></a></p>
          <ul>
            {quaseLa.map((q) => (
              <li key={q.emblema.id}>
                <Medalha conquista={q.emblema} tamanho={34} />
                <span className="ip-seq__emblema">
                  <strong>{q.emblema.rotulo}</strong>
                  <small>Faltam {q.texto}</small>
                </span>
                <span className="ip-seq__barra" aria-hidden="true"><span style={{ width: `${Math.max(6, Math.round(q.fracao * 100))}%` }} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
