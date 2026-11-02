import { useMemo } from 'react'
import { ROTULO_SEVERIDADE, filaDeAtencao, type ItemAtencao, type Severidade } from '../dados/metricas'
import { usarPainel } from '../dados/painel'
import { novoParado } from '../dados/pessoas'
import { usarNav } from '../nav'
import type { FiltroPessoas, GrupoAssinatura, Parte, VistaTriagem } from '../rotas'
import { haQuanto, inteiro } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { Situacao } from '../ui/kit'
import { avisoRapido } from '../ui/sobreposicoes'

/** "Pede ação": a fila de atenção da página inicial (falhas, pagamentos, conteúdo, acompanhamento). */
const TOM: Record<Severidade, 'erro' | 'aviso' | 'neutro' | 'ok'> = { critica: 'erro', alta: 'aviso', media: 'neutro', oportunidade: 'ok' }

export function usarFila() {
  const p = usarPainel()
  const fontes = [
    ...(p.eventosQ.erro && !p.eventos ? ['avisos do processador'] : []),
    ...(p.usuariosQ.erro && !p.usuariosQ.dados ? ['lista de pessoas'] : []),
    ...(p.resumoQ.erro && !p.resumoQ.dados ? ['resumo do painel'] : []),
  ]
  const parados = useMemo(() => p.usuarios ? p.usuarios.filter(u => novoParado(u)) : null, [p.usuarios])
  return useMemo(() => filaDeAtencao({ eventos: p.eventos, lidosPagamento: p.lidosPagamento.lidos, assinaturas: p.reais, pendenciasConteudo: p.pendenciasConteudo, novosParados: parados, fontesIndisponiveis: fontes }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.eventos, p.lidosPagamento.lidos, p.reais, p.pendenciasConteudo, parados, fontes.join('|')])
}

export function useIrDestino() {
  const { ir } = usarNav()
  const p = usarPainel()
  return (item: ItemAtencao) => item.acao === 'Tentar de novo' ? void p.atualizar() : ir(item.destino.aba as Parte, { ...(item.destino.filtro ? { filtro: item.destino.filtro as FiltroPessoas } : {}), ...(item.destino.vista ? { vista: item.destino.vista as VistaTriagem } : {}), ...(item.destino.grupo ? { grupo: item.destino.grupo as GrupoAssinatura } : {}) })
}

export function LinhaFila({ item, aoAgir, detalhado = false }: { item: ItemAtencao; aoAgir: (i: ItemAtencao) => void; detalhado?: boolean }) {
  return <li className={`a3-fila__item a3-fila__item--${item.severidade}`}>
    <span className="a3-fila__marca" aria-hidden="true" />
    <div className="a3-fila__texto">
      <span className="a3-fila__titulo"><b className="num">{inteiro(item.contagem)}</b> {item.titulo}</span>
      {detalhado && <span className="a3-fila__causa">{item.causa}</span>}
      <span className="a3-fila__meta"><Situacao tom={TOM[item.severidade]}>{ROTULO_SEVERIDADE[item.severidade]}</Situacao>{item.ultimoEm && <span>· último {haQuanto(item.ultimoEm)}</span>}</span>
    </div>
    <span className="a3-fila__botoes">
      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => aoAgir(item)}>{item.acao}</button>
      {item.resolver?.length ? <Resolver chaves={item.resolver} /> : null}
    </span>
  </li>
}

/** "Resolvido": tira o alerta de pagamento da fila em qualquer aparelho. Desfazer volta com ele. */
function Resolver({ chaves }: { chaves: string[] }) {
  const p = usarPainel()
  const marcar = () => {
    p.lidosPagamento.marcar(chaves)
    avisoRapido(chaves.length === 1 ? 'Marcado como resolvido.' : `${chaves.length} marcados como resolvidos.`, 'ok', { rotulo: 'Desfazer', aoClicar: () => p.lidosPagamento.marcar(chaves, false) })
  }
  return <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={marcar}><Icone nome="certo" tamanho={14} />Resolvido</button>
}
