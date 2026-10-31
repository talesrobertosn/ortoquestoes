import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { gravar, ler } from '../../../estado/armazenamento'
import { chaveDia } from '../../../estado/limiteDiario'
import { META_STREAK_DIARIA, type Streak } from '../../../estado/streak'
import { href } from '../../../util/rotas'
import { SITE, recurso, urlCss } from '../../../config'
import { Icone } from '../../Icone'
import { Mascote } from '../../mascote/Mascote'
import { estagioDaSequencia, textoProximoEstagio, ESTAGIOS_FOGUEIRA } from '../estagiosFogueira'
import type { DiaSequencia } from '../PainelSequencia'
import { CenaDiorama } from '../cena/CenaDiorama'
import { usarPeriodo } from '../../../estado/aparencia'

/*
 * A página inicial em níveis (31/10/2026, "redesign premium" pedido pelo Tales).
 * 1. O herói: o acampamento pintado é o protagonista; a saudação no céu e a missão do dia (continuar estudando)
 *    pousada no chão, à esquerda, sem cobrir a fogueira, o esqueleto nem o gato.
 * 2. A trilha da sequência: o chão do acampamento continua embaixo da cena, com o número de dias em destaque e as
 *    sete tochas da semana (cada estado com uma silhueta própria: a cor nunca é a única diferença).
 * 3. A barra de atalhos: sete espaços de inventário com ícones do mesmo traço (scripts/gerar_icones_pixel.py).
 * Os textos, números e destinos vêm do Inicio.tsx; nada aqui inventa dado.
 */

export interface Atalho { destino: string; rotulo: string; texto: string; icone: string; contador?: number; novo?: boolean }

/** Linha da folha tocha-semana-v2.png (scripts/gerar_sprites_inicio.py); a linha 7 é "acendendo", tocada uma vez. */
const LINHA_TOCHA = { feito: 0, 'hoje-feito': 1, hoje: 2, parcial: 3, perdido: 4, futuro: 5, especial: 6 } as const
type EstadoTocha = keyof typeof LINHA_TOCHA

const LEGENDA: Record<EstadoTocha, string> = {
  feito: 'meta da sequência feita', 'hoje-feito': 'hoje, meta feita', hoje: 'hoje, em andamento',
  parcial: 'estudou, mas abaixo da meta', perdido: 'sem estudo', futuro: 'ainda vai chegar', especial: 'dia especial: recorde ou novo estágio da chama',
}

const SPRITES = {
  '--sprite-fogo': urlCss('pixel/inicio/fogo.png'), '--sprite-tocha': urlCss('pixel/inicio/tocha-semana-v2.png'),
} as CSSProperties

/** Hoje vira "especial" quando bate o recorde ou quando a chama sobe de estágio. */
function estadoDaTocha(d: DiaSequencia, streak: Streak): EstadoTocha {
  if (d.estado === 'hoje-feito') {
    const novoEstagio = ESTAGIOS_FOGUEIRA.some((e) => e.desde > 1 && e.desde === streak.atual)
    if ((streak.atual >= 3 && streak.atual >= streak.recorde) || novoEstagio) return 'especial'
  }
  return d.estado
}

/**
 * A comemoração da meta do dia (31/10/2026): na primeira vez que a página abre com a meta cumprida, devolve um número
 * novo (uma vez por dia e por conta) para a tocha de hoje acender, o esqueleto pular e o gato comemorar. Nada bloqueia
 * a navegação e, com "menos animação", fica só a frase.
 */
export function usarFestaDaMeta(cumprida: boolean): number {
  const [festa, definir] = useState(0)
  useEffect(() => {
    if (!cumprida) return
    const chave = `inicio:festa:${chaveDia()}`
    if (ler<boolean>(chave, false)) return
    gravar(chave, true)
    const t = window.setTimeout(() => definir(Date.now()), 1100)
    return () => window.clearTimeout(t)
  }, [cumprida])
  return festa
}

export function HeroiJornada({ data, titulo, lide, missao, botao, depois, linhaFogo, descanso, festa }: {
  data: string; titulo: string; lide: ReactNode; missao: ReactNode; botao: ReactNode; depois?: ReactNode; linhaFogo: number
  descanso?: boolean; festa?: number
}) {
  const periodo = usarPeriodo()
  return (
    <section className={`jn-heroi jn-heroi--${periodo} hd-topo--${periodo}`} aria-labelledby="jn-titulo" style={SPRITES}>
      <CenaDiorama linhaFogo={linhaFogo} periodo={periodo} descanso={descanso} festa={festa} />
      <header className="jn-saudacao">
        <p className="jn-data">{data}</p>
        <h1 id="jn-titulo">{titulo}</h1>
        <p className="jn-lide">{lide}</p>
      </header>
      <div className="jn-missao">
        <div className="jn-missao__texto">{missao}</div>
        <div className="jn-missao__acoes">{botao}{depois}</div>
      </div>
    </section>
  )
}

export function TrilhaSequencia({ streak, dias, festa = 0 }: { streak: Streak; dias: DiaSequencia[]; festa?: number }) {
  // Na comemoração, a tocha de hoje toca a linha "acendendo" uma vez e a frase fica alguns segundos.
  const [acendendo, definirAcendendo] = useState(false)
  const [frase, definirFrase] = useState(false)
  useEffect(() => {
    if (!festa) return
    definirAcendendo(true); definirFrase(true)
    const a = window.setTimeout(() => definirAcendendo(false), 1300)
    const b = window.setTimeout(() => definirFrase(false), 7000)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [festa])
  const fogo = estagioDaSequencia(streak.atual)
  const proximo = textoProximoEstagio(streak.atual)
  const hoje = Math.min(META_STREAK_DIARIA, streak.hojeContagem)
  const faltam = META_STREAK_DIARIA - hoje
  const recordeAcima = streak.recorde > streak.atual
  return (
    <section className="jn-trilha" aria-labelledby="jn-seq-titulo" style={SPRITES}>
      <div className="jn-trilha__numero">
        <span className="jn-trilha__chama" style={{ '--linha': fogo.indice } as CSSProperties} aria-hidden="true" />
        <div>
          <h2 id="jn-seq-titulo" className="jn-rotulo">Sequência</h2>
          {streak.atual > 0
            ? <p className="jn-trilha__dias"><strong className="numerico">{streak.atual}</strong> <span>{streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}</span></p>
            : <p className="jn-trilha__dias jn-trilha__dias--zero"><span>Acenda a chama hoje</span></p>}
          <p className="jn-trilha__estagio"><b>{fogo.estagio.nome}</b>{proximo ? ` · ${proximo}` : ' · o estágio máximo'}</p>
        </div>
      </div>

      <ol className="jn-tochas" aria-label="Esta semana, de segunda a domingo">
        {dias.map((d) => {
          const estado = estadoDaTocha(d, streak)
          const ehHoje = d.estado.startsWith('hoje')
          const linha = ehHoje && acendendo ? 7 : LINHA_TOCHA[estado]
          return (
            <li key={d.chave} className={`jn-tocha jn-tocha--${estado}${ehHoje ? ' jn-tocha--hoje-marca' : ''}${ehHoje && acendendo ? ' jn-tocha--acendendo' : ''}`}
              title={`${d.nome}: ${d.total} ${d.total === 1 ? 'questão' : 'questões'} (${LEGENDA[estado]})`}>
              <span className="jn-tocha__sprite" style={{ '--linha': linha } as CSSProperties} aria-hidden="true" />
              <small aria-hidden="true">{ehHoje ? 'Hoje' : d.inicial}</small>
              <span className="ip-invisivel">{d.nome}: {LEGENDA[estado]}</span>
            </li>
          )
        })}
      </ol>

      <p className={`jn-trilha__festa${frase ? ' jn-trilha__festa--visivel' : ''}`} role="status" aria-live="polite">
        {frase ? 'Meta de hoje cumprida. A tocha de hoje está acesa.' : ''}
      </p>
      <dl className="jn-trilha__meta">
        <div>
          <dt>Hoje</dt>
          <dd><b className="numerico">{hoje}/{META_STREAK_DIARIA}</b> {streak.metaHojeAtingida ? 'já conta' : faltam === 1 ? 'falta 1' : `faltam ${faltam}`}</dd>
          <span className="jn-medidor" role="img" aria-label={streak.metaHojeAtingida ? 'Hoje já conta para a sequência' : `${hoje} de ${META_STREAK_DIARIA} questões; faltam ${faltam}${streak.emRisco ? ' para manter' : ' para acender'}`}>
            {Array.from({ length: META_STREAK_DIARIA }, (_, i) => <i key={i} className={i < hoje ? 'cheio' : undefined} />)}
          </span>
        </div>
        <div>
          <dt>Recorde</dt>
          <dd>{recordeAcima ? <><b className="numerico">{streak.recorde}</b> dias</> : streak.atual >= 3 ? 'é este' : 'acenda a chama'}</dd>
        </div>
      </dl>
    </section>
  )
}

export function BarraAtalhos({ atalhos }: { atalhos: Atalho[] }) {
  return (
    <nav className="jn-atalhos" aria-label="Acesso rápido" style={{ '--colunas': atalhos.length <= 6 ? 3 : 4 } as CSSProperties}>
      <ul>
        {atalhos.map((a) => (
          <li key={a.destino}>
            <a className="jn-atalho" href={href(a.destino)}>
              <span className="jn-atalho__icone" aria-hidden="true">
                <img src={recurso(`pixel/${a.icone}.png`)} width={40} height={40} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="jn-atalho__nome">{a.rotulo}</span>
              <small className="jn-atalho__texto">{a.texto}</small>
              {a.contador ? <b className="jn-atalho__contador numerico" aria-label={`${a.contador} para hoje`}>{a.contador > 99 ? '99+' : a.contador}</b> : null}
              {a.novo && <b className="jn-atalho__novo">Novo</b>}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * O convite do Instagram no fim da página inicial (31/10/2026): o acampamento de manhã, o esqueleto acenando e o
 * botão dourado. Saiu do rodapé da página inicial para fechar a galeria no mesmo visual.
 */
export function ConviteInstagram() {
  return (
    <a className="jn-insta" href={SITE.instagram} target="_blank" rel="noopener noreferrer me" style={{ '--cena-insta': urlCss('pixel/inicio/cena-manha-960.webp') } as CSSProperties}
      aria-label={`Siga @${SITE.instagramUsuario} no Instagram: uma questão comentada toda manhã (abre em nova aba)`}>
      <span className="jn-insta__texto">
        <span className="jn-insta__selo"><Icone nome="instagram" tamanho={14} /> No Instagram</span>
        <strong>Uma questão comentada toda manhã</strong>
        <span>No feed, a questão, a resposta e o porquê de cada alternativa. Nos stories, macetes de prova e o acervo novo.</span>
        <span className="jn-insta__botao"><Icone nome="instagram" tamanho={18} /> Siga @{SITE.instagramUsuario}</span>
      </span>
      <Mascote className="jn-insta__mascote" comportamento="acenar" fantasia="nenhuma" falar={false} interativo={false} />
    </a>
  )
}
