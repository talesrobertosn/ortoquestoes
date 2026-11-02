import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { usarContadoresAdmin } from '../../componentes/admin/contadores'
import { contaDeTeste } from '../../componentes/admin/contasTeste'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { usarLidos } from '../../componentes/admin/lidos'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, type EventoPagamento } from '../../componentes/admin/pagamentos'
import { indexarSinais, type SinalUsuario } from '../../componentes/admin/sinais'
import { CINCO_MIN, usarRpc, type Consulta } from '../../componentes/admin/usarRpc'
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
}

const MIGRACAO = '202609290100_painel_admin.sql'
/** Partes que mostram a lista de pessoas (ou abrem fichas a partir dela). */
const COM_USUARIOS: Parte[] = ['comando', 'agora', 'pendencias', 'usuarios', 'crescimento', 'retencao', 'perfis', 'cartas', 'assinaturas', 'cobrancas', 'pagamentos']
const COM_COBRANCAS: Parte[] = ['comando', 'agora', 'financeiro', 'previsao', 'cobrancas']
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
  /** Sem as contas de teste do dono: é o que entra em qualquer número. */
  reais: LinhaAssinatura[] | null
  testes: number
  usuarios: LinhaUsuario[] | null
  usuariosReais: LinhaUsuario[] | null
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
  const resumoQ = usarRpc<ResumoAdmin[]>(conta, 'resumo_admin', {}, { atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined })
  const contadoresQ = usarContadoresAdmin(conta)
  const semContadores = !!contadoresQ.erro || !!contadoresQ.dados?.derivado
  const usuariosQ = usarRpc<LinhaUsuario[]>(conta, 'listar_usuarios_admin', {}, {
    ativo: COM_USUARIOS.includes(parte) || semContadores, atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined, prazoMs: 20_000,
  })
  const cobrancasQ = usarRpc<CobrancaReal[]>(conta, 'cobrancas_admin', {}, { ativo: COM_COBRANCAS.includes(parte) })
  const sinaisQ = usarRpc<SinalUsuario[]>(conta, 'sinais_usuarios_admin', {}, { ativo: COM_USUARIOS.includes(parte), atualizarCada: AO_VIVO.includes(parte) ? CINCO_MIN : undefined })
  const lidosPagamento = usarLidos('pagamento')

  // "Online" é refeito a cada 10 s pelo último sinal, sem esperar o servidor.
  const [tique, definirTique] = useState(() => Date.now())
  useEffect(() => { const t = window.setInterval(() => definirTique(Date.now()), 10_000); return () => window.clearInterval(t) }, [])
  const usuarios = useMemo(() => usuariosQ.dados?.map(u => ({ ...u, online: estaOnline(u, Math.max(tique, usuariosQ.atualizadoEm ?? 0)) })) ?? null, [usuariosQ.dados, usuariosQ.atualizadoEm, tique])
  const usuariosReais = useMemo(() => usuarios?.filter(u => !contaDeTeste({ nome: u.nome, usuario: u.email })) ?? null, [usuarios])
  const assinaturas = assinaturasQ.dados ?? null
  const reais = useMemo(() => assinaturas?.filter(a => !contaDeTeste(a)) ?? null, [assinaturas])
  const sinais = useMemo(() => indexarSinais(Array.isArray(sinaisQ.dados) ? sinaisQ.dados : []), [sinaisQ.dados])
  const eventos = eventosQ.dados ?? null

  // Pendências: a RPC leve dá o número; com a triagem aberta vale o que ela acabou de contar (o mais recente ganha).
  const [aoVivo, definirAoVivo] = useState<{ valor: number; em: number } | null>(null)
  const registrarPendencias = useCallback((valor: number) => definirAoVivo({ valor, em: Date.now() }), [])
  const pendenciasConteudo = aoVivo && aoVivo.em >= (contadoresQ.atualizadoEm ?? 0) ? aoVivo.valor : contadoresQ.dados?.conteudo ?? null
  const errosPagamento = eventos?.filter(e => e.status_processamento === 'erro' && !lidosPagamento.lidos.has(String(e.id))).length ?? 0

  const cobrancasCarregando = cobrancasQ.dados === undefined && !cobrancasQ.erro
  const avisoCobrancas = !cobrancasQ.erro ? null : funcaoAusente(cobrancasQ.erro)
    ? `As cobranças gravadas no banco ainda não estão disponíveis (falta colar no Supabase a ${PARTE_COBRANCAS}). Os valores abaixo saem do preço dos planos e aparecem como reconstruídos.`
    : `As cobranças gravadas não carregaram (código ${codigoDaFalha(cobrancasQ.erro)}). Os valores abaixo saem do preço dos planos e aparecem como reconstruídos.`

  const { recarregar: r1 } = assinaturasQ, { recarregar: r2 } = eventosQ, { recarregar: r3 } = resumoQ, { recarregar: r4 } = usuariosQ
  const { recarregar: r5 } = contadoresQ, { recarregar: r6 } = cobrancasQ, { recarregar: r7 } = sinaisQ
  const atualizar = useCallback(async () => { await Promise.all([r1(), r2(), r3(), r4(), r5(), r6(), r7()]) }, [r1, r2, r3, r4, r5, r6, r7])
  const falha = resumoQ.erro ?? usuariosQ.erro

  const valor: DadosPainel = {
    conta, parte, assinaturasQ, eventosQ, resumoQ, usuariosQ, cobrancasQ, sinaisQ,
    assinaturas, reais, testes: (assinaturas?.length ?? 0) - (reais?.length ?? 0), usuarios, usuariosReais, sinais, eventos,
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
