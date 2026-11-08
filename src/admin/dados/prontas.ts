import { contaDeTeste } from '../../componentes/admin/contasTeste'
import {
  AREAS, acertoCitavel, anterioresDosDados, escolherTipo, fatosDe, gerarCarta, perfilDosDados, sementeDe,
  type Carta, type DadosCartaBanco, type TipoCarta,
} from '../../../supabase/functions/_shared/cartas'
import { avaliarRisco, type Nivel } from './risco'

export interface LinhaBanco { id_usuario: string; dados: DadosCartaBanco; bloqueio: string | null }
export interface Pronta {
  id: string; nome: string; email: string; dados: DadosCartaBanco; carta: Carta; motivo: string
  acerto: number | null; melhorArea: string | null; grupo: 'assinantes' | 'gratuitos'
  /** Risco de parar (só assinantes), para a lista mostrar. */
  risco: Nivel | null
}

/**
 * Para cada pessoa, a carta que combina com a situação dela, já escrita pelo motor de cartas (o mesmo do
 * padrão aprovado: acerto, melhor área, convite para continuar, "Um abraço, Tales"). Nada sai sozinho:
 * o administrador lê, ajusta se quiser e clica em enviar. O servidor confere todas as travas de novo.
 */
export function montarProntas(linhas: readonly LinhaBanco[], opcoes: { admins?: ReadonlySet<string>; agora?: Date; site?: string; limiteGratisLigado?: boolean } = {}): Pronta[] {
  const agora = opcoes.agora ?? new Date()
  const saida: Pronta[] = []
  for (const l of linhas) {
    const d = l.dados
    if (l.bloqueio || !d.email || d.administrador || !d.confirmado || d.quer_cartas === false) continue
    if (opcoes.admins?.has(l.id_usuario) || contaDeTeste({ nome: d.nome, usuario: d.email })) continue
    const perfil = perfilDosDados(d, opcoes.limiteGratisLigado ?? false), anteriores = anterioresDosDados(d)
    const escolha = escolherTipo(perfil, anteriores, agora)
    // Convite só para quem aceitou novidades (Termos 17.5.3); sem o aceite, a carta de incentivo pela faixa de acerto.
    const semConvite = escolha.tipo.startsWith('convite') && !d.novidades
    // Assinante em risco de parar (detector do painel): "Como estão os estudos?", salvo as cartas de momento
    // (agradecimento, marco, reta final) e quem já recebeu essa carta nos últimos 30 dias.
    const risco = d.assinante ? avaliarRisco({
      ultimaAtividade: d.ultima_atividade ?? null, criadoEm: d.criado_em ?? agora.toISOString(),
      respondidas: Number(d.respondidas ?? 0), respondidas7d: Number(d.semana ?? 0),
      fimSemRenovar: d.renova_sozinho ? null : d.fim_acesso ?? null,
    }, undefined, agora.getTime()) : null
    const recebeuComoEstao = anteriores.some(e => (e.modelo ?? '').split(':')[0] === 'como_estao' && e.status !== 'falhou' && agora.getTime() - new Date(e.em).getTime() < 30 * 86_400_000)
    const emRisco = !!risco && risco.nivel !== 'baixo' && Number(d.respondidas ?? 0) > 0 && !recebeuComoEstao
      && !['marco', 'reta_final'].includes(escolha.tipo)
    const tipo: TipoCarta | undefined = emRisco ? 'como_estao' : semConvite ? (acertoCitavel(perfil) === null ? 'comecando' : 'ativo') : undefined
    if (escolha.bloqueio && !semConvite && !emRisco) continue
    let carta: Carta
    try { carta = gerarCarta(perfil, { tipo, semente: sementeDe(`${l.id_usuario}:${agora.toISOString().slice(0, 10)}`), anteriores, site: opcoes.site, hoje: agora }) } catch { continue }
    const motivo = emRisco ? `Risco ${risco!.nivel} de parar: ${risco!.motivos.join('; ')}.` : semConvite ? `${escolha.motivo} Sem aceite de novidades, então vai a carta de incentivo, sem convite.` : escolha.motivo
    const melhor = fatosDe(perfil, agora).melhorArea
    saida.push({
      id: l.id_usuario, nome: d.nome ?? d.email.split('@')[0], email: d.email, dados: d, carta, motivo,
      acerto: acertoCitavel(perfil), melhorArea: melhor ? `${AREAS[melhor.slug]?.em ?? melhor.slug} (${melhor.pct}%)` : null,
      grupo: d.assinante ? 'assinantes' : 'gratuitos', risco: risco?.nivel ?? null,
    })
  }
  return saida
}

