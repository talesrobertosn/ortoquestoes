import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { METRICAS, ROTULO_QUALIDADE, type IdMetrica, type Qualidade, type Variacao } from '../dados/metricas'
import { Icone, type NomeIconeAdmin } from './Icone'
import { inteiro } from './formato'

/* ───────────── Superfícies ───────────── */

/** Painel: superfície branca com borda de 1 px. Cabeça (título, descrição, ações), corpo e pé opcionais. */
export function Painel({ titulo, descricao, acoes, pe, children, justo = false, plano = false, className = '', id, rotulo }: {
  titulo?: ReactNode; descricao?: ReactNode; acoes?: ReactNode; pe?: ReactNode; children?: ReactNode
  justo?: boolean; plano?: boolean; className?: string; id?: string; rotulo?: string
}) {
  const idTitulo = useId()
  return <section id={id} className={`a3-painel${plano ? ' a3-painel--plano' : ''} ${className}`} aria-labelledby={titulo ? idTitulo : undefined} aria-label={!titulo ? rotulo : undefined}>
    {(titulo || acoes) && <header className="a3-painel__cabeca">
      <div>{titulo && <h2 id={idTitulo} className="a3-titulo-3">{titulo}</h2>}{descricao && <p>{descricao}</p>}</div>
      {acoes && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{acoes}</div>}
    </header>}
    {children !== undefined && children !== null && children !== false && <div className={justo ? 'a3-painel__corpo a3-painel__corpo--justo' : 'a3-painel__corpo'}>{children}</div>}
    {pe && <footer className="a3-painel__pe">{pe}</footer>}
  </section>
}

/* ───────────── Dados ───────────── */

export function SeloQualidade({ q }: { q: Qualidade }) {
  return <span className={`a3-qualidade a3-qualidade--${q}`}><i aria-hidden="true" />{ROTULO_QUALIDADE[q]}</span>
}

/** "+12%" com seta e cor só quando há sentido (sobe bom / sobe ruim). Sem base: diz que não há. */
export function VariacaoTexto({ v, bom = 'sobe', formato = inteiro, curto = false }: { v: Variacao | null | undefined; bom?: 'sobe' | 'desce'; formato?: (n: number) => string; curto?: boolean }) {
  if (!v || v.anterior === null || v.delta === null) return <span className="a3-variacao a3-variacao--neutro">{curto ? 'sem base' : 'sem período anterior'}</span>
  const sentido = v.delta > 0 ? 'sobe' : v.delta < 0 ? 'desce' : 'igual'
  const tom = sentido === 'igual' ? 'neutro' : sentido === bom ? 'bom' : 'ruim'
  const texto = sentido === 'igual' ? 'igual' : v.pct !== null ? `${v.pct > 0 ? '+' : ''}${v.pct}%` : `${v.delta > 0 ? '+' : '−'}${formato(Math.abs(v.delta))}`
  return <span className={`a3-variacao a3-variacao--${tom}`} title={`Antes: ${formato(v.anterior)}`}>
    {sentido !== 'igual' && <Icone nome={sentido === 'sobe' ? 'sobe' : 'desce'} tamanho={13} />}{texto}
  </span>
}

/** Minigráfico de tendência (decorativo: o número e a variação dizem o mesmo em texto). */
export function Mini({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null
  const max = Math.max(...valores, 1)
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * 100, 32 - (v / max) * 28] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  return <svg className="a3-mini" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path className="area" d={`${d} L100 34 L0 34 Z`} /><path className="linha" d={d} />
  </svg>
}

/**
 * Métrica: rótulo, valor (null = indisponível, nunca zero), unidade, qualidade, variação, nota, tendência.
 * O "?" abre a definição do dicionário (pergunta, conta, janela, fonte, contas de teste).
 * Com `aoInvestigar`, o bloco inteiro leva ao registro que gerou o número.
 */
export function Metrica({ metrica, rotulo, valor, unidade, qualidade, variacao, nota, tendencia, aoInvestigar, grande = false, formato }: {
  metrica?: IdMetrica; rotulo?: string; valor: string | null; unidade?: string; qualidade?: Qualidade
  variacao?: Variacao | null; nota?: ReactNode; tendencia?: number[]; aoInvestigar?: () => void; grande?: boolean; formato?: (n: number) => string
}) {
  const def = metrica ? METRICAS[metrica] : null
  const q: Qualidade = valor === null ? 'indisponivel' : qualidade ?? (def?.qualidade as Qualidade) ?? 'confirmado'
  const [aberta, definirAberta] = useState(false)
  const idDef = useId()
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberta) return
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) definirAberta(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') definirAberta(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla) }
  }, [aberta])
  const nome = rotulo ?? def?.nome ?? ''
  return <div ref={caixa} className={`a3-metrica${grande ? ' a3-metrica--grande' : ''}${valor === null ? ' a3-metrica--indisponivel' : ''}`}>
    {aoInvestigar && <button type="button" className="a3-metrica__ir" onClick={aoInvestigar} aria-label={`${nome}: investigar`} />}
    <div className="a3-metrica__topo">
      <span className="a3-rotulo">{nome}</span>
      {def && <button type="button" className="a3-metrica__def" aria-expanded={aberta} aria-controls={idDef} onClick={() => definirAberta(a => !a)}>
        <Icone nome="info" tamanho={15} /><span className="a3-so-leitor">Como “{nome}” é calculado</span>
      </button>}
    </div>
    <div className="a3-metrica__valor">{valor ?? 'Indisponível'}{valor !== null && unidade && <small>{unidade}</small>}</div>
    <div className="a3-metrica__linha">
      {variacao !== undefined && valor !== null && <VariacaoTexto v={variacao} bom={def?.bom as 'sobe' | 'desce' | undefined} formato={formato} />}
      <SeloQualidade q={q} />
    </div>
    {nota && <div className="a3-metrica__linha">{nota}</div>}
    {tendencia && valor !== null && <Mini valores={tendencia} />}
    {aberta && def && <dl className="a3-balao" id={idDef}>
      <div><dt>Pergunta</dt><dd>{def.pergunta}</dd></div>
      <div><dt>Conta</dt><dd>{def.numerador}{'denominador' in def && def.denominador ? ` ÷ ${def.denominador}` : ''}</dd></div>
      <div><dt>Janela</dt><dd>{def.janela}</dd></div>
      <div><dt>Fonte</dt><dd>{def.fonte}</dd></div>
      <div><dt>Contas de teste</dt><dd>{def.testes}</dd></div>
    </dl>}
  </div>
}

/* ───────────── Controles ───────────── */

export function Segmento<T extends string | number>({ opcoes, valor, aoMudar, rotulo }: { opcoes: Array<[T, string]>; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return <div className="a3-segmento" role="group" aria-label={rotulo}>
    {opcoes.map(([v, r]) => <button key={String(v)} type="button" aria-pressed={valor === v} onClick={() => aoMudar(v)}>{r}</button>)}
  </div>
}

export function Busca({ valor, aoMudar, rotulo, dica }: { valor: string; aoMudar: (v: string) => void; rotulo: string; dica?: string }) {
  return <label className="a3-busca">
    <span className="a3-so-leitor">{rotulo}</span>
    <Icone nome="busca" tamanho={16} />
    <input className="a3-entrada" type="search" value={valor} placeholder={dica ?? rotulo} onChange={e => aoMudar(e.target.value)} />
    {valor && <button type="button" className="a3-busca__limpar" onClick={() => aoMudar('')} aria-label="Limpar a busca"><Icone nome="fechar" tamanho={13} /></button>}
  </label>
}

export function Interruptor({ marcado, aoMudar, titulo, descricao, desativado }: { marcado: boolean; aoMudar: (v: boolean) => void; titulo: ReactNode; descricao?: ReactNode; desativado?: boolean }) {
  return <label className="a3-interruptor">
    <input type="checkbox" role="switch" checked={marcado} disabled={desativado} onChange={e => aoMudar(e.target.checked)} />
    <span className="a3-interruptor__trilho" aria-hidden="true" />
    <span style={{ display: 'grid', gap: 2 }}><span className="a3-titulo-3">{titulo}</span>{descricao && <span className="a3-mudo a3-pequeno">{descricao}</span>}</span>
  </label>
}

/** Botão de filtro em pílula tracejada: vazio = disponível, sólido = ligado. */
export function Filtro({ ativo, aoClicar, children, contagem }: { ativo: boolean; aoClicar: () => void; children: ReactNode; contagem?: number }) {
  return <button type="button" className="a3-filtro" aria-pressed={ativo} onClick={aoClicar}>
    {children}{contagem !== undefined && <small>{inteiro(contagem)}</small>}
  </button>
}

/** Filtros ligados, removíveis um a um, e "Limpar tudo". */
export function FiltrosAtivos({ itens, aoLimpar }: { itens: Array<{ id: string; rotulo: string; remover: () => void }>; aoLimpar: () => void }) {
  if (!itens.length) return null
  return <div className="a3-ativos" aria-label="Filtros ligados">
    {itens.map(i => <button key={i.id} type="button" onClick={i.remover} aria-label={`Tirar o filtro ${i.rotulo}`}>{i.rotulo}<Icone nome="fechar" tamanho={12} /></button>)}
    <button type="button" className="a3-link" style={{ background: 'none', textDecoration: 'underline' }} onClick={aoLimpar}>Limpar tudo</button>
  </div>
}

/* ───────────── Estados ───────────── */

export function Esqueleto({ altura = 16, largura = '100%', raio }: { altura?: number; largura?: number | string; raio?: number }) {
  return <span className="a3-esqueleto" style={{ height: altura, width: largura, borderRadius: raio }} aria-hidden="true" />
}

/** Carregando com a forma do que vem (sem spinner genérico). */
export function Carregando({ linhas = 4, texto = 'Carregando…' }: { linhas?: number; texto?: string }) {
  return <div role="status" aria-live="polite" style={{ display: 'grid', gap: 10, padding: '4px 0' }}>
    <span className="a3-so-leitor">{texto}</span>
    {Array.from({ length: linhas }, (_, i) => <Esqueleto key={i} altura={i === 0 ? 22 : 14} largura={i === 0 ? '40%' : `${92 - i * 9}%`} />)}
  </div>
}

export function Estado({ tipo = 'vazio', icone, titulo, texto, acao, compacto = false }: {
  tipo?: 'vazio' | 'erro'; icone?: NomeIconeAdmin; titulo: string; texto?: ReactNode; acao?: ReactNode; compacto?: boolean
}) {
  return <div className={`a3-estado${tipo === 'erro' ? ' a3-estado--erro' : ''}${compacto ? ' a3-estado--compacto' : ''}`} role={tipo === 'erro' ? 'alert' : undefined}>
    <span className="a3-estado__marca"><Icone nome={icone ?? (tipo === 'erro' ? 'alerta' : 'grade')} tamanho={20} /></span>
    <h3>{titulo}</h3>
    {texto && <p>{texto}</p>}
    {acao}
  </div>
}

export function Faixa({ tom, titulo, children, acao }: { tom?: 'erro' | 'aviso' | 'ok'; titulo?: ReactNode; children?: ReactNode; acao?: ReactNode }) {
  return <div className={`a3-faixa${tom ? ` a3-faixa--${tom}` : ''}`} role={tom === 'erro' ? 'alert' : undefined}>
    <Icone nome={tom === 'erro' ? 'alerta' : tom === 'ok' ? 'certo' : 'info'} tamanho={16} />
    <div>{titulo && <b style={{ fontWeight: 600 }}>{titulo}</b>}{children && <span>{children}</span>}</div>
    {acao}
  </div>
}

/** Ponto de situação + texto: a cor nunca é a única pista. */
export function Situacao({ tom, children }: { tom: 'ok' | 'aviso' | 'erro' | 'neutro' | 'vivo'; children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><i className={`a3-ponto${tom !== 'neutro' ? ` a3-ponto--${tom}` : ''}`} aria-hidden="true" />{children}</span>
}

export function Selo({ tom, solido, contorno, children }: { tom?: 'ok' | 'aviso' | 'erro' | 'acento'; solido?: boolean; contorno?: boolean; children: ReactNode }) {
  return <span className={`a3-selo${tom ? ` a3-selo--${tom}` : ''}${solido ? ' a3-selo--solido' : ''}${contorno ? ' a3-selo--contorno' : ''}`}>{children}</span>
}

/** Cabeçalho de página: rótulo da área, título, a pergunta que a página responde e as ações. */
export function Cabeca({ area, titulo, pergunta, acoes, extra }: { area: string; titulo: string; pergunta: string; acoes?: ReactNode; extra?: ReactNode }) {
  return <header className="a3-cabeca">
    <div className="a3-cabeca__texto">
      <span className="a3-rotulo">{area}</span>
      <h1 className="a3-titulo-1">{titulo}</h1>
      <p>{pergunta}</p>
      {extra}
    </div>
    {acoes && <div className="a3-cabeca__acoes">{acoes}</div>}
  </header>
}
