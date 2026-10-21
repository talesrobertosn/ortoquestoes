import { useEffect, useState, type ReactNode } from 'react'
import { LOCAIS_MAXIMO, LOCAL_TAMANHO, SERVICO_VARIOS, trabalhaComoEspecialista } from '../conta/perfilEstudo'
import { SERVICOS_CONHECIDOS } from './admin/servicosConhecidos'
import { Icone } from './Icone'
import '../estilos/componentes/PerfilRapido.css'

/** O que gravamos quando a pessoa atende em vários lugares, sem um serviço principal. */
export { SERVICO_VARIOS }

/** Rótulo e exemplo do campo conforme a etapa: estudante tem faculdade; quem já é ortopedista pode ter vários lugares. */
function textos(situacao: string) {
  if (situacao === 'estudante') return { rotulo: 'Faculdade de medicina', exemplo: 'Ex.: UFG, USP, Unifesp' }
  if (trabalhaComoEspecialista(situacao)) return { rotulo: 'Hospital ou serviço onde mais trabalha', exemplo: 'Ex.: Hospital, clínica, instituição' }
  return { rotulo: 'Hospital ou serviço da sua residência', exemplo: 'Ex.: Hospital das Clínicas, Santa Casa, INTO' }
}

/** Sugestões ao digitar: os serviços que o painel já reconhece pelo nome completo. */
const ID_SUGESTOES = 'servicos-sugeridos'
const SUGESTOES = SERVICOS_CONHECIDOS.map((s) => s.nome)

/**
 * Onde a pessoa estuda ou trabalha.
 *
 * Com `aoMudarLocais`, quem já não é estudante pode listar outros lugares: o
 * ortopedista marca "Trabalho em vários locais" (e pode deixar o principal em
 * branco, como antes), o residente marca que também trabalha em outros serviços.
 * Sem `aoMudarLocais`, o campo é o de sempre (um serviço, ou "vários" para ortopedista).
 */
export function CampoServico({ situacao, valor, aoMudar, locais = [], aoMudarLocais, obrigatorio = false, classeEntrada = '', extra }: {
  situacao: string; valor: string; aoMudar: (v: string) => void
  locais?: string[]; aoMudarLocais?: (l: string[]) => void
  obrigatorio?: boolean; classeEntrada?: string; extra?: ReactNode
}) {
  const { rotulo, exemplo } = textos(situacao)
  const especialista = trabalhaComoEspecialista(situacao)
  const comLista = !!aoMudarLocais && !!situacao && situacao !== 'estudante'
  const [varios, definirVarios] = useState(valor === SERVICO_VARIOS || locais.some((l) => l.trim()))
  useEffect(() => { if (locais.some((l) => l.trim()) || valor === SERVICO_VARIOS) definirVarios(true) }, [locais, valor])
  // "Vários serviços" só vale para quem trabalha como especialista: trocou para residente, o campo volta a pedir o serviço.
  useEffect(() => { if (comLista && !especialista && valor === SERVICO_VARIOS) aoMudar('') }, [comLista, especialista, valor, aoMudar])

  // Modo de antes (sem lista): "vários" troca o campo por uma marcação só.
  if (!comLista) {
    const podeVarios = especialista
    const soVarios = podeVarios && valor === SERVICO_VARIOS
    return (
      <div className="campo campo-servico" data-campo="servico">
        <label className="campo-servico__rotulo" htmlFor="campo-servico">{rotulo}</label>
        {!soVarios && <input id="campo-servico" className={'entrada ' + classeEntrada} required={obrigatorio && !soVarios} value={valor === SERVICO_VARIOS ? '' : valor} onChange={(e) => aoMudar(e.target.value)} placeholder={exemplo} list={situacao === 'estudante' ? undefined : ID_SUGESTOES} />}
        {podeVarios && (
          <label className="caixa campo-servico__varios">
            <input type="checkbox" checked={soVarios} onChange={(e) => aoMudar(e.target.checked ? SERVICO_VARIOS : '')} />
            <span>Atuo em vários hospitais ou em consultório próprio</span>
          </label>
        )}
        <datalist id={ID_SUGESTOES}>{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
        {extra}
      </div>
    )
  }

  const principal = valor === SERVICO_VARIOS ? '' : valor
  function mudarPrincipal(texto: string) {
    aoMudar(texto || (varios && especialista ? SERVICO_VARIOS : ''))
  }
  function alternar(marcado: boolean) {
    definirVarios(marcado)
    if (marcado) {
      if (especialista && !valor.trim()) aoMudar(SERVICO_VARIOS)
      if (!locais.length) aoMudarLocais!([''])
    } else {
      aoMudarLocais!([])
      if (valor === SERVICO_VARIOS) aoMudar('')
    }
  }
  const mudarLocal = (i: number, texto: string) => aoMudarLocais!(locais.map((l, j) => (j === i ? texto.slice(0, LOCAL_TAMANHO) : l)))
  const tirarLocal = (i: number) => aoMudarLocais!(locais.filter((_, j) => j !== i))

  return (
    <div className="campo campo-servico" data-campo="servico">
      <label className="campo-servico__rotulo" htmlFor="campo-servico">{rotulo}{varios && especialista && <span className="meta"> (se houver um principal)</span>}</label>
      <input id="campo-servico" className={'entrada ' + classeEntrada} required={obrigatorio && !varios} value={principal} onChange={(e) => mudarPrincipal(e.target.value)} placeholder={exemplo} list={ID_SUGESTOES} />
      <label className="caixa campo-servico__varios">
        <input type="checkbox" checked={varios} onChange={(e) => alternar(e.target.checked)} />
        <span>{especialista ? 'Trabalho em vários locais' : 'Também trabalho em outros serviços (plantões, clínicas)'}</span>
      </label>
      {varios && (
        <div className="campo-locais" role="group" aria-label={especialista ? 'Outros locais onde você trabalha' : 'Outros serviços onde você trabalha'}>
          <span className="campo-locais__titulo">{especialista ? 'Outros locais onde você trabalha' : 'Outros serviços'} <span className="meta">(opcional)</span></span>
          {locais.map((l, i) => (
            <div className="campo-locais__item" key={i}>
              <input className="entrada" value={l} maxLength={LOCAL_TAMANHO} onChange={(e) => mudarLocal(i, e.target.value)} placeholder={i === 0 ? 'Ex.: Santa Casa, clínica própria' : 'Outro hospital ou clínica'} list={ID_SUGESTOES} aria-label={`Local ${i + 1}`} />
              <button type="button" className="botao-icone campo-locais__tirar" onClick={() => tirarLocal(i)} aria-label={`Tirar o local ${i + 1}`}><Icone nome="fechar" tamanho={16} /></button>
            </div>
          ))}
          {locais.length < LOCAIS_MAXIMO && <button type="button" className="campo-locais__mais" onClick={() => aoMudarLocais!([...locais, ''])}>+ Adicionar {locais.length ? 'outro local' : 'um local'}</button>}
        </div>
      )}
      <datalist id={ID_SUGESTOES}>{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
      {extra}
    </div>
  )
}
