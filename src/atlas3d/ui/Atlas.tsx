import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Motor, type Corte, type EixoCorte, type Passagem, type Vista } from '../motor/Motor'
import { carregarCatalogo, carregarPontos } from '../motor/carregador'
import { GRUPOS, ORDEM_GRUPOS, grupoDe } from '../config'
import type { Catalogo, Estrutura, Grupo, Ponto, Selecao } from '../tipos'
import { REGIOES, caixasDaRegiao, regiaoPorId, type Lateralidade } from '../dados/regioes'
import { LADO, nomeCompleto, nomeDe, registrarNomes } from '../dados/nomes'
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
import { GuiaControles } from './GuiaControles'
import { FichaAnatomica, FixacoesDoOsso } from './FichaAnatomica'
import { carregarAnatomia, idNoLado, registroDaEstrutura, type IndiceAnatomico } from '../dados/anatomia'
import { fixadosNoOsso, idsDoRegistro, indexarPontos, marcosNoOsso, montarRelacoes, relacionadosDe, type Mundo, type Relacao } from '../dados/relacoes'
import { faixaPorAltura } from '../dados/faixas'
import { CORES_PRESET, PRESETS, type Preset } from '../dados/presets'
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
  const [guia, definirGuia] = useState(false)
  // banco anatômico e pontos do modelo: baixados uma vez, quando o atlas abre
  const [indice, definirIndice] = useState<IndiceAnatomico | null>(null)
  const [pontos, definirPontos] = useState<Map<string, Ponto> | null>(null)
  const [ativas, definirAtivas] = useState<Set<Relacao>>(new Set())
  const [contexto, definirContexto] = useState(false)
  const [pontosOsso, definirPontosOsso] = useState(false)
  const [preset, definirPreset] = useState<Preset | null>(null)
  const toque = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
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
      const alvo = e ? cat.estruturas.find((x) => x.id === e) : undefined
      if (alvo) {
        // link direto para um músculo: liga a camada (grátis); camadas de assinante seguem as regras do plano
        const g = grupoDe(alvo)
        if (!iniciais.includes(g) && GRATIS.has(g)) { definirLigados((atual) => new Set([...atual, g])); await m.ligarGrupo(g, true) }
        if (!vivo) return
        const f = (consulta.get('f') as Selecao['faixa']) || undefined
        m.selecionar({ id: alvo.id, faixa: f })
        m.focar([alvo.id], f)
      }
    }).catch(() => vivo && definirErro('Não foi possível abrir o atlas. Verifique a conexão e tente de novo.'))
    carregarVinculos().then((v) => vivo && definirVinculos(v)).catch(() => {})
    carregarAnatomia().then((a) => {
      // nomes do banco valem como nome em português onde o catálogo ainda não tem tradução (artérias, por exemplo);
      // só para registro de uma malha, para não dar o nome do grupo a cada parte
      registrarNomes(Object.fromEntries(a.registros.filter((r) => r.ids.length === 1).map((r) => [r.ids[0], r.nome])))
      if (vivo) definirIndice(a)
    }).catch(() => {})
    carregarPontos().then((p) => vivo && definirPontos(indexarPontos(p))).catch(() => {})
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
  const restaurar = () => { const m = motorRef.current; if (!m) return; definirPreset(null); m.isolar(null); m.mostrarTodas(); definirIsolado(false); m.definirCorte(null); definirCorteUI(null) }
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

  // nomes do banco anatômico entram na busca ("Deltoide", "Ligamento de Lisfranc", "LCA")
  const extrasBusca = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const r of indice?.registros ?? []) for (const id of r.ids) m.set(id, [...(m.get(id) ?? []), r.nome, r.en])
    return m
  }, [indice])
  const resultados = useMemo(() => (catalogo && busca.trim().length >= 2 ? buscar(catalogo.estruturas, busca, 30, extrasBusca) : []), [catalogo, busca, extrasBusca])
  const normalBusca = busca.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const regioesAchadas = normalBusca.length >= 2 ? REGIOES.filter((r) => semAcento(r.nome).includes(normalBusca)) : []
  const presetsAchados = normalBusca.length >= 2 ? PRESETS.filter((p) => semAcento(`${p.nome} ${p.resumo}`).includes(normalBusca)) : []
  const ficha = estrutura ? fichaDe(estrutura, selecao?.faixa) : undefined
  const vinculo = ficha && vinculos ? vinculos[ficha.chave] : undefined
  const carregando = ORDEM_GRUPOS.filter((g) => ligados.has(g) && (progresso[g] ?? 0) < 1)
  // O que está aberto, para o "online agora" do painel do administrador (conta/aparelho.ts lê ao mandar o sinal).
  useEffect(() => {
    const e = selecao && catalogo ? catalogo.estruturas.find((x) => x.id === selecao.id) : undefined
    const vendo = questoes ? `respondendo: ${questoes.titulo}` : e ? nomeCompleto(e, selecao?.faixa) : ''
    try { if (vendo) sessionStorage.setItem('oq-atlas-vendo', vendo.slice(0, 80)); else sessionStorage.removeItem('oq-atlas-vendo') } catch { /* sem armazenamento: o painel mostra só a região */ }
  }, [selecao, catalogo, questoes])
  useEffect(() => () => { try { sessionStorage.removeItem('oq-atlas-vendo') } catch { /* idem */ } }, [])
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

  // ---------- relações anatômicas no modelo ----------
  const registro = estrutura && indice ? registroDaEstrutura(indice, estrutura) : undefined
  const mundo: Mundo | null = motor ? { existe: (id) => motor.existe(id), estrutura: (id) => motor.estrutura(id), grupoDe: (id) => motor.grupoDe(id) } : null
  // cada estrutura abre com a origem e a inserção acesas (quando existem); o resto a pessoa liga
  useEffect(() => {
    definirAtivas(new Set(registro && registro.tipo !== 'nervo' ? (['origem', 'insercao'] as const).filter((x) => registro[x]) : []))
    definirPontosOsso(false)
    if (contexto) { motorRef.current?.isolar(null); definirIsolado(false) }
    definirContexto(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estrutura?.id, registro?.chave])
  const montagem = useMemo(() => (registro && indice && pontos && mundo && estrutura
    ? montarRelacoes(registro, indice, estrutura.s, ativas, pontos, mundo) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [registro, indice, pontos, estrutura?.id, ativas, motor])
  const ladoPreset: Estrutura['s'] = lado === 'e' ? 'e' : 'd'
  const destaquesPreset = useMemo(() => {
    if (!preset || !indice || !motor) return []
    const existe = (id: string) => motor.existe(id)
    return preset.chaves.flatMap((c, i) => {
      const r = indice.porChave.get(c)
      return (r?.ids ?? []).map((b) => idNoLado(b, ladoPreset, existe)).filter(Boolean).map((id) => ({ id: id as string, cor: CORES_PRESET[i % CORES_PRESET.length] }))
    })
  }, [preset, indice, motor, ladoPreset])
  const fixados = useMemo(() => (estrutura && indice && pontos && grupoDe(estrutura) === 'osso'
    ? fixadosNoOsso(indice, estrutura, selecao?.faixa, pontos, (z) => faixaPorAltura(estrutura, z)) : []
  ), [estrutura, indice, pontos, selecao?.faixa])
  useEffect(() => {
    const m = motorRef.current
    if (!m) return
    if (montagem) m.mostrarRelacoes(montagem.destaques, montagem.marcos, montagem.linhas)
    else if (fixados.length && pontosOsso && estrutura && pontos) m.mostrarRelacoes([], marcosNoOsso(fixados, estrutura, pontos))
    else m.mostrarRelacoes(preset ? destaquesPreset : [])
    // as camadas recém-carregadas entram no desenho: depende de ligados e do progresso
  }, [montagem, fixados, pontosOsso, estrutura, pontos, ligados, progresso, preset, destaquesPreset])

  const alternarRelacao = (x: Relacao) => {
    const novo = new Set(ativas)
    if (novo.has(x)) novo.delete(x); else novo.add(x)
    definirAtivas(novo)
    if (!novo.has(x) || !registro || !indice || !pontos || !mundo || !estrutura) return
    // liga a camada que a relação precisa (nervos, por exemplo), com as regras do plano
    const precisa = montarRelacoes(registro, indice, estrutura.s, new Set([x]), pontos, mundo).precisa
    for (const g of precisa) if (!ligados.has(g)) mudarGrupo(g, true)
  }
  const alternarContexto = () => {
    const m = motorRef.current
    if (!m || !registro || !indice || !mundo || !estrutura || !selecao) return
    if (contexto) { m.isolar(null); definirIsolado(false); definirContexto(false); return }
    const ids = new Set<string>([selecao.id, ...relacionadosDe(registro, indice).flatMap((x) => idsDoRegistro(x, estrutura.s, mundo))])
    for (const d of montagem?.destaques ?? []) ids.add(d.id)
    for (const k of ['origem', 'insercao'] as const) for (const mk of registro[k]?.m ?? []) { const id = idNoLado(mk.split(':')[0], estrutura.s, mundo.existe); if (id) ids.add(id) }
    m.isolar([...ids])
    definirIsolado(true)
    definirContexto(true)
    m.focar([...ids].filter((id) => m.estaVisivel(id)))
  }
  const irParaChave = (chave: string) => {
    const r = indice?.porChave.get(chave)
    const m = motorRef.current
    if (!r?.ids.length || !m) return
    const id = idNoLado(r.ids[0], estrutura?.s ?? 'd', (x) => m.existe(x))
    const e = id ? m.estrutura(id) : undefined
    if (e) irPara(e)
  }
  // ---------- visualizações prontas ----------
  const aplicarPreset = (p: Preset) => {
    const m = motorRef.current
    if (!m || !indice) return
    escolherRegiao(p.regiao, lado === 'ambos' ? 'd' : lado)
    definirPreset(p)
    const existe = (id: string) => m.existe(id)
    const lado1: Estrutura['s'] = lado === 'e' ? 'e' : 'd'
    const ids = p.chaves.flatMap((c) => indice.porChave.get(c)?.ids ?? []).map((b) => idNoLado(b, lado1, existe)).filter(Boolean) as string[]
    // liga só as camadas que a pessoa já pode usar sem convite; o que é de outro plano aparece com cadeado na legenda
    const grupos = new Set(ids.map((id) => m.grupoDe(id)).filter(Boolean) as Grupo[])
    for (const g of grupos) if (!ligados.has(g) && podeLigar(g)) mudarGrupo(g, true)
    m.isolar(ids)
    definirIsolado(true)
  }
  const podeLigar = (g: Grupo) => nivel === 'assinante' || (nivel === 'conta' && GRATIS.has(g))
  const sairDoPreset = () => { motorRef.current?.isolar(null); definirIsolado(false); definirPreset(null) }

  const anatomia = registro && indice ? (
    <FichaAnatomica registro={registro} indice={indice} ativas={ativas} semGeometria={montagem?.semGeometria ?? []} contexto={contexto}
      aoAlternar={alternarRelacao} aoContexto={alternarContexto} aoIr={irParaChave} />
  ) : undefined
  const fixacoes = fixados.length && indice ? (
    <FixacoesDoOsso itens={fixados} indice={indice} pontos={pontosOsso} aoPontos={() => definirPontosOsso((v) => !v)} aoIr={irParaChave} />
  ) : undefined

  const painelDireito = estrutura ? (
    questoes
      ? <PainelQuestoes titulo={questoes.titulo} ids={questoes.ids} aoVoltar={() => definirQuestoes(null)} />
      : <PainelFicha key={`${estrutura.id}|${selecao?.faixa ?? ''}`} anatomia={anatomia} fixacoes={fixacoes} estrutura={estrutura} faixa={selecao?.faixa} ficha={ficha} vinculo={vinculo} favorita={pref.favoritos.includes(estrutura.id)}
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
          <button type="button" className={`at-chip at-ajuda${guia || !pref.dicasVistas ? ' at-chip--ativo' : ''}`} onClick={() => definirGuia((v) => !v)} aria-expanded={guia || !pref.dicasVistas} title="Como usar o atlas"><Icone nome="interrogacao" tamanho={17} /><span>Como usar</span></button>
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
              {regioesAchadas.map((r) => <li key={`r-${r.id}`}><button type="button" onClick={() => { escolherRegiao(r.id); definirBusca('') }}><Icone nome="mapa" tamanho={14} />{r.nome}<small>região</small></button></li>)}
              {presetsAchados.map((p) => <li key={`p-${p.id}`}><button type="button" onClick={() => { aplicarPreset(p); definirBusca('') }}><Icone nome="olho" tamanho={14} />{p.nome}<small>visualização</small></button></li>)}
              {resultados.length ? resultados.map((e) => (
                <li key={e.id}><button type="button" onClick={() => irPara(e)}><span className="at-ponto" style={{ background: hex(GRUPOS[grupoDe(e)].cor) }} />{nomeDe(e)}{e.s !== 'm' && <small>{LADO[e.s]}</small>}</button></li>
              )) : !regioesAchadas.length && !presetsAchados.length && <li className="at-vazio">Nada encontrado com esse nome.</li>}
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
              {indice && (
                <>
                  <h2 className="at-titulo-secao"><Icone nome="olho" tamanho={14} /> Visualizações prontas{regiao ? ` · ${regiao.nome}` : ''}</h2>
                  <div className="at-presets">
                    {(regiao ? PRESETS.filter((p) => p.regiao === regiao.id) : PRESETS).map((p) => (
                      <button type="button" key={p.id} className={`at-preset${preset?.id === p.id ? ' at-preset--ativo' : ''}`} onClick={() => aplicarPreset(p)}>
                        <span className="at-preset__cores" aria-hidden="true">{p.chaves.slice(0, 4).map((c, i) => <i key={c} style={{ background: CORES_PRESET[i] }} />)}</span>
                        <strong>{p.nome}</strong><small>{p.resumo}</small>
                      </button>
                    ))}
                    {regiao && !PRESETS.some((p) => p.regiao === regiao.id) && <p className="at-nota">Ainda não há visualização pronta para esta região.</p>}
                  </div>
                </>
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

      {/* legenda da visualização pronta */}
      {preset && indice && !estrutura && (
        <aside className="atlas__preset" aria-label={`Visualização: ${preset.nome}`}>
          <header><p className="tr-heroi__selo">Visualização</p><button type="button" className="at-botao-icone" onClick={sairDoPreset} aria-label="Sair da visualização" title="Sair da visualização"><Icone nome="fechar" tamanho={16} /></button></header>
          <h2>{preset.nome}</h2>
          <ul>{preset.chaves.map((c, i) => {
            const r = indice.porChave.get(c)
            if (!r) return null
            const g = r.ids[0] && motor ? motor.grupoDe(idNoLado(r.ids[0], ladoPreset, (x) => motor.existe(x)) ?? '') : undefined
            const fechado = !!g && !ligados.has(g)
            return <li key={c}><button type="button" onClick={() => irParaChave(c)} className={fechado ? 'atlas__preset-fechado' : undefined}><i style={{ background: CORES_PRESET[i % CORES_PRESET.length] }} />{r.nome}{fechado && <Icone nome="cadeado" tamanho={12} />}</button></li>
          })}</ul>
          <p className="at-nota">{(() => {
            const fechados = new Set(preset.chaves.flatMap((c) => { const r = indice.porChave.get(c); const id = r?.ids[0] && motor ? idNoLado(r.ids[0], ladoPreset, (x) => motor.existe(x)) : undefined; const g = id ? motor?.grupoDe(id) : undefined; return g && !ligados.has(g) ? [g] : [] }))
            if (!fechados.size) return 'Toque num nome para abrir a ficha.'
            if (nivel === 'visitante' && [...fechados].some((g) => GRATIS.has(g))) return 'Com a conta grátis, os músculos também aparecem aqui. Toque num nome para abrir a ficha.'
            return 'Os itens com cadeado ficam nas camadas de assinante.'
          })()}</p>
        </aside>
      )}

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
      {catalogo && (guia || !pref.dicasVistas) && (
        <GuiaControles toque={toque} aoFechar={() => { definirGuia(false); definirPref((p) => ({ ...p, dicasVistas: true })) }} />
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
