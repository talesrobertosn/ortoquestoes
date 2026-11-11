import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { Icone } from '../../componentes/Icone'
import type { Motor } from '../motor/Motor'
import type { Estrutura, Grupo } from '../tipos'
import { GRUPOS, grupoDe } from '../config'
import { nomeDe, temNomePt, SINGULAR } from '../dados/nomes'
import { SECOES_ESTUDO, type TemaEstudo } from '../dados/temasEstudo'
import { hex } from './cor'

interface Props {
  motor: Motor
  estruturas: Estrutura[]
  /** camadas que o teste "o que está na tela" pode usar (as ligadas, no modo atual) */
  grupos: Set<Grupo>
  temas: TemaEstudo[]
  /** tema já escolhido ao abrir (atalho do Explorar); sem ele, o Teste-se começa pela escolha */
  temaInicial?: string | null
  /** liga as camadas do tema, tira o recorte de região e devolve as estruturas; null quando pede conta ou assinatura */
  prepararTema: (t: TemaEstudo) => Promise<Estrutura[] | null>
  fechado: (t: TemaEstudo) => boolean
  aoFechar: () => void
  aoVerFicha: (e: Estrutura) => void
}
interface Rodada { alvo: Estrutura; opcoes: string[]; resposta?: string }
interface Placar { acertos: number; total: number; seguidas: number; melhor: number }

const OURO = '#f0c46a'
const TURQUESA = '#14b8d4'
const TEMA_GUARDADO = 'atlas3d:tema-estudo'
const NA_TELA = 'na-tela'
const embaralhar = <T,>(lista: T[]) => { const a = [...lista]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const tamanho = (e: Estrutura) => Math.max(e.b[3] - e.b[0], e.b[4] - e.b[1], e.b[5] - e.b[2])
const lerGuardado = () => { try { return localStorage.getItem(TEMA_GUARDADO) } catch { return null } }
const guardar = (id: string) => { try { localStorage.setItem(TEMA_GUARDADO, id) } catch { /* sem armazenamento: só não lembra o último tema */ } }
const PLACAR_ZERO: Placar = { acertos: 0, total: 0, seguidas: 0, melhor: 0 }

/**
 * Teste-se (modo estudo). Primeiro a pessoa escolhe o que treinar: o que está na tela ou um tema focal (manguito,
 * plexo braquial, compartimentos da perna, ossos do pé, artérias do membro inferior...). Depois o atlas acende uma
 * estrutura do tema em dourado e pergunta o nome, com quatro opções tiradas do mesmo tema (a confusão que cai na
 * prova é entre vizinhos). Teclas 1 a 4 respondem, Enter avança.
 */
export function ModoEstudo({ motor, estruturas, grupos, temas, temaInicial, prepararTema, fechado, aoFechar, aoVerFicha }: Props) {
  const [tema, definirTema] = useState<TemaEstudo | 'na-tela' | null>(null)
  const [candidatas, definirCandidatas] = useState<Estrutura[]>([])
  const [carregando, definirCarregando] = useState<string | null>(null)
  const [rodada, definirRodada] = useState<Rodada | null>(null)
  const [placar, definirPlacar] = useState<Placar>(PLACAR_ZERO)
  const secoes = useMemo(() => SECOES_ESTUDO.filter((s) => temas.some((t) => t.secao === s)), [temas])
  const [secao, definirSecao] = useState<string>(() => {
    const ultimo = temas.find((t) => t.id === lerGuardado())
    return ultimo?.secao ?? secoes[0] ?? 'Membro superior'
  })
  const recentes = useRef<string[]>([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ultimo = useMemo(() => temas.find((t) => t.id === lerGuardado()) ?? null, [temas, tema])

  const nova = useCallback((lista: Estrutura[] = candidatas) => {
    const pool = lista.filter((e) => !recentes.current.includes(nomeDe(e)))
    const base = pool.length >= 4 ? pool : lista
    const nomes = new Set(lista.map(nomeDe))
    if (base.length < 1 || nomes.size < 4) { definirRodada(null); return }
    const alvo = base[Math.floor(Math.random() * base.length)]
    const nomeAlvo = nomeDe(alvo)
    recentes.current = [nomeAlvo, ...recentes.current].slice(0, Math.min(12, Math.floor(nomes.size / 2)))
    const mesmos = embaralhar(lista.filter((e) => grupoDe(e) === grupoDe(alvo)).map(nomeDe))
    const outros = embaralhar(lista.map(nomeDe))
    const opcoes = [nomeAlvo]
    for (const n of [...mesmos, ...outros]) { if (opcoes.length >= 4) break; if (!opcoes.includes(n)) opcoes.push(n) }
    definirRodada({ alvo, opcoes: embaralhar(opcoes) })
    motor.selecionar(null, false)
    // o resto fica translúcido (dá contexto sem esconder o alvo atrás de músculo ou órgão)
    motor.isolar([alvo.id], true)
    // o nervo já é amarelo: nele o destaque é turquesa, para o alvo saltar aos olhos
    motor.mostrarRelacoes([{ id: alvo.id, cor: grupoDe(alvo) === 'nervo' ? TURQUESA : OURO }])
    // ramo de nervo, ligamento ou osso do carpo: a câmera guarda uns 9 cm de contexto em volta
    const caixa = motor.caixaDe([alvo.id])
    const lado = Math.max(...caixa.getSize(new Vector3()).toArray())
    if (lado < 90) caixa.expandByScalar((90 - lado) / 2)
    motor.focar(caixa)
  }, [candidatas, motor])

  const comecar = useCallback(async (t: TemaEstudo | 'na-tela') => {
    let lista: Estrutura[]
    if (t === NA_TELA) {
      // o que está na tela: camadas e região de agora, só o que dá para ver de longe
      lista = estruturas.filter((e) => grupos.has(grupoDe(e)) && motor.estaVisivel(e.id) && temNomePt(e) && tamanho(e) >= 14)
    } else {
      definirCarregando(t.id)
      const r = await prepararTema(t)
      definirCarregando(null)
      if (!r) return
      // no tema, o alvo é focado de perto: ossos do carpo e músculos da mão também entram
      lista = r.filter((e) => motor.existe(e.id) && temNomePt(e) && tamanho(e) >= 3)
      guardar(t.id)
    }
    recentes.current = []
    definirPlacar(PLACAR_ZERO)
    definirCandidatas(lista)
    definirTema(t)
    nova(lista)
  }, [estruturas, grupos, motor, prepararTema, nova])

  useEffect(() => {
    const t = temaInicial ? temas.find((x) => x.id === temaInicial) : null
    if (t) void comecar(t)
    return () => { motor.mostrarRelacoes([]); motor.isolar(null) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const trocarTema = () => { if (tema && tema !== NA_TELA) definirSecao(tema.secao); definirTema(null); definirRodada(null); motor.mostrarRelacoes([]); motor.isolar(null) }

  const responder = useCallback((opcao: string) => {
    if (!rodada || rodada.resposta) return
    const certo = opcao === nomeDe(rodada.alvo)
    definirRodada({ ...rodada, resposta: opcao })
    definirPlacar((p) => {
      const seguidas = certo ? p.seguidas + 1 : 0
      return { acertos: p.acertos + (certo ? 1 : 0), total: p.total + 1, seguidas, melhor: Math.max(p.melhor, seguidas) }
    })
    motor.mostrarRelacoes([{ id: rodada.alvo.id, cor: certo ? '#1f9d63' : '#d64541' }])
  }, [rodada, motor])

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.closest('input, textarea')) return
      if (!rodada) return
      const n = Number(ev.key)
      if (n >= 1 && n <= rodada.opcoes.length && !rodada.resposta) { ev.preventDefault(); responder(rodada.opcoes[n - 1]) }
      else if (ev.key === 'Enter' && rodada.resposta) { ev.preventDefault(); nova() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [rodada, responder, nova])

  const fechar = <button type="button" className="at-estudo__fechar" onClick={aoFechar} aria-label="Sair do Teste-se"><Icone nome="fechar" tamanho={18} /></button>

  // ---------- escolha do tema ----------
  if (!tema) {
    const daSecao = temas.filter((t) => t.secao === secao)
    return (
      <section className="at-estudo at-estudo--escolha" aria-label="Teste-se: escolha o que treinar">
        <header className="at-estudo__topo">
          <p className="at-estudo__selo"><Icone nome="alvo" tamanho={14} /> Teste-se</p>
          <span className="at-estudo__dica">Escolha um grupo: o atlas acende uma estrutura por vez e pergunta o nome.</span>
          {fechar}
        </header>
        <div className="at-estudo__atalhos">
          <button type="button" className="at-estudo__atalho" onClick={() => void comecar(NA_TELA)}>
            <Icone nome="olho" tamanho={16} /><span><strong>O que está na tela</strong><small>As camadas e a região de agora</small></span>
          </button>
          {ultimo && (
            <button type="button" className="at-estudo__atalho at-estudo__atalho--ultimo" onClick={() => void comecar(ultimo)} disabled={!!carregando}>
              <Icone nome="reiniciar" tamanho={16} /><span><strong>Continuar: {ultimo.nome}</strong><small>O último grupo que você treinou</small></span>
            </button>
          )}
        </div>
        <div className="at-estudo__secoes" role="tablist" aria-label="Região">
          {secoes.map((s) => <button key={s} type="button" role="tab" aria-selected={s === secao} onClick={() => definirSecao(s)}>{s}</button>)}
        </div>
        <ul className="at-estudo__temas" role="tabpanel" aria-label={secao}>
          {daSecao.map((t) => {
            const g = t.grupos[0]
            return (
              <li key={t.id}>
                <button type="button" className="at-estudo__tema" onClick={() => void comecar(t)} disabled={!!carregando} aria-busy={carregando === t.id}
                  style={{ ['--at-tema' as string]: t.cor ?? (g ? hex(GRUPOS[g].cor) : 'var(--verdete)') }}>
                  <i aria-hidden="true" />
                  <span><strong>{t.nome}</strong><small>{carregando === t.id ? 'Carregando as estruturas…' : t.resumo}</small></span>
                  {g && <em>{GRUPOS[g].rotulo.split(' ')[0]}</em>}
                  {fechado(t) && <Icone nome="cadeado" tamanho={13} />}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  // ---------- perguntas ----------
  const nomeCerto = rodada ? nomeDe(rodada.alvo) : ''
  const aproveitamento = placar.total ? Math.round((placar.acertos / placar.total) * 100) : 0
  const nomeTema = tema === NA_TELA ? 'O que está na tela' : tema.nome
  return (
    <section className="at-estudo" aria-label="Teste-se: que estrutura é esta?">
      <header className="at-estudo__topo">
        <p className="at-estudo__selo"><Icone nome="alvo" tamanho={14} /> Teste-se</p>
        <dl className="at-estudo__placar">
          <div><dt>Acertos</dt><dd>{placar.acertos}/{placar.total}</dd></div>
          <div><dt>Seguidas</dt><dd>{placar.seguidas}</dd></div>
          {placar.total > 0 && <div><dt>Aproveit.</dt><dd>{aproveitamento}%</dd></div>}
        </dl>
        {fechar}
      </header>
      <button type="button" className="at-estudo__tema-atual" onClick={trocarTema} title="Escolher outro grupo">
        <span>{nomeTema}<small>{new Set(candidatas.map(nomeDe)).size} estruturas</small></span><b>Trocar grupo</b>
      </button>
      {rodada ? (
        <>
          <h2 className="at-estudo__pergunta">{rodada.resposta ? (rodada.resposta === nomeCerto ? 'Isso mesmo!' : 'Quase lá.') : 'Que estrutura está acesa?'}
            <small>{SINGULAR[grupoDe(rodada.alvo)]}{rodada.alvo.s !== 'm' ? ` · lado ${rodada.alvo.s === 'd' ? 'direito' : 'esquerdo'}` : ''}</small></h2>
          <ol className="at-estudo__opcoes">
            {rodada.opcoes.map((o, i) => {
              const estado = !rodada.resposta ? '' : o === nomeCerto ? ' at-estudo__opcao--certa' : o === rodada.resposta ? ' at-estudo__opcao--errada' : ' at-estudo__opcao--apagada'
              return (
                <li key={o}><button type="button" className={`at-estudo__opcao${estado}`} onClick={() => responder(o)} disabled={!!rodada.resposta}>
                  <kbd>{i + 1}</kbd><span>{o}</span>{rodada.resposta && o === nomeCerto && <Icone nome="certo" tamanho={16} />}{rodada.resposta === o && o !== nomeCerto && <Icone nome="errado" tamanho={16} />}
                </button></li>
              )
            })}
          </ol>
          {rodada.resposta && (
            <div className="at-estudo__acoes">
              <button type="button" className="at-estudo__proxima" onClick={() => nova()}>Próxima<Icone nome="direita" tamanho={16} /></button>
              <button type="button" className="at-link" onClick={() => aoVerFicha(rodada.alvo)}>Ver a ficha de {nomeCerto.toLowerCase()}</button>
            </div>
          )}
          {!rodada.resposta && <p className="at-nota">Gire o modelo para achar o {grupoDe(rodada.alvo) === 'nervo' ? 'turquesa' : 'dourado'}. Teclas 1 a 4 respondem.</p>}
        </>
      ) : (
        <p className="at-estudo__vazio">{tema === NA_TELA
          ? 'Para o teste, deixe pelo menos quatro estruturas com nome na tela: ligue uma camada ou escolha uma região maior. Ou escolha um grupo pronto em Trocar grupo.'
          : 'Este grupo ainda não tem estruturas suficientes com nome em português. Escolha outro em Trocar grupo.'}</p>
      )}
    </section>
  )
}
