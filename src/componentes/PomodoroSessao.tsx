import { Icone } from './Icone'
import { correndo, duracaoDaFase, formatarRelogio, restante, RITMOS } from '../util/pomodoro'
import type { ControlePomodoro } from '../estado/preferenciasSessao'

const ROTULO_FASE = { foco: 'Foco', pausa: 'Pausa' } as const

/** Bloco do Pomodoro na coluna lateral: fase, relógio, barra, iniciar/pausar e o ritmo. */
export function PomodoroBloco({ controle }: { controle: ControlePomodoro }) {
  const { estado, agora, aviso } = controle
  const falta = restante(estado, agora)
  const total = duracaoDaFase(estado, estado.fase)
  const andou = total ? 1 - falta / total : 0
  const ativo = correndo(estado)
  return (
    <div className={'pomo pomo--' + estado.fase}>
      <div className="pomo__topo">
        <span className="pomo__fase">{ROTULO_FASE[estado.fase]}</span>
        <span className="pomo__relogio numerico" role="timer" aria-label={`${ROTULO_FASE[estado.fase]}: faltam ${formatarRelogio(falta)}`}>{formatarRelogio(falta)}</span>
      </div>
      <div className="pomo__barra" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, andou * 100))}%` }} /></div>
      <div className="pomo__acoes">
        {ativo ? (
          <button type="button" className="pomo__botao pomo__botao--principal" onClick={controle.pausar}><Icone nome="pausar" tamanho={15} /> Pausar</button>
        ) : (
          <button type="button" className="pomo__botao pomo__botao--principal" onClick={controle.iniciar}><Icone nome="tocar" tamanho={15} /> {falta < total ? 'Continuar' : estado.fase === 'foco' ? 'Começar o foco' : 'Começar a pausa'}</button>
        )}
        <button type="button" className="pomo__botao pomo__botao--icone" onClick={controle.reiniciar} aria-label="Recomeçar o foco" title="Recomeçar o foco"><Icone nome="reiniciar" tamanho={15} /></button>
      </div>
      <div className="pomo__ritmos" role="group" aria-label="Ritmo do Pomodoro">
        {RITMOS.map((r) => (
          <button
            key={r.foco}
            type="button"
            className="pomo__ritmo"
            aria-pressed={estado.minutosFoco === r.foco}
            onClick={() => estado.minutosFoco !== r.foco && controle.trocarRitmo(r.foco, r.pausa)}
          >
            {r.foco}/{r.pausa} min
          </button>
        ))}
        {estado.ciclos > 0 && <span className="pomo__ciclos">{estado.ciclos} {estado.ciclos === 1 ? 'foco feito' : 'focos feitos'}</span>}
      </div>
      <p className="pomo__aviso" role="status" aria-live="polite">{aviso ?? ''}</p>
    </div>
  )
}

/** Versão de bolso, na barra da sessão (celular ou sem a coluna lateral): toca para pausar ou seguir. */
export function PomodoroPilula({ controle }: { controle: ControlePomodoro }) {
  const { estado, agora } = controle
  const ativo = correndo(estado)
  const falta = restante(estado, agora)
  return (
    <button
      type="button"
      className={'pomo-pilula pomo-pilula--' + estado.fase + (ativo ? ' pomo-pilula--ativo' : '')}
      onClick={ativo ? controle.pausar : controle.iniciar}
      aria-label={`Pomodoro, ${ROTULO_FASE[estado.fase].toLowerCase()}: ${formatarRelogio(falta)}. ${ativo ? 'Pausar' : 'Começar'}`}
      title={ativo ? 'Pausar o Pomodoro' : 'Começar o Pomodoro'}
    >
      <Icone nome={ativo ? 'pausar' : 'tocar'} tamanho={13} />
      <span className="pomo-pilula__fase">{ROTULO_FASE[estado.fase]}</span>
      <span className="numerico">{formatarRelogio(falta)}</span>
    </button>
  )
}
