import { contaDeTeste } from '../../componentes/admin/contasTeste'
import {
  AREAS, acertoCitavel, anterioresDosDados, escolherTipo, fatosDe, gerarCarta, perfilDosDados, sementeDe,
  type Carta, type DadosCartaBanco, type TipoCarta,
} from '../../../supabase/functions/_shared/cartas'

export interface LinhaBanco { id_usuario: string; dados: DadosCartaBanco; bloqueio: string | null }
export interface Pronta {
  id: string; nome: string; email: string; dados: DadosCartaBanco; carta: Carta; motivo: string
  acerto: number | null; melhorArea: string | null; grupo: 'assinantes' | 'gratuitos'
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
    const tipo: TipoCarta | undefined = semConvite ? (acertoCitavel(perfil) === null ? 'comecando' : 'ativo') : undefined
    if (escolha.bloqueio && !semConvite) continue
    let carta: Carta
    try { carta = gerarCarta(perfil, { tipo, semente: sementeDe(`${l.id_usuario}:${agora.toISOString().slice(0, 10)}`), anteriores, site: opcoes.site, hoje: agora }) } catch { continue }
    const motivo = semConvite ? `${escolha.motivo} Sem aceite de novidades, então vai a carta de incentivo, sem convite.` : escolha.motivo
    const melhor = fatosDe(perfil, agora).melhorArea
    saida.push({
      id: l.id_usuario, nome: d.nome ?? d.email.split('@')[0], email: d.email, dados: d, carta, motivo,
      acerto: acertoCitavel(perfil), melhorArea: melhor ? `${AREAS[melhor.slug]?.em ?? melhor.slug} (${melhor.pct}%)` : null,
      grupo: d.assinante ? 'assinantes' : 'gratuitos',
    })
  }
  return saida
}

