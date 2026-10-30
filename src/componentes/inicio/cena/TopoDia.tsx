import { type CSSProperties, type ReactNode } from 'react'
import { META_STREAK_DIARIA, type Streak } from '../../../estado/streak'
import type { QuaseLa } from '../../../estado/conquistas'
import { href } from '../../../util/rotas'
import { urlCss } from '../../../config'
import { Icone } from '../../Icone'
import { Medalha } from '../../Medalha'
import { estagioDaSequencia, textoProximoEstagio } from '../estagiosFogueira'
import type { DiaSequencia } from '../PainelSequencia'
import { CenaDiorama } from './CenaDiorama'
import { usarPeriodo } from '../../../estado/aparencia'

/**
 * Topo do painel do dia (30/10/2026, refeito do zero a pedido do Tales, com o Octopath Traveler II de referência).
 * O cenário pintado com a luz da hora do dia por trás; por cima, o título, o painel da sequência (como o quadro de
 * vida e energia do grupo nos jogos) e, embaixo, a barra de comando: os atalhos em losangos e a próxima ação com o
 * botão de cristal. Os textos, números e destinos são os de sempre.
 */
export interface Atalho { destino: string; rotulo: string; texto: string; icone: ReactNode; contador?: number; novo?: boolean }

const LEGENDA: Record<DiaSequencia['estado'], string> = {
  feito: 'meta da sequência feita', 'hoje-feito': 'hoje, meta feita', hoje: 'hoje, ainda falta',
  parcial: 'estudou, mas abaixo da meta', perdido: 'sem estudo', futuro: 'ainda vai chegar',
}
/** Linha da folha da tocha: 0 acesa, 1 fraca, 2 apagada. */
const TOCHA: Record<DiaSequencia['estado'], number> = { feito: 0, 'hoje-feito': 0, hoje: 1, parcial: 1, perdido: 2, futuro: 2 }

/** As folhas de sprites (url() absoluto: relativo em variável CSS some no site publicado). */
const SPRITES = {
  '--sprite-fogo': urlCss('pixel/inicio/fogo.png'), '--sprite-tocha': urlCss('pixel/inicio/tocha.png'),
} as CSSProperties

export function TopoDia({ selo, titulo, lide, acao, botao, depois, atalhos, streak, dias, quaseLa, conquistadas, totalConquistas }: {
  selo: string; titulo: string; lide: ReactNode; acao: ReactNode; botao: ReactNode; depois?: ReactNode; atalhos: Atalho[]
  streak: Streak; dias: DiaSequencia[]; quaseLa: QuaseLa[]; conquistadas: number; totalConquistas: number
}) {
  const periodo = usarPeriodo()
  const fogo = estagioDaSequencia(streak.atual)
  const proximo = textoProximoEstagio(streak.atual)
  const hoje = Math.min(META_STREAK_DIARIA, streak.hojeContagem)
  const faltam = META_STREAK_DIARIA - hoje
  const recorde = streak.recorde > streak.atual

  return (
    <section className={`hd-topo hd-topo--${periodo}`} aria-labelledby="ip-painel-titulo" style={SPRITES}>
      <div className="hd-vista">
      <CenaDiorama linhaFogo={fogo.indice} periodo={periodo} />

      <header className="hd-topo__titulo">
        <p className="hd-selo">{selo}</p>
        <h1 id="ip-painel-titulo">{titulo}</h1>
        <p className="hd-lide">{lide}</p>
      </header>

      <aside className="hd-status" aria-label="Sua sequência e próximas conquistas">
        <div className="hd-status__seq">
          <span className="hd-status__chama" style={{ '--linha': fogo.indice } as CSSProperties} aria-hidden="true" />
          <div>
            <p className="hd-rotulo">Sequência</p>
            <p className="hd-status__numero"><strong className="numerico">{streak.atual}</strong> {streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</p>
            <p className="hd-status__nota"><b>{fogo.estagio.nome}</b>{proximo ? ` · ${proximo}` : ' · o estágio máximo'}</p>
            <p className="hd-status__nota">{recorde ? `Seu recorde: ${streak.recorde} dias` : streak.atual >= 3 ? 'É o seu recorde. Continue!' : 'Acenda e mantenha a chama.'}</p>
          </div>
        </div>
        <div className="hd-status__linha">
          <p className="hd-rotulo"><span>Hoje para a sequência</span><b className="numerico">{hoje}/{META_STREAK_DIARIA}</b></p>
          <span className="hd-barra hd-barra--verde" role="img" aria-label={streak.metaHojeAtingida ? 'Hoje já conta para a sequência' : `${hoje} de ${META_STREAK_DIARIA}; faltam ${faltam}`}>
            <span style={{ width: `${(hoje / META_STREAK_DIARIA) * 100}%` }} />
          </span>
          <small>{streak.metaHojeAtingida ? 'Hoje já conta para a sequência' : `${faltam === 1 ? 'Falta 1 questão' : `Faltam ${faltam} questões`}${streak.emRisco ? ' para manter' : ' para acender'}`}</small>
        </div>
        <div>
          <p className="hd-rotulo"><span>Esta semana</span></p>
          <ol className="hd-tochas">
            {dias.map((d) => (
              <li key={d.chave} className={`hd-tocha hd-tocha--${d.estado}`} title={`${d.nome}: ${d.total} ${d.total === 1 ? 'questão' : 'questões'} (${LEGENDA[d.estado]})`}>
                <span className="hd-tocha__sprite" style={{ '--linha': TOCHA[d.estado] } as CSSProperties} aria-hidden="true" />
                <small aria-hidden="true">{d.estado.startsWith('hoje') ? 'Hoje' : d.inicial}</small>
                <span className="ip-invisivel">{d.nome}: {LEGENDA[d.estado]}</span>
              </li>
            ))}
          </ol>
        </div>
        {quaseLa.length > 0 && (
          <div className="hd-status__quase">
            <p className="hd-rotulo"><span>Quase lá</span><a href={href('/conquistas')}>{conquistadas} de {totalConquistas} conquistas <Icone nome="direita" tamanho={12} /></a></p>
            <ul>
              {quaseLa.map((q) => (
                <li key={q.emblema.id}>
                  <Medalha conquista={q.emblema} tamanho={26} />
                  <span><strong>{q.emblema.rotulo}</strong><small>Faltam {q.texto}</small>
                    <span className="hd-barra hd-barra--azul" aria-hidden="true"><span style={{ width: `${Math.max(6, Math.round(q.fracao * 100))}%` }} /></span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      </div>

      {/* Barra de comando: os atalhos em losangos à esquerda e a próxima ação com o botão de cristal à direita. */}
      <div className="hd-comando">
        <nav className="hd-losangos" aria-label="Atalhos">
          {atalhos.map((a) => (
            <a key={a.destino} className="hd-losango" href={href(a.destino)} title={a.texto}>
              <span className="hd-losango__pedra" aria-hidden="true"><span className="hd-losango__icone">{a.icone}</span></span>
              {a.contador ? <b className="hd-losango__contador numerico">{a.contador > 99 ? '99+' : a.contador}</b> : null}
              {a.novo && <b className="hd-losango__novo">Novo</b>}
              <span className="hd-losango__nome">{a.rotulo}</span>
              <small className="hd-losango__texto">{a.texto}</small>
            </a>
          ))}
        </nav>
        <div className="hd-acao">
          <div className="hd-acao__texto">{acao}</div>
          <div className="hd-acao__botao">{botao}{depois}</div>
        </div>
      </div>
    </section>
  )
}

/**
 * Topo da vitrine de quem ainda não tem conta (30/10/2026): o mesmo cenário, com a proposta do site, o convite com o
 * botão de cristal, as provas do acervo como estandartes e a questão de amostra num pergaminho, para responder ali.
 */
export function TopoVisitante({ titulo, proposta, lide, cta, entrar, nota, provas, amostra }: {
  titulo: string; proposta: ReactNode; lide: ReactNode; cta: ReactNode; entrar: ReactNode; nota: ReactNode
  provas: Array<{ nome: string; cor: string }>; amostra: ReactNode
}) {
  const periodo = usarPeriodo()
  return (
    <section className={`hd-topo hd-topo--visitante hd-topo--${periodo}`} aria-labelledby="ip-vitrine-titulo" style={SPRITES}>
      <div className="hd-vista">
        <CenaDiorama linhaFogo={3} periodo={periodo} />
        <header className="hd-topo__titulo">
          <p className="hd-selo">Provas oficiais comentadas</p>
          <h1 id="ip-vitrine-titulo">{titulo}</h1>
          <p className="hd-proposta">{proposta}</p>
          <p className="hd-lide">{lide}</p>
          <div className="hd-convite">{cta}{entrar}</div>
          <p className="hd-nota">{nota}</p>
        </header>
        <div className="hd-pergaminho">{amostra}</div>
      </div>
      <ul className="hd-estandartes" aria-label="Provas no acervo">
        {provas.map(({ nome, cor }) => <li key={nome} style={{ '--cor': cor } as CSSProperties}><span>{nome}</span></li>)}
      </ul>
    </section>
  )
}
