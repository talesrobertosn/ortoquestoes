import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { usarTema } from '../estado/tema'
import { recurso } from '../config'
import { href, navegar } from '../util/rotas'
import { ProvedorPainel, usarPainel } from './dados/painel'
import { nomeDe } from './dados/pessoas'
import { ContextoNav, type AbaFicha, type Nav } from './nav'
import { AREAS, abasDe, areaDe, defArea, defParte, lerUrl, partePadrao, urlAntiga, urlDe, type Area, type EstadoUrl, type Parte } from './rotas'
import { Icone } from './ui/Icone'
import { haQuanto, horario } from './ui/formato'
import { Carregando, Estado } from './ui/kit'
import { HospedeAvisos, HospedeConfirmar, Paleta, type ItemPaleta } from './ui/sobreposicoes'
import './admin.css'
import './modulos.css'

const Inicio = lazy(() => import('./modulos/Inicio'))
const Explorador = lazy(() => import('./modulos/Explorador'))
const Analise = lazy(() => import('./modulos/Analise'))
const Receita = lazy(() => import('./modulos/Receita'))
const Assinaturas = lazy(() => import('./modulos/Assinaturas'))
const Cobrancas = lazy(() => import('./modulos/Cobrancas'))
const Avisos = lazy(() => import('./modulos/Avisos'))
const Triagem = lazy(() => import('./modulos/Triagem'))
const Editor = lazy(() => import('./modulos/Editor'))
const Simulados = lazy(() => import('./modulos/Simulados'))
const Opinioes = lazy(() => import('./modulos/Opinioes'))
const Campanhas = lazy(() => import('./modulos/Campanhas'))
const Cartas = lazy(() => import('./modulos/Cartas'))
const Envios = lazy(() => import('./modulos/Envios'))
const Catalogo = lazy(() => import('./modulos/Catalogo'))
const Ajustes = lazy(() => import('./modulos/Ajustes'))
const Exportar = lazy(() => import('./modulos/Exportar'))
const AvisoTopo = lazy(() => import('./modulos/AvisoTopo'))
const Ficha = lazy(() => import('./modulos/Ficha'))

function Modulo({ parte, sub }: { parte: Parte; sub: Parte }) {
  switch (parte) {
    case 'comando': case 'pendencias': case 'agora': return <Inicio />
    case 'usuarios': return <Explorador />
    case 'crescimento': case 'retencao': case 'perfis': return <Analise />
    case 'financeiro': case 'previsao': return <Receita />
    case 'assinaturas': return <Assinaturas />
    case 'cobrancas': return <Cobrancas />
    case 'pagamentos': return <Avisos />
    case 'conteudo': return <Triagem />
    case 'questoes': return <Editor />
    case 'simulados': return <Simulados />
    case 'opinioes': return <Opinioes />
    case 'lembretes': return <Campanhas />
    case 'cartas': return <Cartas />
    case 'envios': return <Envios />
    case 'todas': return <Catalogo />
    case 'ajustes': case 'aviso': return sub === 'aviso' ? <AvisoTopo /> : <Ajustes />
    case 'exportar': return <Exportar />
  }
}

/**
 * Painel do administrador 3.0. Casca própria (sem o cabeçalho do site): lateral com as seis áreas e as
 * partes da área aberta, topo com migalhas, atualização e busca (Ctrl/Cmd+K); no celular, topo de
 * contexto, trilho com as partes e barra inferior com as áreas.
 */
export function PainelAdmin({ consulta }: { consulta: URLSearchParams }) {
  const { sessao } = usarConta()
  const estado = lerUrl(consulta)
  const antiga = urlAntiga(consulta)
  const destinoNovo = urlDe(estado)
  useEffect(() => { if (antiga) navegar(destinoNovo, true) }, [antiga, destinoNovo])
  useEffect(() => { document.title = `${defParte(estado.parte).rotulo} · Painel · Orto Questões` }, [estado.parte])

  if (!sessao) return <div className="a3"><div style={{ maxWidth: 420, margin: '15vh auto', padding: 24 }}>
    <Estado icone="trava" titulo="Painel do administrador" texto="Entre na sua conta para continuar. Só contas na lista de administradores conseguem abrir." acao={<a className="a3-botao" href={href('/conta')}>Entrar</a>} />
  </div></div>
  return <ProvedorPainel parte={estado.parte}><Casca estado={estado} /></ProvedorPainel>
}

function Casca({ estado }: { estado: EstadoUrl }) {
  const p = usarPainel()
  const { alternar } = usarTema()
  const area = areaDe(estado.parte)
  const parte = defParte(estado.parte)
  const [pessoa, definirPessoa] = useState<{ id: string; aba?: AbaFicha } | null>(null)
  const [paleta, definirPaleta] = useState(false)
  const [abertas, definirAbertas] = useState<Set<Area>>(() => new Set([area]))
  useEffect(() => { definirAbertas(a => a.has(area) ? a : new Set([...a, area])) }, [area])
  // Cada área lembra a última parte aberta.
  const [ultima, definirUltima] = useState<Partial<Record<Area, Parte>>>({})
  useEffect(() => { definirUltima(u => u[area] === estado.parte ? u : { ...u, [area]: estado.parte }) }, [area, estado.parte])
  const [rolou, definirRolou] = useState(false)
  useEffect(() => { const f = () => definirRolou(window.scrollY > 4); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])

  const nav: Nav = useMemo(() => {
    const montar = (parteNova: Parte, extra?: Partial<Omit<EstadoUrl, 'parte'>>) => urlDe({ ...estado, filtro: 'todos', ...(parteNova === estado.parte ? {} : { id: parteNova === 'questoes' ? estado.id : null }), ...extra, parte: parteNova })
    return {
      estado,
      ir: (parteNova, extra) => { const outra = parteNova !== estado.parte; navegar(montar(parteNova, extra), !outra); if (outra) window.scrollTo({ top: 0 }) },
      ajustar: extra => navegar(urlDe({ ...estado, ...extra }), true),
      link: (parteNova, extra) => href(montar(parteNova, extra)),
      abrirPessoa: (id, aba) => definirPessoa({ id, aba }),
      abrirPaleta: () => definirPaleta(true),
    }
  }, [estado])

  // Ctrl/Cmd+K abre a busca; "/" também, fora de campos de texto.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const emCampo = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); definirPaleta(v => !v) }
      else if (e.key === '/' && !emCampo) { e.preventDefault(); definirPaleta(true) }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const contagem: Partial<Record<Parte, { n: number; tom?: 'alerta' | 'vivo' }>> = {
    comando: p.online ? { n: p.online, tom: 'vivo' } : undefined,
    usuarios: p.totalContas ? { n: p.totalContas } : undefined,
    pagamentos: p.errosPagamento ? { n: p.errosPagamento, tom: 'alerta' } : undefined,
    conteudo: p.pendenciasConteudo ? { n: p.pendenciasConteudo, tom: 'alerta' } : undefined,
  }
  const alertaDa = (a: Area) => defArea(a).partes.some(x => contagem[x.id]?.tom === 'alerta')
  const destinoDa = (a: Area) => a === area ? partePadrao(a) : ultima[a] ?? partePadrao(a)
  const clique = (destino: Parte) => (e: MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); nav.ir(destino) }

  const itensPaleta: ItemPaleta[] = useMemo(() => [
    ...AREAS.flatMap(a => a.partes.map(x => ({ id: `parte-${x.id}`, grupo: 'Ir para', titulo: x.rotulo, detalhe: a.rotulo, icone: a.icone, palavras: x.pergunta, executar: () => nav.ir(x.id) }))),
    { id: 'acao-atualizar', grupo: 'Ações', titulo: 'Atualizar os dados do painel', icone: 'atualizar' as const, executar: () => void p.atualizar() },
    { id: 'acao-tema', grupo: 'Ações', titulo: 'Trocar entre claro e escuro', icone: 'lua' as const, executar: alternar },
    { id: 'acao-online', grupo: 'Ações', titulo: 'Ver quem está online', icone: 'pessoas' as const, executar: () => nav.ir('usuarios', { filtro: 'online' }) },
    { id: 'acao-parados', grupo: 'Ações', titulo: 'Novos que pararam de estudar', icone: 'pessoas' as const, executar: () => nav.ir('usuarios', { filtro: 'novos_parados' }) },
    { id: 'acao-relatos', grupo: 'Ações', titulo: 'Revisar relatos de erro', icone: 'estudo' as const, executar: () => nav.ir('conteudo', { vista: 'relatos' }) },
    { id: 'acao-site', grupo: 'Ações', titulo: 'Voltar ao site', icone: 'sair' as const, executar: () => navegar('/') },
  ], [nav, p, alternar])
  const buscarMais = useCallback((termo: string): ItemPaleta[] => {
    const itens: ItemPaleta[] = []
    if (/^[a-z-]+-\d{1,5}$/i.test(termo)) itens.push({ id: `q-${termo}`, grupo: 'Questão', titulo: `Abrir ${termo} no editor`, icone: 'lapis', executar: () => nav.ir('questoes', { id: termo.toLowerCase() }) })
    const t = termo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const pessoas = (p.usuarios ?? []).filter(u => `${u.nome ?? ''} ${u.email ?? ''} ${u.servico ?? ''} ${u.cidade ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(t)).slice(0, 8)
    for (const u of pessoas) itens.push({ id: `u-${u.id_usuario}`, grupo: 'Pessoas', titulo: nomeDe(u), detalhe: u.online ? 'online' : u.ultima_atividade ? `ativo ${haQuanto(u.ultima_atividade)}` : 'sem atividade', icone: 'usuario', executar: () => definirPessoa({ id: u.id_usuario }) })
    if (!p.usuarios) itens.push({ id: 'u-carregar', grupo: 'Pessoas', titulo: 'Abrir o Explorador para buscar pessoas', icone: 'pessoas', executar: () => nav.ir('usuarios') })
    return itens
  }, [nav, p.usuarios])

  const navegacaoAreas = <nav aria-label="Áreas do painel" className="a3-nav-grupo">
    {AREAS.map(a => {
      const aberta = abertas.has(a.id)
      const atual = a.id === area
      // Área de uma parte só (Agora): link direto, sem submenu repetindo o nome.
      if (a.partes.length === 1) {
        const c = contagem[a.partes[0].id]
        return <div key={a.id}><a className="a3-nav-area" href={nav.link(a.partes[0].id)} aria-current={atual ? 'page' : undefined} onClick={clique(a.partes[0].id)}>
          <Icone nome={a.icone} /><span className="a3-nav-area__nome">{a.rotulo}</span>
          {c && <b className={'a3-cont' + (c.tom === 'vivo' ? ' a3-cont--vivo' : c.tom === 'alerta' ? ' a3-cont--alerta' : '')}>{c.n.toLocaleString('pt-BR')}<span className="a3-so-leitor"> online</span></b>}
        </a></div>
      }
      return <div key={a.id}>
        <button type="button" className="a3-nav-area" aria-current={atual ? 'true' : undefined} aria-expanded={aberta}
          onClick={() => { if (!atual) nav.ir(destinoDa(a.id)); definirAbertas(s => { const n = new Set(s); if (atual && aberta) n.delete(a.id); else n.add(a.id); return n }) }}>
          <Icone nome={a.icone} /><span className="a3-nav-area__nome">{a.rotulo}</span>
          {!aberta && alertaDa(a.id) && <i className="a3-ponto a3-ponto--erro" aria-label="tem pendências" />}
          <span className="a3-chevron"><Icone nome="direita" tamanho={14} /></span>
        </button>
        {aberta && <ul className="a3-nav-partes">{a.partes.map(x => {
          const c = contagem[x.id]
          return <li key={x.id}><a className="a3-nav-parte" href={nav.link(x.id)} aria-current={x.id === estado.parte ? 'page' : undefined} onClick={clique(x.id)}>
            <span>{x.rotulo}</span>{c && <b className={'a3-cont' + (c.tom === 'alerta' ? ' a3-cont--alerta' : c.tom === 'vivo' ? ' a3-cont--vivo' : '')}>{c.n.toLocaleString('pt-BR')}<span className="a3-so-leitor">{c.tom === 'alerta' ? ' pendentes' : c.tom === 'vivo' ? ' online' : ' contas'}</span></b>}
          </a></li>
        })}</ul>}
      </div>
    })}
  </nav>

  const conteudo: ReactNode = p.erroAcesso && !p.assinaturas
    ? <Estado tipo="erro" icone="trava" titulo={/negado/i.test(p.erroAcesso) ? 'Acesso negado' : 'O painel não carregou'} texto={p.erroAcesso} acao={<button type="button" className="a3-botao a3-botao--contorno" onClick={() => void p.atualizar()}>Tentar de novo</button>} />
    : !p.assinaturas ? <Carregando linhas={6} texto="Verificando o acesso e carregando o painel…" />
    : <Suspense fallback={<Carregando linhas={6} />}><Modulo parte={estado.parte} sub={estado.sub} /></Suspense>

  return <ContextoNav.Provider value={nav}>
    <div className="a3">
      <div className="a3-casca">
        <aside className="a3-lateral" aria-label="Navegação do painel">
          <a className="a3-marca" href={nav.link('comando')} onClick={clique('comando')}>
            <img src={recurso('marca/simbolo.svg')} alt="" width={28} height={28} />
            <span><b>Orto Questões</b><small>Mesa de comando</small></span>
          </a>
          <button type="button" className="a3-busca-gatilho" onClick={() => definirPaleta(true)}>
            <Icone nome="busca" tamanho={15} /><span>Buscar</span><span className="a3-kbd">Ctrl K</span>
          </button>
          {navegacaoAreas}
          <div className="a3-lateral__pe">
            <button type="button" onClick={alternar}><Icone nome="lua" tamanho={16} />Claro ou escuro</button>
            <a href={href('/')}><Icone nome="sair" tamanho={16} />Voltar ao site</a>
          </div>
        </aside>

        <div className="a3-principal">
          {/* Celular: topo de contexto e trilho com as partes da área. */}
          <header className="a3-movel-topo">
            <img src={recurso('marca/simbolo.svg')} alt="" width={26} height={26} style={{ borderRadius: 7 }} />
            <div className="a3-movel-topo__titulo"><small>{defArea(area).rotulo}</small><b>{parte.rotulo}</b></div>
            <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone" onClick={() => definirPaleta(true)} aria-label="Buscar no painel"><Icone nome="busca" /></button>
            <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone" onClick={() => void p.atualizar()} aria-label="Atualizar os dados" aria-busy={p.atualizando} disabled={p.atualizando}><Icone nome="atualizar" /></button>
          </header>
          {defArea(area).partes.length > 1 && <nav className="a3-movel-partes" aria-label={`Partes de ${defArea(area).rotulo}`}>
            {defArea(area).partes.map(x => <a key={x.id} href={nav.link(x.id)} aria-current={x.id === estado.parte ? 'page' : undefined} onClick={clique(x.id)}>
              {x.rotulo}{contagem[x.id] && <b className={'a3-cont' + (contagem[x.id]!.tom === 'alerta' ? ' a3-cont--alerta' : '')}>{contagem[x.id]!.n}</b>}
            </a>)}
          </nav>}

          <header className={'a3-topo' + (rolou ? ' a3-topo--rolou' : '')}>
            <nav className="a3-migalhas" aria-label="Você está em">
              <a href={nav.link('comando')} onClick={clique('comando')}>Painel</a><Icone nome="direita" tamanho={13} />
              {defArea(area).partes.length > 1 && <><a href={nav.link(partePadrao(area))} onClick={clique(partePadrao(area))}>{defArea(area).rotulo}</a><Icone nome="direita" tamanho={13} /></>}
              <span aria-current="page">{parte.rotulo}</span>
            </nav>
            <div className="a3-topo__acoes">
              <span className="a3-mudo a3-pequeno" aria-live="polite">{p.atualizando ? 'Atualizando…' : p.atualizadoEm ? `Atualizado às ${horario(p.atualizadoEm)}` : ''}</span>
              <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => void p.atualizar()} disabled={p.atualizando} aria-busy={p.atualizando}><Icone nome="atualizar" tamanho={14} />Atualizar</button>
              <a className="a3-botao a3-botao--contorno a3-botao--pequeno" href={nav.link('exportar')} onClick={clique('exportar')}><Icone nome="baixar" tamanho={14} />Exportar</a>
            </div>
          </header>

          <main className="a3-conteudo" id="a3-conteudo" tabIndex={-1}>
            {p.erroAcesso && p.assinaturas && <div style={{ marginTop: 12 }}><Estado tipo="erro" compacto titulo="A última atualização falhou" texto={`${p.erroAcesso} Os dados abaixo são da atualização anterior.`} /></div>}
            {abasDe(estado.parte).length > 0 && p.assinaturas && <nav className="a3-abas-tela" aria-label={`Abas de ${parte.rotulo}`}>
              {abasDe(estado.parte).map(x => <a key={x.id} href={href(urlDe({ ...estado, sub: x.id }))} aria-current={x.id === estado.sub ? 'page' : undefined}
                onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); nav.ajustar({ sub: x.id }) }}>{x.rotulo}</a>)}
            </nav>}
            {conteudo}
          </main>
        </div>
      </div>

      <nav className="a3-movel-barra" aria-label="Áreas do painel">
        {AREAS.map(a => <a key={a.id} href={nav.link(destinoDa(a.id))} aria-current={a.id === area ? 'true' : undefined} onClick={clique(destinoDa(a.id))}>
          <Icone nome={a.icone} tamanho={20} />{a.curto}{alertaDa(a.id) && <i className="a3-ponto-alerta" aria-label="tem pendências" />}
        </a>)}
      </nav>

      {pessoa && <Suspense fallback={null}><Ficha idUsuario={pessoa.id} abaInicial={pessoa.aba} aoFechar={() => definirPessoa(null)} /></Suspense>}
      <Paleta aberta={paleta} aoFechar={() => definirPaleta(false)} itens={itensPaleta} buscarMais={buscarMais} />
      <div id="a3-camadas" />
      <HospedeConfirmar />
      <HospedeAvisos />
    </div>
  </ContextoNav.Provider>
}
