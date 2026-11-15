import { useMemo, useState } from 'react'
import { ROTULO_SEVERIDADE, filaDeAtencao, type ItemAtencao, type Severidade } from '../dados/metricas'
import { usarPainel } from '../dados/painel'
import { novoParado } from '../dados/pessoas'
import { pertoDoLimite, type UsoSupabase } from '../dados/usoSupabase'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { usarNav } from '../nav'
import type { FiltroPessoas, GrupoAssinatura, Parte, VistaTriagem } from '../rotas'
import { haQuanto, inteiro } from '../ui/formato'
import { Icone } from '../ui/Icone'
import { Situacao } from '../ui/kit'
import { chamarRpc } from '../../servicos/supabase'
import { aplicarLidosLocais, type TipoLido } from '../../componentes/admin/lidos'
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
  // Uso do Supabase: só entra na fila a partir de 80% de algum limite. Sem a função no banco, fica de fora calado.
  // Com a página aberta, mede de novo a cada 30 minutos (o uso muda devagar).
  const usoQ = usarRpc<UsoSupabase>(p.conta, 'uso_supabase_admin', {}, { validadeMs: 30 * 60_000, atualizarCada: 30 * 60_000 })
  const uso = usoQ.dados && typeof usoQ.dados === 'object' ? usoQ.dados : null
  const perto = useMemo(() => pertoDoLimite(uso).map(m => ({ id: m.id, nome: m.nome, pct: m.pct ?? 0 })), [uso])
  return useMemo(() => filaDeAtencao({ eventos: p.eventos, lidosPagamento: p.lidosPagamento.lidos, assinaturas: p.reais, pendenciasConteudo: p.pendenciasConteudo, novosParados: parados, fontesIndisponiveis: fontes, usoSupabase: perto }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.eventos, p.lidosPagamento.lidos, p.reais, p.pendenciasConteudo, parados, fontes.join('|'), perto])
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
      <span className="a3-fila__titulo"><b className="num">{inteiro(item.contagem)}{item.titulo.startsWith('%') ? '%' : ''}</b> {item.titulo.replace(/^%\s*/, '')}</span>
      {detalhado && <span className="a3-fila__causa">{item.causa}</span>}
      <span className="a3-fila__meta"><Situacao tom={TOM[item.severidade]}>{ROTULO_SEVERIDADE[item.severidade]}</Situacao>{item.ultimoEm && <span>· último {haQuanto(item.ultimoEm)}</span>}</span>
    </div>
    <span className="a3-fila__botoes">
      <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => aoAgir(item)}>{item.acao}</button>
      {item.resolver?.length ? <Resolver chaves={item.resolver} /> : null}
      {item.id === 'conteudo' && <LerConteudo />}
    </span>
  </li>
}

/** "Resolvido": tira o alerta de pagamento da fila em qualquer aparelho. Desfazer volta com ele. */
function Resolver({ chaves }: { chaves: string[] }) {
  const p = usarPainel()
  const [ocupado, definirOcupado] = useState(false)
  const marcar = async () => {
    definirOcupado(true)
    const salvo = await p.lidosPagamento.marcar(chaves)
    definirOcupado(false)
    if (!salvo) { avisoRapido('Aviso ocultado neste navegador. Não foi possível sincronizar; tente novamente com a conexão ativa.', 'info'); return }
    avisoRapido(chaves.length === 1 ? 'Marcado como resolvido.' : `${chaves.length} marcados como resolvidos.`, 'ok', { rotulo: 'Desfazer', aoClicar: () => p.lidosPagamento.marcar(chaves, false) })
  }
  return <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={ocupado} onClick={() => void marcar()}><Icone nome="certo" tamanho={14} />Resolvido</button>
}

/** Ler tira o aviso; não afirma que o relato foi corrigido nem muda sua triagem. */
function LerConteudo() {
  const [ocupado, definirOcupado] = useState(false)
  const ler = async () => {
    definirOcupado(true)
    try {
      const lidos = await chamarRpc<Array<{ tipo: TipoLido; chave: string }>>('ler_alertas_conteudo_admin', {})
      for (const tipo of ['avaliacao', 'relato'] as const) aplicarLidosLocais(tipo, lidos.filter(x => x.tipo === tipo).map(x => x.chave), true, true)
      avisoRapido('Avisos marcados como lidos. Os itens continuam na triagem.', 'ok', { rotulo: 'Desfazer', aoClicar: () => {
        void Promise.all((['avaliacao', 'relato'] as const).map(async tipo => {
          const chaves = lidos.filter(x => x.tipo === tipo).map(x => x.chave)
          if (!chaves.length) return
          await chamarRpc('marcar_lidos_admin', { p_tipo: tipo, p_chaves: chaves, p_lido: false })
          aplicarLidosLocais(tipo, chaves, false, true)
        })).catch(() => avisoRapido('Não foi possível desfazer. Tente pela triagem.', 'info'))
      } })
    } catch { avisoRapido('Não foi possível marcar como lido. Nenhum aviso foi removido.', 'info') }
    finally { definirOcupado(false) }
  }
  return <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" disabled={ocupado} onClick={() => void ler()}><Icone nome="certo" tamanho={14} />{ocupado ? 'Salvando…' : 'Já li estes avisos'}</button>
}
