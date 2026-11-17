import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usarConta } from '../conta/ContextoConta'
import { usarConquistas } from '../estado/usarConquistas'
import { EVENTO_DADOS, gravar, ler, usuarioLocal, type MudancaDados } from '../estado/armazenamento'
import type { EstadoSessao } from '../dados/tipos'
import { type Metricas } from '../estado/conquistas'
import { chaveDoDia } from '../util/dia'
import { registrarAparicao } from '../eventos/memoria'
import { AVISO_EVENTOS, eventosLigados, metasLigadas } from '../eventos/preferencias'
import { usarRota } from '../util/rotas'
import { CartaoConquista, type AvisoConquista } from './CartaoConquista'
import { CHAVE_AVISOS, atualizarMeta, contextoDaRota, escolherMeta, lerEstadoAvisos, loteConquistado, podeApresentar, reconciliarAvisos, type MetaProxima } from './motorAvisos'

const DURACAO = 7_000
const OCUPADO = 'dialog[open], [role="dialog"][aria-modal="true"], .cq, .cvc, .ca-fundo, .ca-pequeno, .aviso-cookies, .sx-dica-popup'

export default function AvisosConquistas() {
  const { sessao } = usarConta()
  const { caminho } = usarRota()
  // Sem cálculo de métricas no login, pagamento e ferramentas administrativas.
  if (!sessao || /^\/(dev|admin|conta|entrar|assinatura|emails|termos|condicoes-assinatura|contato)(\/|$)/.test(caminho)) return null
  return <Controlador key={sessao.user.id} usuario={sessao.user.id} caminho={caminho} />
}

function Controlador({ usuario, caminho }: { usuario: string; caminho: string }) {
  const { status } = usarConta()
  const { metricas, pronto } = usarConquistas({ comLendarios: caminho.startsWith('/flashcards') || caminho === '/conquistas' })
  const [aviso, definirAviso] = useState<AvisoConquista | null>(null)
  const [saindo, definirSaindo] = useState(false)
  const anterior = useRef<Metricas | null>(null)
  const metricasAtuais = useRef(metricas); metricasAtuais.current = metricas
  const prontoRef = useRef(false); prontoRef.current = pronto && status.pronto
  const atividades = useRef(0), atividadeLocal = useRef(false)
  const meta = useRef<MetaProxima | null>(null), metaEm = useRef(0), metaContexto = useRef('')
  const tipoMostrado = useRef<AvisoConquista['tipo'] | null>(null)
  const ocupado = useRef(false), apresentando = useRef(false), ultima = useRef(0)
  const fim = useRef<ReturnType<typeof setTimeout>>()
  const sair = useRef(() => {})
  const geracao = () => ler<number>('reinicio:em', 0)
  const estadoSalvo = () => lerEstadoAvisos(ler(CHAVE_AVISOS, null), geracao())

  useEffect(() => {
    atividades.current = estadoSalvo()?.metas.atividades ?? 0
    const dados = (ev: Event) => {
      const m = (ev as CustomEvent<MudancaDados>).detail
      if (m.usuario !== usuario || m.origem !== 'local' || !['respondidas', 'favoritos', 'notas', 'biblioteca', 'historico', 'flashcards:registros', 'flashcards:bestiario', 'flashcards:recordes', 'feitos:servidor'].includes(m.chave)) return
      atividadeLocal.current = true; atividades.current++
    }
    window.addEventListener(EVENTO_DADOS, dados)
    return () => window.removeEventListener(EVENTO_DADOS, dados)
    // Perfil do armazenamento já está definido antes de montar este controlador.
  }, [usuario])

  useEffect(() => {
    if (!pronto || !status.pronto || usuarioLocal() !== usuario) return
    const salvo = estadoSalvo()
    const novo = reconciliarAvisos(salvo, metricas, geracao())
    if (!eventosLigados()) novo.pendentes = [] // Desligar não acumula comemorações para depois.
    gravar(CHAVE_AVISOS, novo, 'nuvem')
    const rota = location.hash.slice(1).split('?')[0] || '/'
    const sessao = ler<EstadoSessao | null>('sessao:atual', null)
    const contexto = contextoDaRota(rota, rota === '/sessao' ? sessao?.id : undefined, chaveDoDia())
    if (salvo && anterior.current && atividadeLocal.current && contexto && metasLigadas()) {
      const escolhida = escolherMeta(anterior.current, metricas, novo, contexto, Date.now(), atividades.current)
      if (escolhida) { meta.current = escolhida; metaEm.current = Date.now(); metaContexto.current = contexto.id }
    }
    atividadeLocal.current = false
    anterior.current = metricas
  }, [metricas, pronto, status.pronto, usuario])

  useEffect(() => {
    let vivo = true
    const apagar = () => { clearTimeout(fim.current); ocupado.current = false; tipoMostrado.current = null; definirAviso(null); definirSaindo(false) }
    const fechar = () => {
      clearTimeout(fim.current)
      if (!ocupado.current) return
      definirSaindo(true)
      fim.current = setTimeout(() => { if (vivo) apagar() }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250)
    }
    sair.current = fechar
    const permitidoAgora = () => {
      const rota = location.hash.slice(1).split('?')[0] || '/'
      const s = ler<EstadoSessao | null>('sessao:atual', null)
      const escrevendo = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]') ?? false
      if (!podeApresentar(rota, s, document.visibilityState === 'visible', escrevendo || !!document.querySelector(OCUPADO))) return false
      // No treino, só depois da resposta. Não cobre a questão enquanto a pessoa decide.
      if (rota === '/sessao' && (!s || (!s.concluidaEm && !s.respostas[s.ids[s.posicao]]))) return false
      if (rota.startsWith('/questao/') && !document.querySelector('.resultado, .gabarito')) return false
      return true
    }
    const apresentar = async () => {
      if (!vivo || ocupado.current || apresentando.current || !prontoRef.current || !eventosLigados() || usuarioLocal() !== usuario || !permitidoAgora() || Date.now() - ultima.current < 3500) return
      apresentando.current = true
      const selecionar = () => {
        if (!vivo || ocupado.current || usuarioLocal() !== usuario || !permitidoAgora()) return
        const estado = estadoSalvo()
        if (!estado) return
        const atuais = metricasAtuais.current
        const ganhas = loteConquistado(estado, atuais)
        let proximo: AvisoConquista | null = null
        if (ganhas.length) {
          proximo = { tipo: 'ganha', emblema: ganhas[0], outras: ganhas.length - 1 }
          const ids = new Set(ganhas.map(e => e.id))
          estado.pendentes = estado.pendentes.filter(id => !ids.has(id))
          meta.current = null // Uma recompensa real tem prioridade sobre incentivo.
        } else if (meta.current && metasLigadas() && Date.now() - metaEm.current < 90_000) {
          const rota = location.hash.slice(1).split('?')[0] || '/'
          const s = ler<EstadoSessao | null>('sessao:atual', null)
          const contexto = contextoDaRota(rota, rota === '/sessao' ? s?.id : undefined, chaveDoDia())
          const e = meta.current.emblema
          const atualizada = contexto && contexto.id === metaContexto.current ? atualizarMeta(meta.current, atuais, estado, contexto, Date.now(), atividades.current) : null
          if (contexto && atualizada) {
            proximo = { tipo: 'perto', emblema: e, meta: atualizada }
            const ids = estado.metasPorContexto[contexto.id] ?? (estado.metas.contexto === contexto.id ? estado.metas.ids : [])
            estado.metas = { contexto: contexto.id, ids: [...ids, e.id], em: Date.now(), atividades: atividades.current }
            estado.metasPorContexto = Object.fromEntries([...Object.entries(estado.metasPorContexto).filter(([id]) => id !== contexto.id), [contexto.id, [...ids, e.id]]].slice(-50))
          }
          meta.current = null
        }
        if (!proximo) return
        // Confirma sob Web Lock antes de mostrar: duas abas não festejam a mesma fila.
        gravar(CHAVE_AVISOS, estado, 'nuvem')
        registrarAparicao(Date.now()) // Os convites comerciais aguardam para não empilhar.
        ultima.current = Date.now(); tipoMostrado.current = proximo.tipo; ocupado.current = true; definirSaindo(false); definirAviso(proximo)
        fim.current = setTimeout(fechar, DURACAO)
      }
      try {
        if (navigator.locks?.request) await navigator.locks.request(`ortoquestoes:aviso-conquista:${usuario}`, { ifAvailable: true }, trava => { if (trava) selecionar() })
        else selecionar()
      } catch { selecionar() } finally { apresentando.current = false }
    }
    const preferencia = () => {
      if (!metasLigadas()) { meta.current = null; if (tipoMostrado.current === 'perto') apagar() }
      const e = estadoSalvo()
      if (!eventosLigados()) {
        meta.current = null
        if (e) gravar(CHAVE_AVISOS, { ...e, pendentes: [], silenciado: true }, 'nuvem')
        apagar()
      } else if (e?.silenciado) {
        gravar(CHAVE_AVISOS, reconciliarAvisos(e, metricasAtuais.current, geracao()), 'nuvem')
      }
    }

    const rota = () => {
      const r = location.hash.slice(1).split('?')[0] || '/'
      const s = ler<EstadoSessao | null>('sessao:atual', null)
      if (contextoDaRota(r, r === '/sessao' ? s?.id : undefined, chaveDoDia())?.id !== metaContexto.current) meta.current = null
      apagar()
    }
    const ocultar = () => { if (document.hidden) apagar() }
    const dados = () => { if (ocupado.current && !permitidoAgora()) apagar() }
    const t = setInterval(() => { if (ocupado.current && !permitidoAgora()) apagar(); else void apresentar() }, 900)
    window.addEventListener(AVISO_EVENTOS, preferencia); window.addEventListener('hashchange', rota); document.addEventListener('visibilitychange', ocultar)
    window.addEventListener(EVENTO_DADOS, dados)
    return () => { vivo = false; clearInterval(t); clearTimeout(fim.current); window.removeEventListener(AVISO_EVENTOS, preferencia); window.removeEventListener('hashchange', rota); document.removeEventListener('visibilitychange', ocultar); window.removeEventListener(EVENTO_DADOS, dados) }
  }, [usuario])

  return createPortal(<div className="nc-vivo" role="status" aria-live="polite" aria-atomic="true">{aviso && <CartaoConquista aviso={aviso} saindo={saindo} fechar={() => sair.current()} />}</div>, document.body)
}
