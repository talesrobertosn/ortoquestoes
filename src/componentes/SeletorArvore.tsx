import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { NoAssunto } from '../dados/acervo'
import { normalizar } from '../dados/acervo'
import { Icone } from './Icone'

interface Props {
  arvore: NoAssunto[]
  temas: string[]
  subtemas: string[]
  porTema: Record<string, number>
  porSubtema: Record<string, number>
  aoMudar: (temas: string[], subtemas: string[]) => void
  /** 'menu' abre num painel flutuante; 'lista' fica sempre aberta na página. */
  variante?: 'menu' | 'lista'
}

const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
/** Ordem alfabética, com os "Outros temas..." sempre no fim. */
function ordenar(nomes: string[]): string[] {
  const resto = (s: string) => /^outr[ao]s? /i.test(s)
  return [...nomes].sort((a, b) => Number(resto(a)) - Number(resto(b)) || colacao.compare(a, b))
}

/**
 * Filtro de assunto em árvore: cada tema numa linha (seta para abrir e caixa
 * para marcar o tema inteiro) e os subtemas em lista, em ordem alfabética,
 * logo abaixo. A busca filtra a árvore e os escolhidos aparecem como
 * etiquetas no topo. Marcar um tema quer dizer "o tema inteiro"; marcar
 * subtemas quer dizer "só estes". As duas seleções se somam.
 */
export function SeletorArvore({
  arvore,
  temas,
  subtemas,
  porTema,
  porSubtema,
  aoMudar,
  variante = 'menu',
}: Props) {
  const lista = variante === 'lista'
  const [aberto, definirAberto] = useState(lista)
  const [busca, definirBusca] = useState('')
  const [abertos, definirAbertos] = useState<string[]>(['ombro-cotovelo'])
  const caixa = useRef<HTMLDivElement>(null)
  const idBusca = useId()

  useEffect(() => {
    if (!aberto || lista) return
    function foraDaCaixa(evento: MouseEvent) {
      if (caixa.current && !caixa.current.contains(evento.target as Node)) definirAberto(false)
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') definirAberto(false)
    }
    document.addEventListener('mousedown', foraDaCaixa)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto, lista])

  const ordenada = useMemo(() => arvore.map((no) => ({ ...no, subtemas: ordenar(no.subtemas) })), [arvore])

  const filtrada = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return ordenada
    return ordenada
      .map((no) => {
        const temaBate = normalizar(no.nome).includes(termo)
        const filhos = temaBate ? no.subtemas : no.subtemas.filter((s) => normalizar(s).includes(termo))
        return temaBate || filhos.length > 0 ? { ...no, subtemas: filhos } : null
      })
      .filter((no): no is NoAssunto => no !== null)
  }, [ordenada, busca])

  const total = temas.length + subtemas.length
  const nomeTema = (slug: string) => arvore.find((n) => n.slug === slug)?.nome ?? slug
  const resumo = total === 0 ? 'Todos os assuntos' : total === 1 ? (temas[0] ? nomeTema(temas[0]) : subtemas[0]) : `${total} assuntos selecionados`

  function alternarTema(no: NoAssunto) {
    if (temas.includes(no.slug)) aoMudar(temas.filter((t) => t !== no.slug), subtemas)
    // Ao marcar o tema inteiro, as marcações de subtema dele saem de cena.
    else aoMudar([...temas, no.slug], subtemas.filter((s) => !no.subtemas.includes(s)))
  }

  function alternarSubtema(no: NoAssunto, nome: string) {
    if (temas.includes(no.slug)) {
      // Tema inteiro marcado: desmarcar um subtema vira "todos os outros deste tema".
      aoMudar(temas.filter((t) => t !== no.slug), [...subtemas, ...no.subtemas.filter((s) => s !== nome && !subtemas.includes(s))])
      return
    }
    aoMudar(temas, subtemas.includes(nome) ? subtemas.filter((s) => s !== nome) : [...subtemas, nome])
  }

  const buscando = busca.trim().length > 0
  const alternarAberto = (slug: string) => definirAbertos((a) => (a.includes(slug) ? a.filter((s) => s !== slug) : [...a, slug]))

  return (
    <div className={'seletor arv' + (lista ? ' seletor--lista' : '')} ref={caixa}>
      {!lista && (
        <button type="button" className="seletor__gatilho" aria-expanded={aberto} aria-haspopup="true" onClick={() => definirAberto((a) => !a)}>
          <span className={'seletor__resumo' + (total === 0 ? ' seletor__resumo--vazio' : '')}>{resumo}</span>
          <Icone nome={aberto ? 'cima' : 'baixo'} tamanho={18} />
        </button>
      )}

      {aberto && (
        <div className="arv__caixa">
          <div className="arv__topo">
            {temas.map((slug) => (
              <button key={'t' + slug} type="button" className="arv__etiqueta" onClick={() => aoMudar(temas.filter((t) => t !== slug), subtemas)} aria-label={`Remover ${nomeTema(slug)}`}>
                {nomeTema(slug)} <span aria-hidden="true">×</span>
              </button>
            ))}
            {subtemas.map((s) => (
              <button key={'s' + s} type="button" className="arv__etiqueta" onClick={() => aoMudar(temas, subtemas.filter((x) => x !== s))} aria-label={`Remover ${s}`}>
                {s} <span aria-hidden="true">×</span>
              </button>
            ))}
            <label className="so-leitor" htmlFor={idBusca}>Buscar assunto</label>
            <input
              id={idBusca}
              className="arv__busca"
              type="search"
              placeholder="Buscar assunto"
              value={busca}
              onChange={(e) => definirBusca(e.target.value)}
              autoFocus={!lista}
            />
          </div>

          <ul className="arv__lista" role="tree" aria-label="Assuntos">
            {filtrada.length === 0 && <li className="arv__vazio">Nenhum assunto com esse nome. Apague a busca para ver a lista inteira.</li>}
            {filtrada.map((no) => {
              const expandido = buscando || abertos.includes(no.slug)
              const marcado = temas.includes(no.slug)
              const marcadosAqui = no.subtemas.filter((s) => subtemas.includes(s)).length
              const parcial = !marcado && marcadosAqui > 0
              return (
                <li key={no.slug} role="treeitem" aria-expanded={no.subtemas.length ? expandido : undefined} className={'arv__tema' + (marcado || parcial ? ' arv__tema--ativo' : '')}>
                  <div className="arv__linha arv__linha--tema">
                    {no.subtemas.length > 0
                      ? <button type="button" className="arv__seta" aria-label={expandido ? `Fechar ${no.nome}` : `Abrir ${no.nome}`} onClick={() => alternarAberto(no.slug)}>
                          <Icone nome={expandido ? 'baixo' : 'direita'} tamanho={16} />
                        </button>
                      : <span className="arv__seta" />}
                    <label className="arv__rotulo">
                      <input type="checkbox" checked={marcado} ref={(el) => { if (el) el.indeterminate = parcial }} onChange={() => alternarTema(no)} />
                      <span className="arv__nome">{no.nome}</span>
                      {parcial && <span className="arv__parcial">{marcadosAqui} de {no.subtemas.length}</span>}
                      <span className="arv__qtd">{(porTema[no.slug] ?? 0).toLocaleString('pt-BR')}</span>
                    </label>
                  </div>
                  {expandido && no.subtemas.length > 0 && (
                    <ul className="arv__subtemas" role="group">
                      {no.subtemas.map((sub) => {
                        const ativo = marcado || subtemas.includes(sub)
                        const n = porSubtema[sub] ?? 0
                        return (
                          <li key={sub} role="treeitem" className={'arv__linha arv__linha--sub' + (n === 0 ? ' arv__linha--vazia' : '')}>
                            <label className="arv__rotulo">
                              <input type="checkbox" checked={ativo} onChange={() => alternarSubtema(no, sub)} />
                              <span className="arv__nome">{sub}</span>
                              <span className="arv__qtd">{n.toLocaleString('pt-BR')}</span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="arv__rodape">
            <span className="meta">{total === 0 ? 'Sem marcar nenhum, a sessão usa todos os assuntos.' : `${total} selecionado${total > 1 ? 's' : ''}`}</span>
            <button type="button" className="botao botao--fantasma" onClick={() => aoMudar([], [])} disabled={total === 0}>Limpar</button>
            {!lista && <button type="button" className="botao botao--principal" onClick={() => definirAberto(false)}>Pronto</button>}
          </div>
        </div>
      )}
    </div>
  )
}
