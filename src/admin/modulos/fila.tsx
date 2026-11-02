import { useMemo } from 'react'
import { ROTULO_SEVERIDADE, filaDeAtencao, type ItemAtencao, type Severidade } from '../dados/metricas'
import { usarPainel } from '../dados/painel'
import { novoParado } from '../dados/pessoas'
import { usarNav } from '../nav'
import type { FiltroPessoas, Parte, VistaTriagem } from '../rotas'
import { haQuanto, inteiro } from '../ui/formato'
import { Situacao } from '../ui/kit'

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
  return (item: ItemAtencao) => item.acao === 'Tentar de novo' ? void p.atualizar() : ir(item.destino.aba as Parte, { ...(item.destino.filtro ? { filtro: item.destino.filtro as FiltroPessoas } : {}), ...(item.destino.vista ? { vista: item.destino.vista as VistaTriagem } : {}) })
}

export function LinhaFila({ item, aoAgir, detalhado = false }: { item: ItemAtencao; aoAgir: (i: ItemAtencao) => void; detalhado?: boolean }) {
  return <li className={`a3-fila__item a3-fila__item--${item.severidade}`}>
    <span className="a3-fila__marca" aria-hidden="true" />
    <div className="a3-fila__texto">
      <span className="a3-fila__titulo"><b className="num">{inteiro(item.contagem)}</b> {item.titulo}</span>
      {detalhado && <span className="a3-fila__causa">{item.causa}</span>}
      <span className="a3-fila__meta"><Situacao tom={TOM[item.severidade]}>{ROTULO_SEVERIDADE[item.severidade]}</Situacao>{item.ultimoEm && <span>· último {haQuanto(item.ultimoEm)}</span>}</span>
    </div>
    <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => aoAgir(item)}>{item.acao}</button>
  </li>
}
