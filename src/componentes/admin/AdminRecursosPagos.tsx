import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { atualizarPremium } from '../../conta/premium'
import { erroDoPainel } from './formatos'
import { confirmar } from '../Confirmar'

const MIGRACAO = '202609300100_recursos_pagos.sql'

/**
 * Painel › Ajustes: quem tem acesso aos recursos do plano pago.
 * O Simulado Nacional e o de véspera foram para Conteúdo › Simulados (AdminSimulados) e o
 * relatório mensal para E-mails › Enviar e-mails (AdminRelatorioMensal).
 */
export function AdminRecursosPagos() {
  const [exclusivos, definirExclusivos] = useState<boolean | null>(null)
  const [erro, definirErro] = useState('')
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })

  const carregar = useCallback(async () => {
    try {
      const c = await chamarRpc<Array<{ recursos_exclusivos: boolean }>>('obter_config_premium_admin', {})
      definirExclusivos(c[0]?.recursos_exclusivos ?? true); definirErro('')
    } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function trocarExclusivos(valor: boolean) {
    if (!(await confirmar(valor ? { titulo: 'Deixar os recursos do plano pago só para assinantes?', texto: 'Vale na hora.', sim: 'Só para assinantes' } : { titulo: 'Liberar os recursos do plano pago para TODAS as contas?', texto: 'Promoção: vale na hora, para todo mundo.', sim: 'Liberar para todos' }))) return
    try { await chamarRpc('definir_config_premium_admin', { p_exclusivos: valor }); definirExclusivos(valor); atualizarPremium(); definirRecado({ texto: valor ? 'Recursos pagos só para assinantes.' : 'Recursos pagos liberados para todos.', erro: false }) }
    catch { definirRecado({ texto: 'Não foi possível salvar.', erro: true }) }
  }

  if (erro) return <section className="adm-secao"><h2>Recursos do plano pago</h2><p role="alert" className="adm-alerta">{erro}</p></section>
  if (exclusivos === null) return <section className="adm-secao"><p role="status">Carregando os recursos do plano pago…</p></section>

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-pagos">
    <div><h2 id="adm-titulo-pagos">Recursos do plano pago</h2><p>Como a turma respondeu, Simulado Nacional, cronograma, temas que mais caem, liga da residência e relatório mensal.</p></div>
    {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (mensagem.erro ? ' adm-mensagem--erro' : '')}>{mensagem.texto}</p>}
    <label className="ct-interruptor"><input type="checkbox" checked={exclusivos} onChange={(e) => void trocarExclusivos(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span><strong>Só para assinantes</strong><br /><small>Desligado, libera tudo para todas as contas (útil numa promoção). O relatório mensal continua só para quem tem plano, cortesia ou é administrador.</small></span></label>
  </section>
}
