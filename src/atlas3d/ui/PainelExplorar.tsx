import { Icone } from '../../componentes/Icone'
import { href } from '../../util/rotas'
import { corDaArea } from '../../dados/coresAreas'
import { GRUPOS, grupoDe } from '../config'
import type { Catalogo, Estrutura, Grupo } from '../tipos'
import { LADO, nomeDe } from '../dados/nomes'
import { REGIOES, REGIOES_CORPO, type Lateralidade, type Regiao } from '../dados/regioes'
import { CORES_PRESET, PRESETS, type Preset } from '../dados/presets'
import { SISTEMAS, type Modo, type Sistema } from '../dados/modos'
import { hex } from './cor'
import { temasDaRegiao, type TemaEstudo } from '../dados/temasEstudo'

interface Props {
  modo: Modo
  aoTrocarModo: (m: Modo) => void
  busca: string
  aoBuscar: (t: string) => void
  resultados: Estrutura[]
  /** quantas estruturas a busca acharia no outro modo (a Ortopedia não mostra órgãos) */
  noOutroModo: number
  regioesAchadas: Regiao[]
  presetsAchados: Preset[]
  regiao?: Regiao
  lado: Lateralidade
  aoRegiao: (id: string | null, lado?: Lateralidade) => void
  preset: Preset | null
  temBanco: boolean
  aoPreset: (p: Preset) => void
  sistemaAtivo?: string
  aoSistema: (s: Sistema) => void
  /** camada que pede assinatura para esta pessoa (cadeado) */
  fechado: (g: Grupo) => boolean
  assinante: boolean
  /** abre o Teste-se (num grupo, quando vem do atalho) */
  aoEstudar: (tema?: string | null) => void
  temaFechado: (t: TemaEstudo) => boolean
  favoritos: string[]
  recentes: string[]
  catalogo: Catalogo | null
  aoIr: (e: Estrutura) => void
}

/**
 * Painel Explorar. Na Ortopedia: regiões ortopédicas, lado, visualizações prontas, favoritas e recentes. No Corpo
 * inteiro: os sistemas (cada um abre o navegador por partes) e as regiões do tronco e da cabeça. A busca serve aos
 * dois modos e avisa quando há mais resultados do outro lado.
 */
export function PainelExplorar(p: Props) {
  const buscando = p.busca.trim().length >= 2
  const corpo = p.modo === 'corpo'
  const regioes = corpo ? REGIOES_CORPO : REGIOES
  return (
    <aside className={`atlas__explorar${corpo ? ' atlas__explorar--corpo' : ''}`} aria-label="Explorar">
      <label className="at-busca"><Icone nome="busca" tamanho={17} />
        <input type="search" value={p.busca} onChange={(e) => p.aoBuscar(e.target.value)} placeholder={corpo ? 'Buscar: fígado, nervo vago, aorta…' : 'Buscar: fêmur, nervo radial, LCA…'} aria-label="Buscar estrutura" />
      </label>
      {buscando ? (
        <ul className="at-resultados">
          {p.regioesAchadas.map((r) => <li key={`r-${r.id}`}><button type="button" onClick={() => { p.aoRegiao(r.id); p.aoBuscar('') }}><Icone nome="mapa" tamanho={14} />{r.nome}<small>região</small></button></li>)}
          {p.presetsAchados.map((x) => <li key={`p-${x.id}`}><button type="button" onClick={() => { p.aoPreset(x); p.aoBuscar('') }}><Icone nome="olho" tamanho={14} />{x.nome}<small>visualização</small></button></li>)}
          {p.resultados.map((e) => (
            <li key={e.id}><button type="button" onClick={() => p.aoIr(e)}>
              <span className="at-ponto" style={{ background: hex(GRUPOS[grupoDe(e)].cor) }} />{nomeDe(e)}
              {p.fechado(grupoDe(e)) ? <Icone nome="cadeado" tamanho={12} /> : e.s !== 'm' && <small>{LADO[e.s]}</small>}
            </button></li>
          ))}
          {!p.resultados.length && !p.regioesAchadas.length && !p.presetsAchados.length && <li className="at-vazio">Nada encontrado com esse nome.</li>}
          {p.noOutroModo > 0 && (
            <li><button type="button" className="at-resultados__outro" onClick={() => p.aoTrocarModo(corpo ? 'ortopedia' : 'corpo')}>
              <Icone nome="direita" tamanho={14} />{p.noOutroModo} {p.noOutroModo === 1 ? 'resultado' : 'resultados'} no {corpo ? 'modo Ortopedia' : 'Corpo inteiro'}
            </button></li>
          )}
        </ul>
      ) : (
        <>
          {corpo && (
            <>
              <h2 className="at-titulo-secao"><Icone nome="cubo" tamanho={14} /> Sistemas do corpo</h2>
              {!p.assinante && (
                <div className="at-faixa-plano">
                  <p><strong>Os sistemas fazem parte da assinatura.</strong> Ossos e músculos continuam livres para você explorar à vontade.</p>
                  <a className="at-ouro at-ouro--curto" href={href('/assinatura')}>Conhecer os planos</a>
                </div>
              )}
              <div className="at-sistemas">
                {SISTEMAS.map((s) => (
                  <button key={s.id} type="button" className={`at-sistema${p.sistemaAtivo === s.id ? ' at-sistema--ativo' : ''}`} style={{ ['--at-area' as string]: s.cor }} onClick={() => p.aoSistema(s)}>
                    <i aria-hidden="true" />
                    <strong>{s.nome}</strong>
                    <small>{s.resumo}</small>
                    {!p.assinante && <span className="at-sistema__cadeado" aria-label="para assinantes"><Icone nome="cadeado" tamanho={12} /></span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {!corpo && (
            <section className="at-cartao-estudo" aria-label="Teste-se">
              <div className="at-cartao-estudo__topo">
                <span className="at-cartao-estudo__selo"><Icone nome="alvo" tamanho={13} /> Teste-se</span>
                <button type="button" className="at-cartao-estudo__todos" onClick={() => p.aoEstudar(null)}>Todos os grupos<Icone nome="direita" tamanho={14} /></button>
              </div>
              <p>{p.regiao ? `Treine os nomes de ${p.regiao.nome.toLowerCase()}: o atlas acende, você responde.` : 'Escolha um grupo e treine os nomes: o atlas acende, você responde.'}</p>
              <div className="at-cartao-estudo__temas">
                {temasDaRegiao(p.regiao?.id).map((t) => (
                  <button key={t.id} type="button" onClick={() => p.aoEstudar(t.id)} style={{ ['--at-tema' as string]: hex(GRUPOS[t.grupos[0]].cor) }}>
                    <i aria-hidden="true" />{t.nome}{p.temaFechado(t) && <Icone nome="cadeado" tamanho={11} />}
                  </button>
                ))}
              </div>
            </section>
          )}
          <h2 className="at-titulo-secao"><Icone nome="mapa" tamanho={14} /> {corpo ? 'Regiões do tronco e da cabeça' : 'Regiões ortopédicas'}</h2>
          <div className="at-regioes">
            <button type="button" className={`at-regiao${!p.regiao ? ' at-regiao--ativa' : ''}`} style={{ ['--at-area' as string]: 'var(--verdete)' }} onClick={() => p.aoRegiao(null)}>
              <strong>{corpo ? 'Visão geral' : 'Esqueleto inteiro'}</strong><small>{corpo ? 'Todos os sistemas no lugar, sem recorte' : 'Sem recorte de região'}</small>
            </button>
            {regioes.map((r) => (
              <button type="button" key={r.id} className={`at-regiao${p.regiao?.id === r.id ? ' at-regiao--ativa' : ''}`} style={{ ['--at-area' as string]: corDaArea(r.area) }} onClick={() => p.aoRegiao(r.id)}>
                <strong>{r.nome}</strong><small>{r.resumo}</small>
              </button>
            ))}
          </div>
          {p.regiao?.membro && (
            <div className="at-segmentos" role="group" aria-label="Lado">
              {(['ambos', 'd', 'e'] as Lateralidade[]).map((l) => <button key={l} type="button" aria-pressed={p.lado === l} onClick={() => p.aoRegiao(p.regiao!.id, l)}>{l === 'ambos' ? 'Ambos' : l === 'd' ? 'Direito' : 'Esquerdo'}</button>)}
            </div>
          )}
          {!corpo && p.temBanco && (
            <>
              <h2 className="at-titulo-secao"><Icone nome="olho" tamanho={14} /> Visualizações prontas{p.regiao ? ` · ${p.regiao.nome}` : ''}</h2>
              <div className="at-presets">
                {(p.regiao ? PRESETS.filter((x) => x.regiao === p.regiao!.id) : PRESETS).map((x) => (
                  <button type="button" key={x.id} className={`at-preset${p.preset?.id === x.id ? ' at-preset--ativo' : ''}`} onClick={() => p.aoPreset(x)}>
                    <span className="at-preset__cores" aria-hidden="true">{x.chaves.slice(0, 4).map((c, i) => <i key={c} style={{ background: CORES_PRESET[i] }} />)}</span>
                    <strong>{x.nome}</strong><small>{x.resumo}</small>
                  </button>
                ))}
                {p.regiao && !PRESETS.some((x) => x.regiao === p.regiao!.id) && <p className="at-nota">Ainda não há visualização pronta para esta região.</p>}
              </div>
            </>
          )}
          {!corpo && (
            <button type="button" className="at-convite-corpo" onClick={() => p.aoTrocarModo('corpo')}>
              <span><strong>Ver o corpo inteiro</strong><small>Órgãos, encéfalo, vasos, linfáticos e regiões, sem sair do atlas</small></span>
              <Icone nome="direita" tamanho={18} />
            </button>
          )}
          {p.catalogo && p.favoritos.length > 0 && <ListaRapida titulo="Favoritas" ids={p.favoritos} catalogo={p.catalogo} aoIr={p.aoIr} />}
          {p.catalogo && p.recentes.length > 0 && <ListaRapida titulo="Recentes" ids={p.recentes} catalogo={p.catalogo} aoIr={p.aoIr} />}
        </>
      )}
    </aside>
  )
}

function ListaRapida({ titulo, ids, catalogo, aoIr }: { titulo: string; ids: string[]; catalogo: Catalogo; aoIr: (e: Estrutura) => void }) {
  const lista = ids.map((id) => catalogo.estruturas.find((e) => e.id === id)).filter(Boolean).slice(0, 8) as Estrutura[]
  if (!lista.length) return null
  return (
    <>
      <h2 className="at-titulo-secao"><Icone nome={titulo === 'Favoritas' ? 'estrela' : 'relogio'} tamanho={14} /> {titulo}</h2>
      <ul className="at-resultados at-resultados--curta">{lista.map((e) => <li key={e.id}><button type="button" onClick={() => aoIr(e)}><span className="at-ponto" style={{ background: hex(GRUPOS[grupoDe(e)].cor) }} />{nomeDe(e)}{e.s !== 'm' && <small>{LADO[e.s]}</small>}</button></li>)}</ul>
    </>
  )
}
