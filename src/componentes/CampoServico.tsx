import { useEffect, useRef, useState, type ReactNode } from 'react'
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

const ESCREVER = '__escrever__'

/**
 * Escolha do serviço (21/10/2026, pedido do Tales): uma lista com os serviços que o site
 * conhece, e a primeira opção dela é escrever o nome, para quem não acha o seu. Ao escolher
 * essa opção, o campo de texto aparece logo abaixo, já com o cursor.
 */
function EscolherServico({ valor, aoMudar, exemplo, obrigatorio, classeEntrada }: {
  valor: string; aoMudar: (v: string) => void; exemplo: string; obrigatorio: boolean; classeEntrada: string
}) {
  const conhecido = SUGESTOES.includes(valor)
  const [escrevendo, definirEscrevendo] = useState(!!valor.trim() && !conhecido)
  const texto = useRef<HTMLInputElement>(null)
  // Valor que chegou de fora (perfil carregado depois): escrito à mão abre o campo de texto.
  useEffect(() => { if (valor.trim() && !SUGESTOES.includes(valor)) definirEscrevendo(true) }, [valor])
  function escolher(v: string) {
    if (v === ESCREVER) {
      definirEscrevendo(true)
      if (conhecido) aoMudar('')
      window.setTimeout(() => texto.current?.focus(), 0)
      return
    }
    definirEscrevendo(false)
    aoMudar(v)
  }
  return <>
    <select id="campo-servico" className={'entrada campo-servico__lista ' + classeEntrada} required={obrigatorio && !escrevendo} value={escrevendo ? ESCREVER : conhecido ? valor : ''} onChange={(e) => escolher(e.target.value)}>
      <option value="" disabled>Escolha na lista ou escreva o nome</option>
      <option value={ESCREVER}>✎ Não achei o meu: escrever o nome</option>
      {SUGESTOES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
    {escrevendo && <input ref={texto} className={'entrada ' + classeEntrada} aria-label="Nome do serviço" required={obrigatorio} value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={exemplo} />}
  </>
}

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
        {!soVarios && (situacao === 'estudante'
          ? <input id="campo-servico" className={'entrada ' + classeEntrada} required={obrigatorio} value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={exemplo} />
          : <EscolherServico valor={valor === SERVICO_VARIOS ? '' : valor} aoMudar={aoMudar} exemplo={exemplo} obrigatorio={obrigatorio} classeEntrada={classeEntrada} />)}
        {podeVarios && (
          <label className="caixa campo-servico__varios">
            <input type="checkbox" checked={soVarios} onChange={(e) => aoMudar(e.target.checked ? SERVICO_VARIOS : '')} />
            <span>Atuo em vários hospitais ou em consultório próprio</span>
          </label>
        )}
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
      <EscolherServico valor={principal} aoMudar={mudarPrincipal} exemplo={exemplo} obrigatorio={obrigatorio && !varios} classeEntrada={classeEntrada} />
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
