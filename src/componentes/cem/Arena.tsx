import { useEffect, useRef, useState } from 'react'
import type { LinhaRanking, Periodo } from './regras'

const DEZ_MIN = 600_000
const proximaVirada = () => Math.ceil((Date.now() + 1) / DEZ_MIN) * DEZ_MIN
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * O relógio da próxima atualização. O ranking é recalculado no servidor de 10 em 10 minutos (pg_cron, nos minutos
 * redondos); 30 s depois de cada virada a lista nova já está pronta e a página pede de novo. O segundo a segundo só
 * escreve no próprio texto (sem render do React a cada segundo) e para com a aba escondida.
 */
export function RelogioArena({ aoAtualizar }: { aoAtualizar: () => void }) {
  const texto = useRef<HTMLSpanElement>(null)
  const ampulheta = useRef<HTMLSpanElement>(null)
  const [alvo, definirAlvo] = useState(proximaVirada)
  const [viradas, definirViradas] = useState(0)
  useEffect(() => {
    let relogio = 0
    const pintar = () => {
      const falta = alvo - Date.now()
      if (texto.current) texto.current.textContent = mmss(falta)
      if (ampulheta.current) ampulheta.current.style.setProperty('--areia', String(Math.max(0, Math.min(1, falta / DEZ_MIN))))
    }
    const tique = () => { pintar(); relogio = window.setTimeout(tique, 1000 - (Date.now() % 1000) + 5) }
    const visivel = () => { window.clearTimeout(relogio); if (!document.hidden) tique() }
    tique()
    document.addEventListener('visibilitychange', visivel)
    const virada = window.setTimeout(() => { definirAlvo(proximaVirada()); definirViradas((n) => n + 1) }, Math.max(0, alvo - Date.now()) + 1000)
    return () => { window.clearTimeout(relogio); window.clearTimeout(virada); document.removeEventListener('visibilitychange', visivel) }
  }, [alvo])
  // 30 s depois de cada virada (29 s depois do aviso), a lista nova já está pronta no servidor.
  useEffect(() => {
    if (!viradas) return
    const recarga = window.setTimeout(aoAtualizar, 29_000)
    return () => window.clearTimeout(recarga)
  }, [viradas, aoAtualizar])
  return <p className="cem-relogio">
    <span className="cem-relogio__ampulheta" ref={ampulheta} aria-hidden="true"><i /><i /></span>
    <span className="cem-relogio__texto">
      <span className="cem-relogio__rotulo">Próxima atualização</span>
      {/* O leitor de tela ouve o horário uma vez (não a cada segundo). */}
      <b className="cem-relogio__tempo numerico" ref={texto} aria-hidden="true">{mmss(alvo - Date.now())}</b>
      <span className="so-leitor">às {new Date(alvo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
    </span>
    <span className="cem-relogio__nota">O ranking atualiza a cada 10 minutos</span>
  </p>
}

/** O cabeçalho da arena: nome, critério, relógio e o placar do período (participantes, questões, líder). */
export function Arena({ top, periodo, totalLista, aoAtualizar }: { top: LinhaRanking[] | null; periodo: Periodo; totalLista: number; aoAtualizar: () => void }) {
  const semana = periodo === 'semana'
  return <header className="cem-arena">
    <div className="cem-arena__titulo">
      <p className="cem-rotulo">Ranking · Salão dos Cem</p>
      <h1 id="cem-titulo">Arena dos Residentes</h1>
      <p className="cem-arena__sub">Cada questão diferente respondida vale um ponto.</p>
    </div>
    <RelogioArena aoAtualizar={aoAtualizar} />
    {top && top.length > 0 && <dl className="cem-placar">
      <div><dt>Na arena</dt><dd className="numerico">{totalLista >= 100 ? '100+' : totalLista >= 50 ? `${totalLista}` : totalLista}</dd></div>
      <div><dt>Questões do top 50</dt><dd className="numerico">{top.slice(0, 50).reduce((s, l) => s + l.total, 0).toLocaleString('pt-BR')}</dd></div>
      <div><dt>{semana ? 'Líder da semana' : 'Líder geral'}</dt><dd className="cem-placar__nome">{top[0].apelido}</dd></div>
      <div><dt>Período</dt><dd>{semana ? 'Últimos 7 dias' : 'Geral'}</dd></div>
    </dl>}
  </header>
}
