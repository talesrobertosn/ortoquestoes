import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LIMITES_HABILITADOS, recurso } from '../config'
import { usarPremium } from '../conta/premium'
import { ler } from '../estado/armazenamento'
import { registrarAparicao, ultimaAparicao } from '../eventos/memoria'
import { href, navegar } from '../util/rotas'
import { Icone } from '../componentes/Icone'
import { MascoteAcesso } from '../componentes/MascoteAcesso'
import './ConviteAssinar.css'

/**
 * Convite gentil para assinar (pedido do Tales, 17/10/2026): boa parte de quem passa de 50 questões assina.
 * Sem preço e sem pressão; fala do que o plano faz pela pessoa: o cronograma calculado até o dia da prova,
 * o tempo que ela deixa de gastar decidindo o que estudar depois do plantão.
 *
 * - Grande (janela no meio da tela, com arte): a partir de 50 questões respondidas, no máximo 1 vez a cada 30 h.
 * - Pequeno (cartão no canto): a partir de 20 questões, no máximo 1 vez a cada 12 h (e nunca nas 12 h depois do grande).
 * Só para quem não assina. Nunca interrompe questão, sessão, leitura de resumo, login ou pagamento: espera
 * 90 s de uso de verdade numa página tranquila. Não aparece junto de um easter egg (respeita o limite deles).
 * As marcas de tempo ficam no navegador (`oq:convite-assinar:v1`).
 */
const CHAVE = 'oq:convite-assinar:v1'
const HORA = 3_600_000
const INTERVALO_GRANDE = 30 * HORA
const INTERVALO_PEQUENO = 12 * HORA
const MINIMO_GRANDE = 50
const MINIMO_PEQUENO = 20
const USO_NECESSARIO_MS = 90_000
const OCIOSO_MS = 60_000
/** Sem convite nestas páginas (estudo em andamento, conta e pagamento). */
const ROTAS_PROTEGIDAS = ['sessao', 'questao', 'entrar', 'assinatura', 'condicoes-assinatura', 'termos', 'admin', 'emails', 'flashcards', 'simulado-nacional', 'conta']

type Marcas = { grande?: number; pequeno?: number }
function lerMarcas(): Marcas { try { return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') ?? {} } catch { return {} } }
function gravarMarca(tipo: keyof Marcas, em: number) { try { localStorage.setItem(CHAVE, JSON.stringify({ ...lerMarcas(), [tipo]: em })) } catch { /* só nesta aba */ } }

export function qualConvite(respondidas: number, marcas: Marcas, agora: number): 'grande' | 'pequeno' | null {
  const desdeGrande = agora - (marcas.grande ?? 0), desdePequeno = agora - (marcas.pequeno ?? 0)
  if (respondidas >= MINIMO_GRANDE && desdeGrande >= INTERVALO_GRANDE && desdePequeno >= 2 * HORA) return 'grande'
  if (respondidas >= MINIMO_PEQUENO && desdePequeno >= INTERVALO_PEQUENO && desdeGrande >= INTERVALO_PEQUENO) return 'pequeno'
  return null
}

const protegida = (caminho: string) => {
  const [primeiro, segundo] = caminho.replace(/^\//, '').split('/')
  return ROTAS_PROTEGIDAS.includes(primeiro) || (primeiro === 'resumos' && !!segundo && segundo !== 'frases' && segundo !== 'caderno')
}

export default function ConviteAssinar({ caminho }: { caminho: string }) {
  const { premium, carregado, logado } = usarPremium()
  const [aberto, definirAberto] = useState<'grande' | 'pequeno' | null>(null)
  const [respondidas, definirRespondidas] = useState(0)
  const caminhoRef = useRef(caminho)
  caminhoRef.current = caminho
  const elegivel = !premium && (!logado || carregado)
  // Só no ambiente de desenvolvimento: #/...?convite=grande|pequeno abre na hora, para conferir a arte.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const forcar = location.hash.match(/convite=(grande|pequeno)/)?.[1] as 'grande' | 'pequeno' | undefined
    if (forcar) { definirRespondidas(forcar === 'grande' ? 57 : 23); definirAberto(forcar) }
  }, [])

  useEffect(() => {
    if (!elegivel || aberto) return
    let uso = 0, ultimoToque = Date.now(), antes = Date.now()
    const tocar = () => { ultimoToque = Date.now() }
    const eventos = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, tocar, { passive: true }))
    const t = window.setInterval(() => {
      const agora = Date.now(), passo = Math.min(5000, agora - antes)
      antes = agora
      if (document.hidden || agora - ultimoToque > OCIOSO_MS || protegida(caminhoRef.current)) return
      uso += passo
      if (uso < USO_NECESSARIO_MS) return
      // um easter egg acabou de aparecer: espera um pouco para não empilhar
      if (agora - ultimaAparicao() < 10 * 60_000) return
      const n = Object.keys(ler<Record<string, unknown>>('respondidas', {})).length
      const tipo = qualConvite(n, lerMarcas(), agora)
      if (!tipo) return
      gravarMarca(tipo, agora)
      registrarAparicao(agora)
      definirRespondidas(n)
      definirAberto(tipo)
    }, 5000)
    return () => { window.clearInterval(t); eventos.forEach((e) => window.removeEventListener(e, tocar)) }
  }, [elegivel, aberto])

  // trocou para uma página protegida (abriu uma questão): fecha sem alarde
  useEffect(() => { if (aberto && protegida(caminho)) definirAberto(null) }, [caminho, aberto])
  useEffect(() => {
    if (aberto !== 'grande') return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') definirAberto(null) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto])

  if (!aberto || !elegivel) return null
  const conhecer = () => { definirAberto(null); navegar(`/assinatura?origem=convite-${aberto}`) }
  const n = respondidas.toLocaleString('pt-BR')

  if (aberto === 'pequeno') return createPortal(
    <aside className="ca-pequeno nao-imprime" role="status" aria-live="polite">
      <img className="ca-pequeno__mascote" src={recurso('eventos/mascote.png')} width={56} height={56} alt="" draggable={false} />
      <div className="ca-pequeno__texto">
        <strong>Já são {n} questões. Que ritmo bonito.</strong>
        <span>Sabia que o cronograma monta o seu dia até a prova? Você só abre e estuda.</span>
        <span className="ca-pequeno__acoes">
          <a href={href('/assinatura?origem=convite-pequeno')} onClick={(e) => { e.preventDefault(); conhecer() }}>Ver como funciona <Icone nome="direita" tamanho={14} /></a>
        </span>
      </div>
      <button type="button" className="ca-pequeno__fechar" onClick={() => definirAberto(null)} aria-label="Fechar"><Icone nome="fechar" tamanho={18} /></button>
    </aside>, document.body)

  const BENEFICIOS = [
    { icone: 'calendario' as const, titulo: 'Um cronograma calculado até o dia da prova', texto: 'Os temas que mais caem primeiro, distribuídos pelos dias que faltam. Atrasou ou adiantou, ele se reajusta sozinho.' },
    { icone: 'relogio' as const, titulo: 'Seu tempo de volta', texto: 'Saiu do plantão ou de uma cirurgia atrás da outra? Não precisa decidir nada: a lista do dia já está pronta, com o tempo de cada parte.' },
    LIMITES_HABILITADOS
      ? { icone: 'raio' as const, titulo: 'Questões sem limite', texto: 'Estude o quanto quiser, todos os dias, com a revisão espaçada trazendo de volta o que você errou.' }
      : { icone: 'trofeu' as const, titulo: 'Simulado Nacional e muito mais', texto: 'Uma prova igual para todo o Brasil todo mês, as questões dos resumos, a liga da sua residência e o relatório mensal.' },
  ]
  return createPortal(
    <div className="ca-fundo nao-imprime" onClick={(e) => { if (e.target === e.currentTarget) definirAberto(null) }}>
      <div className="ca-janela" role="dialog" aria-modal="true" aria-labelledby="ca-titulo">
        <button type="button" className="ca-janela__fechar" onClick={() => definirAberto(null)} aria-label="Fechar"><Icone nome="fechar" tamanho={20} /></button>
        <div className="ca-arte" aria-hidden="true">
          <span className="ca-arte__lua" />
          {[12, 28, 46, 63, 81, 90].map((x, i) => <span key={x} className="ca-arte__estrela" style={{ left: `${x}%`, top: `${12 + (i % 3) * 11}%`, animationDelay: `${i * 0.4}s` }} />)}
          {/* Print real do calendário do cronograma (Tales, 17/10/2026): duas semanas feitas e o dia de hoje. */}
          <figure className="ca-arte__calendario">
            <p>Seu cronograma</p>
            <img src={recurso('convite/calendario-real.webp')} width={760} height={279} alt="" loading="lazy" draggable={false} />
            <small><Icone nome="certo" tamanho={11} /> dias feitos · o de hoje já pronto</small>
          </figure>
          <MascoteAcesso escala={1.4} className="ca-arte__mascote" />
          <span className="ca-arte__chao" />
        </div>
        <div className="ca-corpo">
          <p className="ca-selo">Você já respondeu {n} questões</p>
          <h2 id="ca-titulo">Você já faz a sua parte. Que tal deixar o plano com a gente?</h2>
          <p className="ca-lide">A rotina de residente é puxada. Com a assinatura, você chega cansado, abre o site e só estuda: o que fazer hoje, quanto tempo leva e o que vem amanhã já estão decididos, até o dia da prova.</p>
          <ul className="ca-beneficios">{BENEFICIOS.map((b) => <li key={b.titulo}><span><Icone nome={b.icone} tamanho={18} /></span><div><strong>{b.titulo}</strong><small>{b.texto}</small></div></li>)}</ul>
          <div className="ca-acoes">
            <a className="botao botao--principal" href={href('/assinatura?origem=convite-grande')} onClick={(e) => { e.preventDefault(); conhecer() }}>Conhecer o plano <Icone nome="direita" tamanho={16} /></a>
            <button type="button" className="botao botao--fantasma" onClick={() => definirAberto(null)}>Hoje não, obrigado</button>
          </div>
          <p className="ca-nota">Sem pressa: você continua estudando de graça normalmente. Este convite só aparece de vez em quando.</p>
        </div>
      </div>
    </div>, document.body)
}
