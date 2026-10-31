import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { corDaArea } from '../../dados/coresAreas'
import { href } from '../../util/rotas'
import { estadoLeitura, numeroCapitulo, tituloLombada, rotuloLivro } from '../estante'
import { raridade, NOME_RARIDADE } from '../salao/segredos'
import { Sprite } from '../salao/Sprite'
import { PALETA_PLANTA, PLANTA } from '../salao/sprites'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { nomeArea } from '../busca'
import { ESTADO_NOME, cliqueComum, idObra, pctLido, temMouse, type Obra } from './comum'
import type { Salao } from './usarSalao'
import { LATERAIS, VAGA, arrumarBaias, type Fileira } from './arrumar'

interface Baia { id: string; obra?: Obra; titulo: string; edicoes: string; sobre: string; capa: string; capitulos: ResumoCapitulo[]; total: number; lidos: number; cobrados?: boolean }

interface PropsEstante {
  obras: Obra[]
  /** Ids que passam na busca e nos filtros; null = sem filtro (todos). */
  achados: Set<string> | null
  cobrados: ResumoCapitulo[]
  leituras: Record<string, Leitura | undefined>
  premium: boolean
  salao: Salao
  /** Um resumo para realçar (escolhido na busca). */
  realce: string | null
  primeiraBusca: string | null
  aoAbrir: (c: ResumoCapitulo) => void
  /** A Sala dos raros, quando a passagem do livro torto está aberta (ocupa o lugar daquela estante). */
  salaRaros: ReactNode
}

/**
 * A parede de estantes da Biblioteca 3.0: uma estante por obra (Rockwood, Campbell, Green...), com prateleiras de
 * madeira pintada (texturas de scripts/gerar_cena_salao.py) e uma lombada por resumo. Passar o mouse puxa o livro e
 * mostra a ficha curta com o título inteiro; clicar abre a ficha completa. No celular, cada estante é uma prateleira
 * que corre para o lado, com lombadas largas para o polegar, e um toque abre a ficha.
 */
export function Estante({ obras, achados, cobrados, leituras, premium, salao, realce, primeiraBusca, aoAbrir, salaRaros }: PropsEstante) {
  const parede = useRef<HTMLDivElement>(null)
  const [largura, definirLargura] = useState(1100)
  const [celular, definirCelular] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 40rem)').matches)
  useLayoutEffect(() => {
    const el = parede.current
    if (!el) return
    const medir = () => {
      const cs = getComputedStyle(el)
      definirLargura(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
      definirCelular(matchMedia('(max-width: 40rem)').matches)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const baias = useMemo<Baia[]>(() => {
    const lista: Baia[] = []
    if (!achados && cobrados.length) lista.push({ id: 'cobrados', titulo: 'Mais cobrados nas provas', edicoes: `${cobrados.length} capítulos`, sobre: 'Os capítulos com mais questões de prova, de todos os livros. Bom lugar para começar.', capa: '#8a6418', capitulos: cobrados, total: cobrados.length, lidos: cobrados.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length, cobrados: true })
    for (const o of obras) {
      const visiveis = achados ? o.capitulos.filter((c) => achados.has(c.id)) : o.capitulos
      if (!visiveis.length) continue
      lista.push({ id: idObra(o.livro), obra: o, titulo: o.apelido, edicoes: o.edicoes.join(' e '), sobre: o.sobre, capa: o.capa, capitulos: visiveis, total: o.capitulos.length,
        lidos: o.capitulos.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length })
    }
    return lista
  }, [obras, achados, cobrados, leituras])

  // O livro torto (passagem secreta) mora na terceira estante de obra visível; a escada, na primeira (ou no achado).
  const obrasVisiveis = baias.filter((b) => !b.cobrados)
  const baiaTorta = obrasVisiveis[Math.min(2, obrasVisiveis.length - 1)]?.id
  const baiaEscada = primeiraBusca ? baias.find((b) => !b.cobrados && b.capitulos.some((c) => c.id === primeiraBusca))?.id : obrasVisiveis[0]?.id

  const fileiras = useMemo<Fileira[]>(() => (celular ? baias.map((b) => [[{ id: b.id, vagas: b.capitulos.length + (b.id === baiaTorta ? 1 : 0) }]])
    : arrumarBaias(baias.map((b) => ({ id: b.id, n: b.capitulos.length + (b.id === baiaTorta ? 1 : 0) })), largura)), [baias, largura, celular, baiaTorta])

  // Ficha curta (passar o mouse ou focar com o teclado): presa à lombada, com uma folga para o mouse chegar nela.
  const [pop, definirPop] = useState<{ c: ResumoCapitulo; r: DOMRect; el: HTMLElement } | null>(null)
  const fechar = useRef<number | undefined>(undefined)
  const mostrar = (c: ResumoCapitulo, el: HTMLElement) => { window.clearTimeout(fechar.current); definirPop({ c, r: el.getBoundingClientRect(), el }) }
  const esconder = () => { window.clearTimeout(fechar.current); fechar.current = window.setTimeout(() => definirPop(null), 160) }
  // A ficha acompanha a lombada quando a página rola (o foco do teclado rola até o livro); some se o livro sai da tela.
  useEffect(() => {
    if (!pop) return
    let quadro = 0
    const seguir = () => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        const r = pop.el.getBoundingClientRect()
        if (r.bottom < 0 || r.top > window.innerHeight) definirPop(null)
        else definirPop((p) => (p && p.el === pop.el ? { ...p, r } : p))
      })
    }
    window.addEventListener('scroll', seguir, { passive: true })
    window.addEventListener('resize', seguir)
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('scroll', seguir); window.removeEventListener('resize', seguir) }
  }, [pop?.el]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(fechar.current), [])
  const clicar = (c: ResumoCapitulo) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cliqueComum(e)) return
    e.preventDefault()
    definirPop(null)
    aoAbrir(c)
  }

  const porId = new Map(baias.map((b) => [b.id, b]))
  return (
    <div className={'bb-parede' + (celular ? ' bb-parede--celular' : '')} ref={parede} id="bb-estantes" onMouseLeave={esconder}>
      {salaRaros}
      {fileiras.map((fileira, fi) => (
        <div key={fi} className="bb-fileira">
          {fileira.map((coluna, ci) => (
            <div key={ci} className="bb-coluna" style={{ flexGrow: celular ? undefined : Math.max(...coluna.map((x) => x.vagas)), flexBasis: celular ? undefined : `${Math.max(...coluna.map((x) => x.vagas)) * VAGA + LATERAIS}px` }}>
              {coluna.map(({ id, vagas }, bi) => {
                const b = porId.get(id)!
                return <BaiaEstante key={id} b={b} vagas={vagas} indice={fi * 10 + ci * 3 + bi} celular={celular} leituras={leituras} premium={premium} salao={salao}
                  realce={realce} primeiraBusca={primeiraBusca} torto={id === baiaTorta} escada={id === baiaEscada}
                  aoMostrar={mostrar} aoEsconder={esconder} aoClicar={clicar} ativo={pop?.c.id ?? null} guia={fi === 0 && ci === 0 && bi === 0} />
              })}
            </div>
          ))}
        </div>
      ))}
      {pop && temMouse() && <FichaCurta c={pop.c} r={pop.r} leitura={leituras[pop.c.id]} aoEntrar={() => window.clearTimeout(fechar.current)} aoSair={esconder} />}
    </div>
  )
}

function BaiaEstante({ b, vagas, indice, celular, leituras, premium, salao, realce, primeiraBusca, torto, escada, aoMostrar, aoEsconder, aoClicar, ativo, guia }: {
  b: Baia; vagas: number; indice: number; celular: boolean; leituras: Record<string, Leitura | undefined>; premium: boolean; salao: Salao
  realce: string | null; primeiraBusca: string | null; torto: boolean; escada: boolean
  aoMostrar: (c: ResumoCapitulo, el: HTMLElement) => void; aoEsconder: () => void; aoClicar: (c: ResumoCapitulo) => (e: MouseEvent<HTMLAnchorElement>) => void; ativo: string | null
  guia: boolean
}) {
  const completo = b.lidos === b.total
  const n = b.capitulos.length + (torto ? 1 : 0)
  const linhas = celular ? 1 : Math.ceil(n / vagas)
  const sobraUltima = celular ? 0 : linhas * vagas - n
  const prateleira = useRef<HTMLDivElement>(null)
  const [posEscada, definirPosEscada] = useState<CSSProperties | undefined>(undefined)
  useLayoutEffect(() => {
    if (!escada || !primeiraBusca) { definirPosEscada(undefined); return }
    const alvo = prateleira.current?.querySelector<HTMLElement>(`[data-cap="${CSS.escape(primeiraBusca)}"]`)
    definirPosEscada(alvo ? { left: alvo.parentElement!.offsetLeft - 30, right: 'auto' } : undefined)
  }, [escada, primeiraBusca, vagas])
  const passagem = torto ? salao.passagem : 'fechada'
  return (
    <section id={b.id} className={'bb-baia' + (b.cobrados ? ' bb-baia--cobrados' : '') + (passagem === 'girando' ? ' bb-baia--girando' : '')}
      style={{ '--vagas': vagas, '--capa': b.capa } as CSSProperties} aria-labelledby={`${b.id}-t`}>
      <header className="bb-baia__placa">
        <span className="bb-baia__capa" aria-hidden="true">{b.cobrados ? <b>★</b> : <><b>{b.titulo.split(' ')[0]}</b><small>{b.edicoes.split(' e ')[0]}</small></>}</span>
        <div className="bb-baia__nome">
          <h2 id={`${b.id}-t`}>{b.titulo} <small>{b.cobrados ? '' : `${b.edicoes} · `}{b.capitulos.length < b.total ? `${b.capitulos.length} de ${b.total}` : b.total} {b.total === 1 ? 'resumo' : 'resumos'}</small></h2>
          {b.sobre && <p className="bb-baia__sobre">{b.sobre}</p>}
        </div>
        {!b.cobrados && <p className={'bb-baia__conta' + (completo ? ' bb-baia__conta--completa' : '')}>{completo ? 'Coleção completa' : <><b className="numerico">{b.lidos}</b> de {b.total} lidos</>}</p>}
      </header>
      <div className={'bb-baia__corpo' + (celular ? ' bb-baia__corpo--rola' : '')} ref={prateleira} style={{ '--linhas': linhas } as CSSProperties}>
        {passagem === 'aberta' ? <p className="bb-passagem">A estante girou. A Sala dos raros está aberta no alto da parede.</p> : <ul className="bb-livros" aria-label={b.cobrados ? 'Mais cobrados nas provas' : `Resumos do ${b.titulo}`}>
          {b.capitulos.map((c, ci) => <Volume key={c.id} guia={guia && ci === 0} c={c} leitura={leituras[c.id]} fechado={c.acesso !== 'gratis' && !premium} comLivro={!!b.cobrados}
            alvo={c.id === realce || c.id === primeiraBusca} ativo={ativo === c.id} aoMostrar={aoMostrar} aoEsconder={aoEsconder} aoClicar={aoClicar(c)} />)}
          {torto && <li className="bb-torto"><button type="button" onClick={salao.acoes.abrirPassagem} aria-label="Um livro torto na prateleira" /></li>}
          {celular && escada && <li className="bb-escada-li"><button type="button" className={`bb-escada bb-escada--${Math.min(salao.escada, 3)}`} onClick={salao.acoes.tocarEscada} aria-label="Escada da biblioteca" /></li>}
          {sobraUltima > 0 && <li className="bb-enfeite" aria-hidden="true" style={{ gridColumn: `span ${sobraUltima}` }}><Enfeite i={indice} /></li>}
        </ul>}
        {escada && !celular && passagem !== 'aberta' && <button type="button" className={`bb-escada bb-escada--${Math.min(salao.escada, 3)}`} onClick={salao.acoes.tocarEscada} aria-label="Escada da biblioteca" style={posEscada} />}
      </div>
    </section>
  )
}

/** Os objetos que completam a última prateleira (apoio de livros, pilha deitada, ampulheta, vaso): nunca um livro falso. */
function Enfeite({ i }: { i: number }) {
  const tipo = i % 4
  return <span className={`bb-enfeite__obj bb-enfeite__obj--${tipo}`}>
    {tipo === 0 && <><span className="bb-apoio" /><span className="bb-pilha"><i /><i /><i /></span></>}
    {tipo === 1 && <><span className="bb-ampulheta" /><span className="bb-pilha bb-pilha--baixa"><i /><i /></span></>}
    {tipo === 2 && <><Sprite grade={PLANTA} paleta={PALETA_PLANTA} px={3} /><span className="bb-apoio" /></>}
    {tipo === 3 && <><span className="bb-pilha"><i /><i /><i /><i /></span><span className="bb-vela" /></>}
  </span>
}

function Volume({ c, leitura, fechado, comLivro, alvo, ativo, guia, aoMostrar, aoEsconder, aoClicar }: {
  c: ResumoCapitulo; guia: boolean; leitura?: Leitura; fechado: boolean; comLivro: boolean; alvo: boolean; ativo: boolean
  aoMostrar: (c: ResumoCapitulo, el: HTMLElement) => void; aoEsconder: () => void; aoClicar: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  const estado = estadoLeitura(leitura)
  const r = raridade(c.questoes.length)
  const n = numeroCapitulo(c)
  const estilo = { '--cor': corDaArea(c.especialidade), '--alt': `${148 + Math.round(Math.min(c.minutos, 70) / 70 * 34)}px` } as CSSProperties
  const rotulo = `${c.titulo}. ${rotuloLivro(c)}${n === Number.MAX_SAFE_INTEGER ? '' : `, capítulo ${n}`}. Cerca de ${c.minutos} minutos, ${c.questoes.length} questões de prova. ${estado === 'andamento' ? `${pctLido(leitura)}% lido` : ESTADO_NOME[estado]}${fechado ? ', para assinantes' : ''}. Abrir a ficha.`
  return (
    <li className="bb-vol-li">
      <a href={href(`/resumos/${c.id}`)} className={`bb-vol bb-vol--${estado} bb-vol--${r}${alvo ? ' bb-vol--alvo' : ''}${ativo ? ' bb-vol--ativo' : ''}`} style={estilo}
        data-cap={c.id} data-guia={guia ? 'cartao' : undefined} aria-label={rotulo} onClick={aoClicar}
        onMouseEnter={(e) => temMouse() && aoMostrar(c, e.currentTarget)} onMouseLeave={aoEsconder}
        onFocus={(e) => aoMostrar(c, e.currentTarget)} onBlur={aoEsconder}>
        <span className="bb-vol__num" aria-hidden="true">{n === Number.MAX_SAFE_INTEGER ? '·' : n}</span>
        <span className="bb-vol__titulo" aria-hidden="true">{comLivro ? <small>{rotuloLivro(c).split(' · ')[0]}</small> : null}{tituloLombada(c.titulo)}</span>
        <span className={`bb-gema bb-gema--${r}`} aria-hidden="true" />
        {estado === 'andamento' && <span className="bb-vol__fita" aria-hidden="true" />}
        {estado === 'concluido' && <span className="bb-vol__selo" aria-hidden="true" />}
      </a>
    </li>
  )
}

/** A ficha curta ao lado da lombada: o título inteiro, o livro, o capítulo e o estado. Dá para levar o mouse até ela. */
function FichaCurta({ c, r, leitura, aoEntrar, aoSair }: { c: ResumoCapitulo; r: DOMRect; leitura?: Leitura; aoEntrar: () => void; aoSair: () => void }) {
  const estado = estadoLeitura(leitura)
  const rar = raridade(c.questoes.length)
  const larg = Math.min(320, window.innerWidth - 24)
  const x = Math.max(12, Math.min(window.innerWidth - 12 - larg, r.left + r.width / 2 - larg / 2))
  const acima = r.top > 260
  const estilo = { left: x, width: larg, ...(acima ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }), '--seta': `${r.left + r.width / 2 - x}px` } as unknown as CSSProperties
  const n = numeroCapitulo(c)
  return (
    <div className={`bb-ficha-curta${acima ? '' : ' bb-ficha-curta--embaixo'}`} style={estilo} onMouseEnter={aoEntrar} onMouseLeave={aoSair} aria-hidden="true">
      <p className="bb-ficha-curta__ref">{rotuloLivro(c)}{n === Number.MAX_SAFE_INTEGER ? '' : ` · Cap. ${n}`} · {nomeArea(c.especialidade)}</p>
      <strong className="bb-ficha-curta__titulo">{c.titulo}</strong>
      <p className="bb-ficha-curta__meta"><span>~{c.minutos} min</span><span>{c.questoes.length} questões de prova</span><span className={`bb-raridade bb-raridade--${rar}`}><span className={`bb-gema bb-gema--${rar}`} /> {NOME_RARIDADE[rar]}</span></p>
      <p className={`bb-ficha-curta__estado bb-ficha-curta__estado--${estado}`}>
        {estado !== 'novo' && <span className="bb-barra"><span style={{ width: `${pctLido(leitura)}%` }} /></span>}
        <b>{estado === 'andamento' ? `${pctLido(leitura)}% lido` : ESTADO_NOME[estado]}</b>
        <span className="bb-ficha-curta__dica">Clique para ver a ficha</span>
      </p>
    </div>
  )
}
