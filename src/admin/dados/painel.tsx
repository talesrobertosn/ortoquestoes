import type { ResumoAcesso } from '../../conta/resumoAcesso'
import { pagamentosResolvidos } from './metricas'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { usarContadoresAdmin } from '../../componentes/admin/contadores'
import { contaDeTeste, foraDosNumeros } from '../../componentes/admin/contasTeste'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { EVENTO_LIDOS_ADMIN, usarLidos } from '../../componentes/admin/lidos'
import { PLANO_CORTESIA } from '../../componentes/admin/rotulos'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, type EventoPagamento } from '../../componentes/admin/pagamentos'
import { indexarSinais, type SinalUsuario, type VisitaIndicacao } from '../../componentes/admin/sinais'
import { CINCO_MIN, recarregarConsultasAtivas, rpcInexistente, usarRpc, type Consulta } from '../../componentes/admin/usarRpc'
import type { AssinaturaBase, CobrancaReal } from '../../componentes/admin/receita'
import type { Parte } from '../rotas'
import { estaOnline, type LinhaUsuario, type ResumoAdmin } from './pessoas'

/** Uma linha de `listar_assinaturas_admin` (os campos opcionais chegaram em migrações sucessivas). */
export interface LinhaAssinatura extends AssinaturaBase {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
  nome?: string | null
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  cancelada_em?: string | null
  meio?: string | null
  /** Compra feita numa conta de administrador (parte 40): aparece com o selo "Admin" e fica fora dos números. */
  administrador?: boolean | null
}

const MIGRACAO = '202609290100_painel_admin.sql'
/** Partes que mostram a lista de pessoas (ou abrem fichas a partir dela). */
const COM_USUARIOS: Parte[] = ['comando', 'agora', 'pendencias', 'usuarios', 'financeiro', 'crescimento', 'metas', 'cartas', 'assinaturas', 'cobrancas', 'pagamentos']
const COM_COBRANCAS: Parte[] = ['comando', 'agora', 'financeiro', 'metas', 'cobrancas', 'crescimento', 'assinaturas']
/** Intervalo da lista de pessoas nas telas ao vivo. */
const AO_VIVO: Parte[] = ['comando', 'agora', 'usuarios']

export interface DadosPainel {
  conta: string | undefined
  parte: Parte
  assinaturasQ: Consulta<LinhaAssinatura[]>
  eventosQ: Consulta<EventoPagamento[]>
  resumoQ: Consulta<ResumoAdmin[]>
  usuariosQ: Consulta<LinhaUsuario[]>
  cobrancasQ: Consulta<CobrancaReal[]>
  sinaisQ: Consulta<SinalUsuario[]>
  /** Todas as assinaturas (inclusive as de teste, para a lista completa). */
  assinaturas: LinhaAssinatura[] | null
  /** Sem as contas de teste do dono nem as compras de administrador: é o que entra em qualquer número. */
  reais: LinhaAssinatura[] | null
  testes: number
  usuarios: LinhaUsuario[] | null
  usuariosReais: LinhaUsuario[] | null
  /** Contas marcadas fora do público-alvo (id → motivo). */
  foraPublico: Map<string, string | null>
  foraPublicoSemSql: boolean
  foraPublicoErro: unknown
  foraPublicoCarregando: boolean
  recarregarForaPublico: () => Promise<void>
  sinais: Map<string, SinalUsuario>
  eventos: EventoPagamento[] | null
  resumo: ResumoAdmin | null
  /** Cobranças gravadas; null enquanto carrega ou se a RPC falhou (ver `avisoCobrancas`). */
  cobrancas: CobrancaReal[] | null
  cobrancasCarregando: boolean
  avisoCobrancas: string | null
  online: number | null
  totalContas: number | null
  pendenciasConteudo: number | null
  registrarPendencias: (n: number) => void
  errosPagamento: number
  lidosPagamento: ReturnType<typeof usarLidos>
  /** Erro de acesso (não é administrador, sessão vencida, migração faltando). */
  erroAcesso: string
  erroDados: string
  atualizando: boolean
  atualizadoEm: number | null
  atualizar: () => Promise<void>
}

const Contexto = createContext<DadosPainel | null>(null)
export const usarPainel = () => { const c = useContext(Contexto); if (!c) throw new Error('usarPainel fora do painel'); return c }

export function ProvedorPainel({ parte, children }: { parte: Parte; children: ReactNode }) {
  const { sessao } = usarConta()
  const conta = sessao?.user.id
  const assinaturasQ = usarRpc<LinhaAssinatura[]>(conta, 'listar_assinaturas_admin')
  const eventosQ = usarRpc<EventoPagamento[]>(conta, 'listar_eventos_pagamento_admin')
  const decisoesPagamentoQ = usarRpc<Array<{ id_evento: number; decisao: string }>>(conta, 'listar_decisoes_eventos_admin', {}, { ativo: !!eventosQ.dados?.some(e => e.status_processamento === 'erro') })
  const decisoesPagamento = useMemo(() => { const m = new Map<number,string>(); for (const d of decisoesPagamentoQ.dados ?? []) if (!m.has(d.id_evento)) m.set(d.id_evento,d.decisao); return m }, [decisoesPagamentoQ.dados])
  const resumoQ = usarRpc<ResumoAdmin[]>(conta, 'resumo_admin', {}, { atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined })
  const contadoresQ = usarContadoresAdmin(conta)
  useEffect(() => {
    const aoLer = (e: Event) => {
      const d = (e as CustomEvent<{ tipo: string; persistido: boolean }>).detail
      if (d?.persistido && d.tipo !== 'pagamento') void contadoresQ.recarregar()
    }
    window.addEventListener(EVENTO_LIDOS_ADMIN, aoLer)
    return () => window.removeEventListener(EVENTO_LIDOS_ADMIN, aoLer)
  }, [contadoresQ.recarregar])
  const semContadores = !!contadoresQ.erro || !!contadoresQ.dados?.derivado
  const usuariosQ = usarRpc<LinhaUsuario[]>(conta, 'listar_usuarios_admin', {}, {
    // Tudo a cada 5 minutos (Tales, 11/11/2026: "atualização sempre a cada 5 minutos, sem sobrecarregar o Supabase").
    // A lista de pessoas é a leitura mais pesada do painel. "Online" é refeito a cada 10 s pelo último sinal, sem
    // ir ao banco, e o botão Atualizar busca na hora.
    ativo: COM_USUARIOS.includes(parte) || semContadores, atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined, validadeMs: CINCO_MIN, prazoMs: 20_000,
  })
  const acessosQ = usarRpc<Array<{id_usuario:string;resumo:ResumoAcesso}>>(conta,'listar_resumos_acesso_admin',{}, {ativo:COM_USUARIOS.includes(parte)||semContadores,atualizarCada:CINCO_MIN})
  const acessos = useMemo(()=>new Map((acessosQ.dados??[]).map(l=>[l.id_usuario,l.resumo])),[acessosQ.dados])
  const cobrancasQ = usarRpc<CobrancaReal[]>(conta, 'cobrancas_admin', {}, { ativo: COM_COBRANCAS.includes(parte) })
  const sinaisQ = usarRpc<SinalUsuario[]>(conta, 'sinais_usuarios_admin', {}, { ativo: COM_USUARIOS.includes(parte), atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined })
  const indicacoesQ = usarRpc<VisitaIndicacao[]>(conta, 'visitas_indicacao_admin', {}, { ativo: COM_USUARIOS.includes(parte), atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined })
  const lidosPagamentoBase = usarLidos('pagamento')
  const lidosPagamento = useMemo(() => ({ ...lidosPagamentoBase, lidos: pagamentosResolvidos(lidosPagamentoBase.lidos, decisoesPagamento) }), [lidosPagamentoBase.lidos, lidosPagamentoBase.marcar, decisoesPagamento])
  // Cortesias valendo (parte 37): no painel contam como assinantes, com o selo "Cortesia" (Tales, 02/11/2026).
  // Sem a parte colada, a consulta falha e ninguém vira cortesia (o painel segue como antes). Com a parte 40 a lista
  // traz também os administradores (tipo 'administrador'), que não contam como assinantes.
  const cortesiasQ = usarRpc<Array<{ id_usuario: string; tipo?: string | null }>>(conta, 'listar_cortesias_admin', {}, { ativo: COM_USUARIOS.includes(parte) || semContadores, atualizarCada: CINCO_MIN })
  // Uso do Supabase: a mesma consulta da fila (Agora) e da tela Ajustes › Uso do Supabase; aqui só para o botão
  // Atualizar buscar de novo também. Parada nas outras telas.
  const usoSupabaseQ = usarRpc<unknown>(conta, 'uso_supabase_admin', {}, { ativo: parte === 'comando' || parte === 'supabase', validadeMs: 30 * 60_000 })
  // Fora do público-alvo (Tales, 05/11/2026): a conta continua registrada e na receita, mas sai dos números de
  // aquisição, ativação, retenção e conversão (usuariosReais). Sem o SQL, a lista vem vazia e nada muda.
  const foraQ = usarRpc<Array<{ id_usuario: string; motivo: string | null; marcado_em: string }>>(conta, 'listar_fora_publico_admin', {}, { ativo: COM_USUARIOS.includes(parte) || semContadores, atualizarCada: CINCO_MIN })
  const foraPublico = useMemo(() => new Map((Array.isArray(foraQ.dados) ? foraQ.dados : []).map(f => [f.id_usuario, f.motivo])), [foraQ.dados])
  const cortesias = useMemo(() => new Set(Array.isArray(cortesiasQ.dados) ? cortesiasQ.dados.filter(c => c.tipo !== 'administrador').map(c => c.id_usuario) : []), [cortesiasQ.dados])

  // "Online" é refeito a cada 10 s pelo último sinal, sem esperar o servidor.
  const [tique, definirTique] = useState(() => Date.now())
  useEffect(() => { const t = window.setInterval(() => definirTique(Date.now()), 10_000); return () => window.clearInterval(t) }, [])
  // Administrador aparece em tudo, mas como não assinante, com o acesso "Cortesia de administrador" (Tales, 03/11/2026):
  // uma compra de teste na conta dele não o faz contar como assinante.
  const usuarios = useMemo(() => usuariosQ.dados?.map(u => ({ ...u, acesso_resumo:acessos.get(u.id_usuario), plano_vigente: u.administrador ? null : u.plano_vigente ?? (cortesias.has(u.id_usuario) ? PLANO_CORTESIA : null), online: estaOnline(u, Math.max(tique, usuariosQ.atualizadoEm ?? 0)) })) ?? null, [usuariosQ.dados, usuariosQ.atualizadoEm, tique, cortesias, acessos])
  const usuariosReais = useMemo(() => usuarios?.filter(u => !u.administrador && !contaDeTeste({ nome: u.nome, usuario: u.email }) && !foraPublico.has(u.id_usuario)) ?? null, [usuarios, foraPublico])
  const assinaturas = assinaturasQ.dados ?? null
  const reais = useMemo(() => assinaturas?.filter(a => !foraDosNumeros(a)) ?? null, [assinaturas])
  const sinais = useMemo(() => indexarSinais(Array.isArray(sinaisQ.dados) ? sinaisQ.dados : [], Array.isArray(indicacoesQ.dados) ? indicacoesQ.dados : []), [sinaisQ.dados, indicacoesQ.dados])
  const eventos = eventosQ.dados ?? null

  // Pendências: a RPC leve dá o número; com a triagem aberta vale o que ela acabou de contar (o mais recente ganha).
  const [aoVivo, definirAoVivo] = useState<{ valor: number; em: number } | null>(null)
  const registrarPendencias = useCallback((valor: number) => definirAoVivo({ valor, em: Date.now() }), [])
  const pendenciasConteudo = aoVivo && aoVivo.em >= (contadoresQ.atualizadoEm ?? 0) ? aoVivo.valor : contadoresQ.dados?.conteudo ?? null
  const errosPagamento = eventos?.filter(e => e.status_processamento === 'erro' && !['conciliado','ignorado'].includes(decisoesPagamento.get(e.id) ?? '') && !lidosPagamento.lidos.has(String(e.id))).length ?? 0

  const cobrancasCarregando = cobrancasQ.dados === undefined && !cobrancasQ.erro
  const avisoCobrancas = !cobrancasQ.erro ? null : funcaoAusente(cobrancasQ.erro)
    ? `As cobranças gravadas no banco ainda não estão disponíveis (falta colar no Supabase a ${PARTE_COBRANCAS}). Os valores abaixo saem do preço dos planos e aparecem como estimados.`
    : `As cobranças gravadas não carregaram (código ${codigoDaFalha(cobrancasQ.erro)}). Os valores abaixo saem do preço dos planos e aparecem como estimados.`

  const { recarregar: r1 } = assinaturasQ, { recarregar: r2 } = eventosQ, { recarregar: r3 } = resumoQ, { recarregar: r4 } = usuariosQ
  const { recarregar: r5 } = contadoresQ, { recarregar: r6 } = cobrancasQ, { recarregar: r7 } = sinaisQ, { recarregar: r8 } = cortesiasQ, { recarregar: r9 } = usoSupabaseQ, { recarregar: r10 } = foraQ
  const atualizar = useCallback(async () => { await Promise.all([recarregarConsultasAtivas(conta), r1(), r2(), r3(), r4(), r5(), r6(), r7(), r8(), r9(), r10(), acessosQ.recarregar()]) }, [conta, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, acessosQ.recarregar])
  const falha = resumoQ.erro ?? usuariosQ.erro

  const valor: DadosPainel = {
    conta, parte, assinaturasQ, eventosQ, resumoQ, usuariosQ, cobrancasQ, sinaisQ,
    assinaturas, reais, testes: (assinaturas?.length ?? 0) - (reais?.length ?? 0), usuarios, usuariosReais, sinais, eventos,
    foraPublico, foraPublicoSemSql: rpcInexistente(foraQ.erro), foraPublicoErro: foraQ.erro, foraPublicoCarregando: foraQ.carregando, recarregarForaPublico: r10,
    resumo: resumoQ.dados?.[0] ?? null,
    cobrancas: cobrancasQ.erro ? null : cobrancasQ.dados ?? null, cobrancasCarregando, avisoCobrancas,
    online: usuarios ? usuarios.filter(u => u.online).length : contadoresQ.dados?.online ?? resumoQ.dados?.[0]?.online_agora ?? null,
    totalContas: contadoresQ.dados?.usuarios ?? usuarios?.length ?? resumoQ.dados?.[0]?.usuarios ?? null,
    pendenciasConteudo, registrarPendencias, errosPagamento, lidosPagamento,
    erroAcesso: assinaturasQ.erro ? erroDoPainel(assinaturasQ.erro, MIGRACAO) : '',
    erroDados: falha ? erroDoPainel(falha, MIGRACAO) : '',
    atualizando: assinaturasQ.carregando || eventosQ.carregando || resumoQ.carregando || usuariosQ.carregando || contadoresQ.carregando || cobrancasQ.carregando,
    atualizadoEm: assinaturasQ.atualizadoEm,
    atualizar,
  }
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
