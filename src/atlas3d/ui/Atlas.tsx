import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Motor, type Corte, type EixoCorte, type Passagem, type Vista } from '../motor/Motor'
import { carregarCatalogo } from '../motor/carregador'
import { GRUPOS, ORDEM_GRUPOS, grupoDe } from '../config'
import type { Catalogo, Estrutura, Grupo, Selecao } from '../tipos'
import { REGIOES, caixasDaRegiao, regiaoPorId, type Lateralidade } from '../dados/regioes'
import { LADO, nomeCompleto, nomeDe } from '../dados/nomes'
import { fichaDe, carregarVinculos, type Vinculo } from '../dados/fichas'
import { buscar } from '../dados/busca'
import { Icone } from '../../componentes/Icone'
import { usarTelaLarga } from '../../componentes/JanelaCentral'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { navegar } from '../../util/rotas'
import { PainelFicha } from './PainelFicha'
import { PainelQuestoes } from './PainelQuestoes'
import { EsperaPixel } from '../../componentes/EsperaPixel'
import { usarConta } from '../../conta/ContextoConta'
import { usarPremium } from '../../conta/premium'
import { ConviteAtlas, type TipoConvite } from './ConviteAtlas'
import { corDaArea } from '../../dados/coresAreas'
import '../../estilos/paginas/Atlas3D.css'

type Altura = 'espiada' | 'meia' | 'inteira'
/** Na conta grátis: ossos e músculos. O resto, para assinantes (aparece por alguns segundos e convida). */
const GRATIS = new Set<Grupo>(['osso', 'musculo'])
const PREVIA_MS = 3000
interface Preferencias { recentes: string[]; favoritos: string[]; dicasVistas: boolean }
const PREF_PADRAO: Preferencias = { recentes: [], favoritos: [], dicasVistas: false }


/**
 * Atlas Ortopédico 3D. Abre como pop-up por cima do site (como os flashcards) e
 * também pelo endereço #/atlas/<região>?e=<estrutura>&f=<faixa>&lado=d|e.
 */
export function Atlas({ segmentos, consulta, aoFechar }: { segmentos: string[]; consulta: URLSearchParams; aoFechar: () => void }) {
  const palco = useRef<HTMLDivElement>(null)
  const motorRef = useRef<Motor | null>(null)
  const larga = usarTelaLarga('56rem')
  const [catalogo, definirCatalogo] = useState<Catalogo | null>(null)
  const [erro, definirErro] = useState<string | null>(null)
  const [progresso, definirProgresso] = useState<Record<string, number>>({})
  const [ligados, definirLigados] = useState<Set<Grupo>>(() => new Set(lerCamadas(consulta)))
  const [selecao, definirSelecao] = useState<Selecao | null>(null)
  const [passagem, definirPassagem] = useState<Passagem | null>(null)
  const [regiaoId, definirRegiaoId] = useState<string | null>(segmentos[1] ?? null)
  const [lado, definirLado] = useState<Lateralidade>((consulta.get('lado') as Lateralidade) || 'ambos')
  // no celular o modelo vem primeiro: as regiões ficam no botão do topo
  const [explorar, definirExplorar] = useState(() => window.matchMedia('(min-width: 56rem)').matches && !consulta.get('e'))
  const [personalizar, definirPersonalizar] = useState(false)
  const [questoes, definirQuestoes] = useState<{ titulo: string; ids: string[] } | null>(null)
  const [altura, definirAltura] = useState<Altura>('espiada')
  const [busca, definirBusca] = useState('')
  const [corte, definirCorteUI] = useState<Corte | null>(null)
  const [vinculos, definirVinculos] = useState<Record<string, Vinculo> | null>(null)
  const [isolado, definirIsolado] = useState(false)
  const [pref, definirPref] = usarArmazenado<Preferencias>('atlas3d:preferencias', PREF_PADRAO)
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  const nivel: 'visitante' | 'conta' | 'assinante' = !sessao ? 'visitante' : premium ? 'assinante' : 'conta'
  const [convite, definirConvite] = useState<TipoConvite | null>(null)
  const previa = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (previa.current) clearTimeout(previa.current) }, [])

  const motor = motorRef.current
  const regiao = regiaoPorId(regiaoId)
  const estrutura = selecao && catalogo ? catalogo.estruturas.find((e) => e.id === selecao.id) : undefined

  // ---------- montar o motor ----------
  useEffect(() => {
    if (!palco.current) return
    const m = new Motor(palco.current, {
      aoSelecionar: (s) => definirSelecao(s),
      aoPassar: (p) => definirPassagem(p),
      aoCarregar: (g, f) => definirProgresso((atual) => ({ ...atual, [g]: f })),
    })
    motorRef.current = m
    let vivo = true
    carregarCatalogo().then(async (cat) => {
      if (!vivo) return
      m.registrar(cat.estruturas)
      definirCatalogo(cat)
      const iniciais = lerCamadas(consulta)
      await Promise.all(iniciais.map((g) => m.ligarGrupo(g, true)))
      if (!vivo) return
      const r = regiaoPorId(segmentos[1])
      const ladoInicial = (consulta.get('lado') as Lateralidade) || 'ambos'
      if (r) m.definirRegiao(caixasDaRegiao(r, ladoInicial))
      m.posicionarImediato(r ? m.caixaDe([]).union(caixasDaRegiao(r, ladoInicial).reduce((a, b) => a.union(b))) : undefined)
      const e = consulta.get('e')
      if (e && cat.estruturas.some((x) => x.id === e)) {
        const f = (consulta.get('f') as Selecao['faixa']) || undefined
        m.selecionar({ id: e, faixa: f })
        m.focar([e], f)
      }
    }).catch(() => vivo && definirErro('Não foi possível abrir o atlas. Verifique a conexão e tente de novo.'))
    carregarVinculos().then((v) => vivo && definirVinculos(v)).catch(() => {})
    return () => { vivo = false; m.descartar(); motorRef.current = null }
    // monta uma vez; o resto do estado conversa com o motor pelos efeitos abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- seleção → ficha, endereço, recentes ----------
  useEffect(() => {
    if (!selecao) { definirQuestoes(null); return }
    definirAltura((a) => (a === 'espiada' ? 'meia' : a))
    definirPref((p) => ({ ...p, recentes: [selecao.id, ...p.recentes.filter((r) => r !== selecao.id)].slice(0, 12) }))
    definirQuestoes(null)
    const q = new URLSearchParams(consulta)
    q.set('e', selecao.id)
    if (selecao.faixa) q.set('f', selecao.faixa); else q.delete('f')
    navegar(`/atlas${regiaoId ? `/${regiaoId}` : ''}?${q}`, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecao?.id, selecao?.faixa])

  // ---------- margens da câmera: o modelo fica no espaço que os painéis deixam livre ----------
  useEffect(() => {
    const m = motorRef.current
    if (!m) return
    const raiz = palco.current?.parentElement
    const medir = () => {
      const ficha = raiz?.querySelector<HTMLElement>('.atlas__ficha')
      const gaveta = raiz?.querySelector<HTMLElement>('.atlas__gaveta')
      const direita = larga && ficha ? ficha.offsetWidth * 0.55 : 0
      const inferior = !larga && gaveta ? Math.min(gaveta.offsetHeight, (raiz?.clientHeight ?? 0) * 0.55) * 0.85 : 0
      m.definirMargens(direita, inferior)
    }
    medir()
    const t = setTimeout(medir, 260) // depois da transição de altura da gaveta
    return () => clearTimeout(t)
  }, [estrutura?.id, larga, altura, questoes])

  // ---------- ações ----------
  /** Liga ou desliga uma camada respeitando o plano: sem conta, convida a criar a conta;
   * na conta grátis, camada de assinante aparece por alguns segundos e depois convida. */
  const mudarGrupo = useCallback(async (g: Grupo, ligar: boolean, depois?: () => void) => {
    const m = motorRef.current
    if (!m) return
    if (nivel === 'visitante') { definirConvite({ tipo: 'conta' }); return }
    definirLigados((atual) => { const novo = new Set(atual); if (ligar) novo.add(g); else novo.delete(g); return novo })
    await m.ligarGrupo(g, ligar)
    depois?.()
    if (ligar && nivel === 'conta' && !GRATIS.has(g)) {
      if (previa.current) clearTimeout(previa.current)
      previa.current = setTimeout(() => {
        definirConvite({ tipo: 'assinante', grupo: g })
        definirLigados((atual) => { const novo = new Set(atual); novo.delete(g); return novo })
        motorRef.current?.ligarGrupo(g, false)
      }, PREVIA_MS)
    }
  }, [nivel])
  const alternarGrupo = useCallback((g: Grupo) => mudarGrupo(g, !ligados.has(g)), [ligados, mudarGrupo])

  const escolherRegiao = useCallback((id: string | null, novoLado: Lateralidade = lado) => {
    const m = motorRef.current
    if (!m) return
    const r = regiaoPorId(id)
    definirRegiaoId(id)
    definirLado(novoLado)
    const caixas = r ? caixasDaRegiao(r, novoLado) : null
    m.definirRegiao(caixas)
    m.selecionar(null)
    if (caixas) m.focar(caixas.reduce((a, b) => a.clone().union(b)), undefined)
    else m.enquadrarTudo()
    if (r?.vista) setTimeout(() => m.vista(r.vista!), 700)
    navegar(`/atlas${id ? `/${id}` : ''}${novoLado !== 'ambos' ? `?lado=${novoLado}` : ''}`, true)
    if (!larga) definirExplorar(false)
  }, [lado, larga])

  const focarSelecao = () => { if (selecao) motorRef.current?.focar([selecao.id], selecao.faixa) }
  const isolarSelecao = () => {
    const m = motorRef.current
    if (!m || !selecao) return
    if (m.estaIsolado) { m.isolar(null); definirIsolado(false) } else { m.isolar([selecao.id]); definirIsolado(true); m.focar([selecao.id], selecao.faixa) }
  }
  const ocultarSelecao = () => { if (selecao) motorRef.current?.ocultar(selecao.id) }
  const restaurar = () => { const m = motorRef.current; if (!m) return; m.isolar(null); m.mostrarTodas(); definirIsolado(false); m.definirCorte(null); definirCorteUI(null) }
  const alternarFavorito = () => { if (!selecao) return; definirPref((p) => ({ ...p, favoritos: p.favoritos.includes(selecao.id) ? p.favoritos.filter((f) => f !== selecao.id) : [selecao.id, ...p.favoritos] })) }

  const irPara = (e: Estrutura) => {
    const m = motorRef.current
    if (!m) return
    const g = grupoDe(e)
    const continuar = () => { m.selecionar({ id: e.id }); m.focar([e.id]) }
    // a estrutura pode estar fora da região atual ou numa camada desligada
    if (regiao && !caixasDaRegiao(regiao, lado).some((c) => c.intersectsBox(m.caixaDe([e.id])))) { definirRegiaoId(null); m.definirRegiao(null) }
    if (!ligados.has(g)) mudarGrupo(g, true, continuar); else continuar()
    definirBusca('')
    if (!larga) definirExplorar(false)
  }

  const mudarCorte = (c: Corte | null) => { definirCorteUI(c); motorRef.current?.definirCorte(c) }

  const resultados = useMemo(() => (catalogo && busca.trim().length >= 2 ? buscar(catalogo.estruturas, busca, 30) : []), [catalogo, busca])
  const ficha = estrutura ? fichaDe(estrutura, selecao?.faixa) : undefined
  const vinculo = ficha && vinculos ? vinculos[ficha.chave] : undefined
  const carregando = ORDEM_GRUPOS.filter((g) => ligados.has(g) && (progresso[g] ?? 0) < 1)
  const nomePassagem = passagem && catalogo ? (() => { const e = catalogo.estruturas.find((x) => x.id === passagem.id); return e ? nomeCompleto(e, passagem.faixa) : '' })() : ''

  // Esc limpa a seleção; F foca; I isola; H esconde
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.closest('input, textarea, [contenteditable]')) return
      const m = motorRef.current
      if (!m) return
      if (ev.key === 'Escape') { if (questoes) definirQuestoes(null); else m.selecionar(null) }
      else if (ev.key === 'f' || ev.key === 'F') focarSelecao()
      else if (ev.key === 'i' || ev.key === 'I') isolarSelecao()
      else if (ev.key === 'h' || ev.key === 'H') ocultarSelecao()
      else if (['1', '2', '3', '4', '5', '6'].includes(ev.key)) m.vista((['anterior', 'posterior', 'direita', 'esquerda', 'superior', 'inferior'] as Vista[])[Number(ev.key) - 1])
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const painelDireito = estrutura ? (
    questoes
      ? <PainelQuestoes titulo={questoes.titulo} ids={questoes.ids} aoVoltar={() => definirQuestoes(null)} />
      : <PainelFicha estrutura={estrutura} faixa={selecao?.faixa} ficha={ficha} vinculo={vinculo} favorita={pref.favoritos.includes(estrutura.id)}
          isolada={isolado} aoFocar={focarSelecao} aoIsolar={isolarSelecao} aoOcultar={ocultarSelecao} aoFavoritar={alternarFavorito}
          aoFechar={() => motorRef.current?.selecionar(null)} aoResponder={(titulo, ids) => { definirQuestoes({ titulo, ids }); definirAltura('inteira') }} />
  ) : null

  return (
    <div className={`atlas${larga ? ' atlas--larga' : ' atlas--estreita'}${questoes && larga ? ' atlas--questoes' : ''}`} role="dialog" aria-modal="true" aria-label="Atlas Ortopédico 3D">
      <div className="atlas__palco" ref={palco} />

      {/* topo */}
      <header className="atlas__topo">
        <button type="button" className={`at-chip${explorar ? ' at-chip--ativo' : ''}`} onClick={() => definirExplorar((v) => !v)} aria-expanded={explorar}>
          <Icone nome="mapa" tamanho={17} /><span>{regiao ? regiao.nome : 'Corpo inteiro'}{regiao?.membro && lado !== 'ambos' ? ` · ${lado === 'd' ? 'direito' : 'esquerdo'}` : ''}</span>
        </button>
        <p className="atlas__marca tr-heroi__selo">Atlas 3D · Beta</p>
        <div className="atlas__acoes-topo">
          <button type="button" className={`at-botao-icone${personalizar ? ' at-botao-icone--ativo' : ''}`} onClick={() => definirPersonalizar((v) => !v)} aria-label="Personalizar" title="Personalizar"><Icone nome="ajustes" tamanho={19} /></button>
          <button type="button" className="at-botao-icone" onClick={aoFechar} aria-label="Fechar o atlas" title="Fechar (volta à página anterior)"><Icone nome="fechar" tamanho={19} /></button>
        </div>
      </header>

      {/* explorar: regiões, busca, recentes */}
      {explorar && (
        <aside className="atlas__explorar" aria-label="Explorar">
          <label className="at-busca"><Icone nome="busca" tamanho={17} /><input type="search" value={busca} onChange={(e) => definirBusca(e.target.value)} placeholder="Buscar: fêmur, nervo radial, ulnar…" aria-label="Buscar estrutura" /></label>
          {busca.trim().length >= 2 ? (
            <ul className="at-resultados">
              {resultados.length ? resultados.map((e) => (
                <li key={e.id}><button type="button" onClick={() => irPara(e)}><span className="at-ponto" style={{ background: hex(GRUPOS[grupoDe(e)].cor) }} />{nomeDe(e)}{e.s !== 'm' && <small>{LADO[e.s]}</small>}</button></li>
              )) : <li className="at-vazio">Nada encontrado com esse nome.</li>}
            </ul>
          ) : (
            <>
              <h2 className="at-titulo-secao"><Icone nome="mapa" tamanho={14} /> Regiões ortopédicas</h2>
              <div className="at-regioes">
                <button type="button" className={`at-regiao${!regiao ? ' at-regiao--ativa' : ''}`} style={{ ['--at-area' as string]: 'var(--verdete)' }} onClick={() => escolherRegiao(null)}><strong>Corpo inteiro</strong><small>Visão geral do esqueleto</small></button>
                {REGIOES.map((r) => (
                  <button type="button" key={r.id} className={`at-regiao${regiao?.id === r.id ? ' at-regiao--ativa' : ''}`} style={{ ['--at-area' as string]: corDaArea(r.area) }} onClick={() => escolherRegiao(r.id)}>
                    <strong>{r.nome}</strong><small>{r.resumo}</small>
                  </button>
                ))}
              </div>
              {regiao?.membro && (
                <div className="at-segmentos" role="group" aria-label="Lado">
                  {(['ambos', 'd', 'e'] as Lateralidade[]).map((l) => <button key={l} type="button" aria-pressed={lado === l} onClick={() => escolherRegiao(regiao.id, l)}>{l === 'ambos' ? 'Ambos' : l === 'd' ? 'Direito' : 'Esquerdo'}</button>)}
                </div>
              )}
              {catalogo && pref.favoritos.length > 0 && <ListaRapida titulo="Favoritas" ids={pref.favoritos} catalogo={catalogo} aoIr={irPara} />}
              {catalogo && pref.recentes.length > 0 && <ListaRapida titulo="Recentes" ids={pref.recentes} catalogo={catalogo} aoIr={irPara} />}
            </>
          )}
        </aside>
      )}

      {/* personalizar: cortes, opacidade, restaurar */}
      {personalizar && motor && (
        <aside className="atlas__personalizar" aria-label="Personalizar">
          <h2 className="at-titulo-secao"><Icone nome="olho" tamanho={14} /> Transparência das camadas</h2>
          {ORDEM_GRUPOS.filter((g) => ligados.has(g)).map((g) => (
            <label key={g} className="at-faixa-opacidade"><span><i className="at-ponto" style={{ background: hex(GRUPOS[g].cor) }} />{GRUPOS[g].rotulo}</span>
              <input type="range" min={0.1} max={1} step={0.05} defaultValue={motor.opacidadeDe(g)} onChange={(ev) => motor.definirOpacidade(g, Number(ev.target.value))} /></label>
          ))}
          <h2 className="at-titulo-secao"><Icone nome="riscar" tamanho={14} /> Corte</h2>
          <div className="at-segmentos" role="group" aria-label="Plano de corte">
            {([null, 'axial', 'sagital', 'coronal'] as (EixoCorte | null)[]).map((e) => (
              <button key={e ?? 'nenhum'} type="button" aria-pressed={(corte?.eixo ?? null) === e} onClick={() => mudarCorte(e ? { eixo: e, posicao: 0.5, inverter: false } : null)}>{e ? e[0].toUpperCase() + e.slice(1) : 'Sem corte'}</button>
            ))}
          </div>
          {corte && <>
            <input className="at-corte" type="range" min={0} max={1} step={0.005} value={corte.posicao} onChange={(ev) => mudarCorte({ ...corte, posicao: Number(ev.target.value) })} aria-label="Posição do corte" />
            <button type="button" className="at-link" onClick={() => mudarCorte({ ...corte, inverter: !corte.inverter })}><Icone nome="reiniciar" tamanho={15} /> Ver o outro lado do corte</button>
            <p className="at-nota">O corte é geométrico e educativo: não substitui tomografia nem ressonância.</p>
          </>}
          <button type="button" className="botao" onClick={restaurar}><Icone nome="reiniciar" tamanho={16} /> Restaurar a visualização{motor.quantasOcultas ? ` (${motor.quantasOcultas} ocultas)` : ''}</button>
          <p className="at-nota">Atalhos: F foca · I isola · H esconde · 1 a 6 trocam a vista · Esc limpa. Clicar de novo no mesmo ponto pega a estrutura de baixo.</p>
          <a className="at-nota at-nota--link" href={`${import.meta.env.BASE_URL}atlas3d/v1/LICENCAS.md`} target="_blank" rel="noreferrer">Modelos: BodyParts3D (DBCLS, CC BY-SA 2.1 JP) e Z-Anatomy (CC BY-SA 4.0), via Anatomy Atlas 3D</a>
        </aside>
      )}

      {/* vistas */}
      <nav className="atlas__vistas" aria-label="Vistas">
        <button type="button" onClick={() => motor?.vista('anterior')} title="Anterior (1)">Ant</button>
        <button type="button" onClick={() => motor?.vista('posterior')} title="Posterior (2)">Post</button>
        <button type="button" onClick={() => motor?.vista('direita')} title="Lateral direita (3)">D</button>
        <button type="button" onClick={() => motor?.vista('esquerda')} title="Lateral esquerda (4)">E</button>
        <button type="button" onClick={() => motor?.vista('superior')} title="Superior (5)">Sup</button>
        <button type="button" onClick={() => motor?.enquadrarTudo()} aria-label="Enquadrar" title="Enquadrar"><Icone nome="alvo" tamanho={17} /></button>
      </nav>

      {/* camadas */}
      <div className="atlas__camadas" role="group" aria-label="Camadas">
        {ORDEM_GRUPOS.filter((g) => !GRUPOS[g].secundario || ligados.has(g) || personalizar).map((g) => (
          <button key={g} type="button" aria-pressed={ligados.has(g)} onClick={() => alternarGrupo(g)} title={GRUPOS[g].rotulo}>
            <span className="at-ponto" style={{ background: hex(GRUPOS[g].cor) }} />
            <span className="at-camada-rotulo">{GRUPOS[g].rotulo.split(' ')[0]}</span>
            {nivel !== 'assinante' && !GRATIS.has(g) && <span className="at-cadeado" aria-label="para assinantes"><Icone nome="cadeado" tamanho={12} /></span>}
            {ligados.has(g) && (progresso[g] ?? 0) < 1 && <span className="at-mini-progresso" style={{ ['--p' as string]: `${Math.round((progresso[g] ?? 0) * 100)}%` }} />}
          </button>
        ))}
      </div>

      {/* nome sob o cursor */}
      {passagem && !selecao && larga && <div className="atlas__dica" style={{ left: passagem.x + 14, top: passagem.y + 14 }}>{nomePassagem}</div>}

      {/* ficha: painel à direita (computador) ou gaveta (celular) */}
      {painelDireito && (larga
        ? <aside className="atlas__ficha" aria-label="Ficha da estrutura">{painelDireito}</aside>
        : <section className={`atlas__gaveta atlas__gaveta--${altura}`} aria-label="Ficha da estrutura">
            <button type="button" className="atlas__alca" onClick={() => definirAltura((a) => (a === 'espiada' ? 'meia' : a === 'meia' ? 'inteira' : 'espiada'))} aria-label="Mudar a altura da ficha"><span /></button>
            {painelDireito}
          </section>)}

      {/* estados */}
      {!catalogo && !erro && <div className="atlas__carregando"><EsperaPixel rotulo="Montando o esqueleto" /></div>}
      {catalogo && carregando.length > 0 && <div className="atlas__aviso-carga">Carregando {carregando.map((g) => GRUPOS[g].rotulo.toLowerCase()).join(', ')}… {Math.round(Math.min(...carregando.map((g) => progresso[g] ?? 0)) * 100)}%</div>}
      {convite && <ConviteAtlas convite={convite} aoFechar={() => definirConvite(null)} />}
      {erro && <div className="atlas__carregando"><p>{erro}</p><button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button></div>}
      {catalogo && !pref.dicasVistas && !selecao && (
        <div className="atlas__boas-vindas">
          <strong>Clique num osso para ver as fraturas, as classificações e as questões.</strong>
          <span>{larga ? 'Arraste para girar, role para aproximar, botão direito para mover.' : 'Um dedo gira, dois dedos aproximam e movem.'}</span>
          <button type="button" className="at-ouro at-ouro--curto" onClick={() => definirPref((p) => ({ ...p, dicasVistas: true }))}>Entendi</button>
        </div>
      )}
    </div>
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

function lerCamadas(consulta: URLSearchParams): Grupo[] {
  const c = consulta.get('c')?.split(',').filter((g): g is Grupo => g in GRUPOS && GRATIS.has(g as Grupo))
  return c?.length ? c : ['osso']
}
export const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
