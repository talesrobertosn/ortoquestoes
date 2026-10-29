import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { LOCAIS_MAXIMO, LOCAL_TAMANHO, SERVICO_VARIOS, trabalhaComoEspecialista } from '../conta/perfilEstudo'
import { buscarServicos, localDoServico, servicoConhecido, servicoPeloNome, SERVICOS_CONHECIDOS } from './admin/servicosConhecidos'
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

/** Sugestões dos "outros locais": os serviços que o painel já reconhece pelo nome completo. */
const ID_SUGESTOES = 'servicos-sugeridos'
const SUGESTOES = SERVICOS_CONHECIDOS.map((s) => s.nome)
const ID_LISTA = 'servicos-lista'
/** A busca mostra até tantos serviços de uma vez; o resto aparece ao digitar. */
const MAXIMO_NA_LISTA = 40

/**
 * Escolha do serviço (21/10/2026; busca em 29/10/2026, pedidos do Tales): um campo que já
 * mostra os serviços que o site conhece, primeiro os do estado da pessoa, e filtra enquanto
 * ela digita ("manda" acha o Mandaqui). A primeira opção é sempre escrever o nome, para quem
 * não acha o seu. Quem escreve à mão algo parecido com um serviço da lista vê "Você quis
 * dizer…?" e troca com um toque, para o mesmo hospital não ficar escrito de dois jeitos.
 */
function EscolherServico({ valor, aoMudar, exemplo, obrigatorio, classeEntrada, uf }: {
  valor: string; aoMudar: (v: string) => void; exemplo: string; obrigatorio: boolean; classeEntrada: string; uf?: string
}) {
  const escolhido = servicoPeloNome(valor)
  const [aberta, definirAberta] = useState(false)
  // Escolheu "escrever o nome": a lista não volta a abrir sozinha enquanto digita.
  const [escrevendo, definirEscrevendo] = useState(false)
  const [ativo, definirAtivo] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const achados = useMemo(() => (escolhido ? [] : buscarServicos(valor, uf).slice(0, MAXIMO_NA_LISTA)), [escolhido, valor, uf])
  // Só uma sugestão (a pessoa confirma com um toque): vale também um serviço de outro estado, perto da divisa.
  const sugestao = !escolhido && !aberta && valor.trim().length >= 3 ? servicoConhecido(valor, uf) ?? servicoConhecido(valor) : null
  const total = achados.length + 1

  function abrir() { if (!escrevendo) { definirAberta(true); definirAtivo(0) } }
  function escolher(i: number) {
    definirAberta(false)
    if (i === 0) { definirEscrevendo(true); entrada.current?.focus(); return }
    aoMudar(achados[i - 1].nome)
  }
  function trocar() {
    aoMudar('')
    definirEscrevendo(false)
    definirAberta(true)
    definirAtivo(0)
    window.setTimeout(() => entrada.current?.focus(), 0)
  }
  function tecla(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!aberta) { definirEscrevendo(false); definirAberta(true); definirAtivo(0); return }
      definirAtivo((a) => (a + (e.key === 'ArrowDown' ? 1 : total - 1)) % total)
    } else if (e.key === 'Enter' && aberta) { e.preventDefault(); escolher(ativo) }
    else if (e.key === 'Escape' && aberta) { e.preventDefault(); definirAberta(false) }
  }

  if (escolhido) return (
    <div className="servico-escolhido">
      <span className="servico-escolhido__icone" aria-hidden="true"><Icone nome="certo" tamanho={16} /></span>
      <span className="servico-escolhido__texto"><strong>{escolhido.nome}</strong><small>{localDoServico(escolhido)}</small></span>
      <button id="campo-servico" type="button" className="servico-escolhido__trocar" onClick={trocar}>Trocar</button>
    </div>
  )
  return (
    <div className="servico-busca">
      <input
        ref={entrada} id="campo-servico" className={'entrada ' + classeEntrada} required={obrigatorio} value={valor}
        placeholder={escrevendo ? exemplo : 'Busque pelo nome, sigla ou cidade'} autoComplete="off"
        role="combobox" aria-expanded={aberta} aria-controls={ID_LISTA} aria-autocomplete="list"
        aria-activedescendant={aberta ? `${ID_LISTA}-${ativo}` : undefined}
        onFocus={abrir} onClick={abrir} onBlur={() => definirAberta(false)} onKeyDown={tecla}
        onChange={(e) => { aoMudar(e.target.value); if (!escrevendo) { definirAberta(true); definirAtivo(0) } }}
      />
      {aberta && (
        <ul id={ID_LISTA} className="servico-busca__lista" role="listbox" aria-label="Serviços">
          {/* Clique sem tirar o foco do campo (onMouseDown), para o onBlur não fechar antes. */}
          <li id={`${ID_LISTA}-0`} role="option" aria-selected={ativo === 0} className="servico-busca__opcao servico-busca__opcao--escrever" onMouseDown={(e) => { e.preventDefault(); escolher(0) }}>
            <Icone nome="lapis" tamanho={16} />
            <span>{valor.trim() ? <>Escrever o nome: usar <strong>“{valor.trim()}”</strong></> : 'Escrever o nome do meu serviço'}</span>
          </li>
          {achados.map((s, i) => (
            <li key={s.nome} id={`${ID_LISTA}-${i + 1}`} role="option" aria-selected={ativo === i + 1} className="servico-busca__opcao" onMouseDown={(e) => { e.preventDefault(); escolher(i + 1) }}>
              <span className="servico-busca__nome">{s.nome}</span>
              <small>{localDoServico(s)}</small>
            </li>
          ))}
          {!achados.length && <li className="servico-busca__vazio" role="presentation">Nenhum serviço da lista com esse nome. Escreva o nome completo, com a cidade.</li>}
        </ul>
      )}
      {!aberta && escrevendo && <button type="button" className="servico-busca__ver" onMouseDown={(e) => e.preventDefault()} onClick={() => { definirEscrevendo(false); definirAberta(true); definirAtivo(0); entrada.current?.focus() }}>Ver a lista de serviços</button>}
      {sugestao && sugestao !== valor && (
        <p className="servico-busca__sugestao" role="status">
          Você quis dizer <button type="button" onClick={() => { aoMudar(sugestao); definirEscrevendo(false) }}>{sugestao}</button>?
        </p>
      )}
    </div>
  )
}

/**
 * Onde a pessoa estuda ou trabalha.
 *
 * Com `aoMudarLocais`, quem já não é estudante pode listar outros lugares: o
 * ortopedista marca "Trabalho em vários locais" (e pode deixar o principal em
 * branco, como antes), o residente marca que também trabalha em outros serviços.
 * Sem `aoMudarLocais`, o campo é o de sempre (um serviço, ou "vários" para ortopedista).
 */
export function CampoServico({ situacao, valor, aoMudar, locais = [], aoMudarLocais, obrigatorio = false, classeEntrada = '', extra, uf }: {
  situacao: string; valor: string; aoMudar: (v: string) => void
  /** Estado da pessoa: os serviços dele aparecem primeiro na lista. */
  uf?: string
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
          : <EscolherServico valor={valor === SERVICO_VARIOS ? '' : valor} aoMudar={aoMudar} exemplo={exemplo} obrigatorio={obrigatorio} classeEntrada={classeEntrada} uf={uf} />)}
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
      <EscolherServico valor={principal} aoMudar={mudarPrincipal} exemplo={exemplo} obrigatorio={obrigatorio && !varios} classeEntrada={classeEntrada} uf={uf} />
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
