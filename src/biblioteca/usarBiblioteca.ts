import { useCallback, useMemo } from 'react'
import { usarArmazenado } from '../estado/usarArmazenado'
import { usarConta } from '../conta/ContextoConta'
import { gerarId } from '../util/id'
import type { Ancora } from './ancoras'
import { CHAVE_BIBLIOTECA, ITEM_PREF, PREFERENCIAS_PADRAO, itemLeitura, itemMarca, type CorMarca, type DocBiblioteca, type Leitura, type Marca, type Preferencias } from './tipos'

/**
 * Os dados da pessoa na Biblioteca. Ficam na chave `biblioteca` (um mapa item → documento), que a
 * sincronização da conta envia item a item para o servidor (progresso_usuario, tipo 'biblioteca').
 * Nunca se apaga uma marcação de verdade: ela vira lápide (`apagadaEm`), para a exclusão chegar aos
 * outros aparelhos.
 */
export function usarBiblioteca() {
  const [mapa, definir] = usarArmazenado<Record<string, DocBiblioteca>>(CHAVE_BIBLIOTECA, {})
  const dados = mapa && typeof mapa === 'object' ? mapa : {}

  const marcas = useMemo(() => Object.values(dados).filter((d): d is Marca => d?.tipo === 'marca' && !d.apagadaEm), [dados])
  const leituras = useMemo(() => Object.fromEntries(Object.values(dados).filter((d): d is Leitura => d?.tipo === 'leitura').map((l) => [l.capitulo, l])), [dados])
  const preferencias: Preferencias = useMemo(() => {
    const p = dados[ITEM_PREF]
    return p?.tipo === 'pref' ? { ...PREFERENCIAS_PADRAO, ...p } : PREFERENCIAS_PADRAO
  }, [dados])

  const gravarItem = useCallback((item: string, doc: DocBiblioteca) => definir((atual) => ({ ...(atual ?? {}), [item]: doc })), [definir])

  const criarMarca = useCallback((capitulo: string, ancora: Ancora, cor: CorMarca, extra: Partial<Marca> = {}): Marca => {
    const agora = Date.now()
    const marca: Marca = { tipo: 'marca', id: gerarId(), capitulo, ancora, cor, nota: '', criadaEm: agora, editadaEm: agora, ...extra }
    gravarItem(itemMarca(marca.id), marca)
    return marca
  }, [gravarItem])

  const editarMarca = useCallback((id: string, mudanca: Partial<Pick<Marca, 'cor' | 'nota' | 'favorita' | 'ancora' | 'notasDeOutroAparelho'>>) => {
    definir((atual) => {
      const m = atual?.[itemMarca(id)]
      if (!m || m.tipo !== 'marca') return atual
      const nova: Marca = { ...m, ...mudanca, editadaEm: Date.now() }
      if (mudanca.notasDeOutroAparelho && !mudanca.notasDeOutroAparelho.length) delete nova.notasDeOutroAparelho
      return { ...atual, [itemMarca(id)]: nova }
    })
  }, [definir])

  const apagarMarca = useCallback((id: string) => {
    definir((atual) => {
      const m = atual?.[itemMarca(id)]
      if (!m || m.tipo !== 'marca') return atual
      return { ...atual, [itemMarca(id)]: { ...m, apagadaEm: Date.now() } }
    })
  }, [definir])

  const restaurarMarca = useCallback((id: string) => {
    definir((atual) => {
      const m = atual?.[itemMarca(id)]
      if (!m || m.tipo !== 'marca') return atual
      const { apagadaEm: _a, ...resto } = m
      return { ...atual, [itemMarca(id)]: { ...resto, editadaEm: Date.now() } }
    })
  }, [definir])

  const salvarLeitura = useCallback((capitulo: string, mudanca: Partial<Omit<Leitura, 'tipo' | 'capitulo'>>) => {
    definir((atual) => {
      const antes = atual?.[itemLeitura(capitulo)]
      const base: Leitura = antes?.tipo === 'leitura' ? antes : { tipo: 'leitura', capitulo, bloco: '', deslocamento: 0, progresso: 0, em: 0 }
      const nova: Leitura = { ...base, ...mudanca, progresso: Math.max(base.progresso, mudanca.progresso ?? 0), em: Date.now() }
      if (JSON.stringify({ ...nova, em: 0 }) === JSON.stringify({ ...base, em: 0 })) return atual
      return { ...atual, [itemLeitura(capitulo)]: nova }
    })
  }, [definir])

  const definirPreferencias = useCallback((mudanca: Partial<Omit<Preferencias, 'tipo' | 'em'>>) => {
    definir((atual) => {
      const p = atual?.[ITEM_PREF]
      const base = p?.tipo === 'pref' ? { ...PREFERENCIAS_PADRAO, ...p } : PREFERENCIAS_PADRAO
      return { ...atual, [ITEM_PREF]: { ...base, ...mudanca, em: Date.now() } }
    })
  }, [definir])

  return { marcas, leituras, preferencias, criarMarca, editarMarca, apagarMarca, restaurarMarca, salvarLeitura, definirPreferencias, todas: dados }
}

export type EstadoSalvamento = 'salvando' | 'salvo' | 'pendente' | 'falha' | 'visitante'

/**
 * O que mostrar no canto do leitor. "Salvo" só quando o servidor confirmou tudo o que é da
 * Biblioteca (nenhum item dela na fila). Sem conexão, "alterações locais pendentes".
 */
export function usarEstadoSalvamento(): { estado: EstadoSalvamento; texto: string; detalhe?: string } {
  const { sessao, status } = usarConta()
  if (!sessao) return { estado: 'visitante', texto: 'Entre na conta para salvar', detalhe: 'Sem conta, as marcações valem só até fechar a página.' }
  const pendentes = status.pendentesPorTipo?.biblioteca ?? 0
  if (status.semServidor?.includes('biblioteca')) return { estado: 'falha', texto: 'Falha na sincronização', detalhe: 'O servidor ainda não aceita as marcações dos resumos. Elas estão guardadas neste aparelho e sobem sozinhas quando ele for atualizado.' }
  if (pendentes > 0 && (status.estado === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine))) return { estado: 'pendente', texto: 'Alterações locais pendentes', detalhe: 'Sem conexão. Elas ficam neste aparelho e sobem quando a internet voltar.' }
  if (pendentes > 0 && status.estado === 'erro') return { estado: 'falha', texto: 'Falha na sincronização', detalhe: status.detalhe ?? 'Tentando de novo sozinho.' }
  if (pendentes > 0 || !status.pronto) return { estado: 'salvando', texto: 'Salvando…' }
  return { estado: 'salvo', texto: 'Salvo na conta' }
}
