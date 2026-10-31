import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import { Icone } from '../../componentes/Icone'
import { corDaArea } from '../../dados/coresAreas'
import { hojeBR } from '../../util/dia'
import { href } from '../../util/rotas'
import { FRASES_AREAS_AMOSTRA } from '../porta'
import { ordemDoDia } from '../recomendar'
import { RAROS } from '../salao/raros'
import { SEGREDOS, raridade, type IdSegredo } from '../salao/segredos'
import { Sprite } from '../salao/Sprite'
import { PALETA_XICARA, XICARA } from '../salao/sprites'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { CorujaPixel } from './CorujaPixel'
import { parouEm, pctLido, referencia, semMovimento } from './comum'
import { tocar } from './sons'

/**
 * A mesa de estudos (31/10/2026): continuar de onde parou (até três leituras, cada uma com a parte em que parou e um
 * botão Continuar que abre o leitor na posição guardada), a frase do dia no quadro e os atalhos do caderno, das frases
 * e do Atlas 3D. Sem leitura em andamento, a bibliotecária sugere um capítulo lendário do dia.
 */
export function Mesa({ continuar, capitulos, destaques, premium }: { continuar: Array<{ c: ResumoCapitulo; l?: Leitura }>; capitulos: ResumoCapitulo[]; destaques: number; premium: boolean }) {
  const sugestao = useMemo(() => ordemDoDia(capitulos.filter((c) => raridade(c.questoes.length) === 'lendario'), hojeBR())[0] ?? capitulos[0], [capitulos])
  return (
    <section className="bb-mesa" aria-label="Mesa de estudos">
      <div className="bb-mesa__continuar" data-guia="continuar">
        <h2 className="bb-rotulo">{continuar.length ? 'Continuar estudando' : 'Sugestão da bibliotecária'}</h2>
        {continuar.length ? <ul className="bb-continuar">{continuar.map(({ c, l }) => {
          const pct = pctLido(l)
          const parou = parouEm(c, l)
          return <li key={c.id} style={{ '--cor': corDaArea(c.especialidade) } as CSSProperties}>
            <a href={href(`/resumos/${c.id}`)} aria-label={`Continuar ${c.titulo}, ${pct}% lido${parou ? `, parou em ${parou}` : ''}`}>
              <span className="bb-continuar__ref">{referencia(c)}</span>
              <strong>{c.titulo}</strong>
              <small>{parou ? `Parou em: ${parou}` : 'Continue de onde parou'}</small>
              <span className="bb-continuar__pe"><span className="bb-barra"><span style={{ width: `${pct}%` }} /></span><b className="numerico">{pct}%</b><span className="bb-continuar__ir">Continuar <Icone nome="direita" tamanho={14} /></span></span>
            </a>
          </li>
        })}</ul> : sugestao && <a className="bb-sugestao" href={href(`/resumos/${sugestao.id}`)} style={{ '--cor': corDaArea(sugestao.especialidade) } as CSSProperties}>
          <CorujaPixel estado="lendo" className="bb-sugestao__coruja" />
          <span><span className="bb-continuar__ref">{referencia(sugestao)} · lendário: {sugestao.questoes.length} questões de prova</span><strong>{sugestao.titulo}</strong><small>Um dos capítulos que mais caem. Comece por ele.</small></span>
          <span className="bb-continuar__ir">Ler <Icone nome="direita" tamanho={14} /></span>
        </a>}
      </div>
      <QuadroNegro premium={premium} />
      <nav className="bb-mesa__atalhos" aria-label="Mais da biblioteca">
        <a href={href('/resumos/caderno')} data-guia="caderno"><Icone nome="lapis" tamanho={18} /><span><strong>Meu caderno</strong><small>{destaques ? `${destaques} ${destaques === 1 ? 'destaque' : 'destaques'} e notas` : 'Destaques e notas, em todos os aparelhos'}</small></span></a>
        <a href={href('/resumos/frases')}><Icone nome="raio" tamanho={18} /><span><strong>Frases que caem</strong><small>Uma frase por assunto, para a véspera</small></span></a>
        <a href={href('/atlas')}><Icone nome="osso" tamanho={18} /><span><strong>Atlas 3D</strong><small>Clique no osso, veja a fratura</small></span></a>
      </nav>
    </section>
  )
}

interface Frase { texto: string; id: string; origem?: string }

/** O quadro: uma frase que cai por dia (do adendo Frases que caem); um toque apaga e escreve outra. */
function QuadroNegro({ premium }: { premium: boolean }) {
  const [frases, definir] = useState<Frase[] | null>(null)
  const [i, definirI] = useState(0)
  const [apagando, definirApagando] = useState(false)
  useEffect(() => {
    let vivo = true
    const t = window.setTimeout(() => {
      fetch(recurso('acervo/resumao.json')).then((r) => (r.ok ? r.json() : null)).then((d: { areas: Array<{ focos: Array<{ frases: Frase[] }> }> } | null) => {
        if (!vivo || !d) return
        // Sem assinatura, só a amostra aberta da página das frases (FRASES_AREAS_AMOSTRA).
        const todas = (premium ? d.areas : d.areas.slice(0, FRASES_AREAS_AMOSTRA)).flatMap((a) => a.focos.flatMap((f) => f.frases))
        definir(ordemDoDia(todas, hojeBR()))
      }).catch(() => undefined)
    }, 600)
    return () => { vivo = false; window.clearTimeout(t) }
  }, [premium])
  const f = frases?.[i % (frases.length || 1)]
  const outra = () => {
    if (!frases) return
    tocar('pagina')
    if (semMovimento()) { definirI((x) => x + 1); return }
    definirApagando(true)
    window.setTimeout(() => { definirI((x) => x + 1); definirApagando(false) }, 340)
  }
  return (
    <section className="bb-quadro" aria-label="Frase que cai">
      <h2 className="bb-quadro__titulo">Cai na prova</h2>
      <p className={'bb-quadro__giz' + (apagando ? ' bb-quadro__giz--apagando' : '')} aria-live="polite">{f ? giz(f.texto) : 'Escrevendo a frase do dia…'}</p>
      <div className="bb-quadro__pe">
        {f?.origem && <small>{f.origem}</small>}
        <button type="button" onClick={outra} disabled={!frases}>Outra frase</button>
        <a href={href('/resumos/frases')}>Todas as frases</a>
      </div>
    </section>
  )
}
function giz(texto: string): ReactNode {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <b key={i}>{parte}</b> : parte))
}

/** Café de plantão (palavra mágica "café"): os três resumos mais curtos. */
export function Cafe({ curtos }: { curtos: ResumoCapitulo[] }) {
  return (
    <section className="bb-cafe" aria-label="Café de plantão">
      <Sprite grade={XICARA} paleta={PALETA_XICARA} px={4} className="bb-cafe__xicara" />
      <span className="bb-cafe__vapor" aria-hidden="true"><i /><i /><i /></span>
      <div><strong>Café de plantão</strong><p>Os três resumos mais curtos da biblioteca, para ler enquanto o café esfria:</p>
        <ul>{curtos.map((c) => <li key={c.id}><a href={href(`/resumos/${c.id}`)}>{c.titulo}</a> <small>~{c.minutos} min</small></li>)}</ul></div>
    </section>
  )
}

/** Sala dos raros (atrás do livro torto): curiosidades históricas dos resumos e a caderneta de segredos. */
export function SalaRaros({ achados, aoVoltar }: { achados: IdSegredo[]; aoVoltar: () => void }) {
  return (
    <section className="bb-raros" aria-labelledby="bb-raros-titulo">
      <header>
        <p className="bb-rotulo">Atrás da estante</p>
        <h2 id="bb-raros-titulo">Sala dos raros</h2>
        <p>Curiosidades que os resumos guardam: quem descreveu primeiro, de onde veio o nome e o que os próprios autores contaram depois. Cada cartão leva ao trecho.</p>
      </header>
      <ul className="bb-raros__lista">
        {RAROS.map((r) => <li key={r.titulo}><a href={href(`/resumos/${r.capitulo}?bloco=h-${r.secao}`)}>
          <span className="bb-raros__ano numerico">{r.ano}</span>
          <strong>{r.titulo}</strong>
          <span>{r.texto}</span>
        </a></li>)}
      </ul>
      <div className="bb-caderneta">
        <p className="bb-rotulo">Caderneta de segredos · <span className="numerico">{achados.length} de {SEGREDOS.length}</span></p>
        <div className="bb-barra bb-barra--ouro"><span style={{ width: `${(achados.length / SEGREDOS.length) * 100}%` }} /></div>
        <ul>{SEGREDOS.map((s) => {
          const achado = achados.includes(s.id)
          return <li key={s.id} className={achado ? 'bb-caderneta--achado' : ''}>
            <span className="bb-caderneta__selo" aria-hidden="true">{achado ? <Icone nome="estrela" tamanho={14} /> : '?'}</span>
            <span><strong>{achado ? s.nome : 'Ainda escondido'}</strong><small>{s.pista}</small></span>
          </li>
        })}</ul>
      </div>
      <button type="button" className="bb-botao-ler bb-raros__voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={16} /> Voltar pela passagem</button>
    </section>
  )
}

/** Comemoração de segredo: lombadas caindo do teto (some com "menos movimento"). */
export function ChuvaDeLivros() {
  const [viva, definir] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => definir(false), 2200); return () => window.clearTimeout(t) }, [])
  if (!viva || semMovimento()) return null
  const cores = ['#c0392b', '#2f7a4a', '#2b6cb0', '#d69e2e', '#8e44ad', '#e3b860']
  return (
    <span className="bb-chuva" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => (
      <i key={i} style={{ left: `${(i * 37) % 100}%`, background: cores[i % cores.length], animationDelay: `${(i % 7) * 0.09}s`, height: `${18 + (i * 7) % 16}px` } as CSSProperties} />
    ))}</span>
  )
}

/** O recado da bibliotecária (segredos, janela, crânio): no pé da tela, sem tampar nada importante, some sozinho. */
export function Recado({ texto }: { texto: string }) {
  return <p className="bb-recado" role="status"><CorujaPixel estado="piando" className="bb-recado__coruja" /><span>{texto}</span></p>
}
