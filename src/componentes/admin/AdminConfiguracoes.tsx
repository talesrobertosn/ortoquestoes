import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { dataHora, erroDoPainel } from './formatos'
import { AdminRecursosPagos } from './AdminRecursosPagos'
import { confirmar } from '../Confirmar'

interface ConfigComercial { paywall_ativo: boolean; limite_diario_gratis: number; pagamentos_ativos: boolean; atualizado_em: string }
interface Aviso { id: number; texto: string; link: string | null; rotulo_link: string | null; tom: 'info' | 'destaque' | 'alerta'; ativo: boolean; fim: string | null; criado_em: string }

const MIGRACAO = '202609290200_painel_admin_2.sql'
const TOM: Record<Aviso['tom'], string> = { destaque: 'Verde (novidade)', info: 'Neutro', alerta: 'Amarelo (atenção)' }

/**
 * Painel › Operações › Ajustes: recursos do plano pago, limite gratuito e pagamentos, aviso no
 * topo do site. Os simulados foram para Operações › Simulados e os e-mails automáticos para
 * Operações › Lembretes e e-mails (AdminEmails).
 */
export function AdminConfiguracoes() {
  const [comercial, definirComercial] = useState<ConfigComercial | null>(null)
  const [rascunho, definirRascunho] = useState<ConfigComercial | null>(null)
  const [avisos, definirAvisos] = useState<Aviso[] | null>(null)
  const [erro, definirErro] = useState('')
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })
  const definirMensagem = (texto: string) => definirRecado({ texto, erro: false })
  const definirFalha = (texto: string) => definirRecado({ texto, erro: true })
  const [novo, definirNovo] = useState({ texto: '', link: '', rotulo: '', tom: 'destaque' as Aviso['tom'], dias: '7' })

  const carregar = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        chamarRpc<ConfigComercial[]>('obter_config_comercial_admin', {}), chamarRpc<Aviso[]>('listar_avisos_admin', {}),
      ])
      definirComercial(c[0] ?? null); definirRascunho(c[0] ?? null); definirAvisos(a); definirErro('')
    } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function salvarComercial() {
    if (!rascunho || !comercial) return
    const mudancas: string[] = []
    if (rascunho.paywall_ativo !== comercial.paywall_ativo) mudancas.push(rascunho.paywall_ativo ? 'LIGAR o limite diário gratuito' : 'DESLIGAR o limite diário gratuito')
    if (rascunho.limite_diario_gratis !== comercial.limite_diario_gratis) mudancas.push(`mudar o limite para ${rascunho.limite_diario_gratis} questões por dia`)
    if (rascunho.pagamentos_ativos !== comercial.pagamentos_ativos) mudancas.push(rascunho.pagamentos_ativos ? 'LIGAR os pagamentos' : 'DESLIGAR os pagamentos')
    if (!mudancas.length) return
    if (!(await confirmar({ titulo: 'Vale na hora para todos os usuários', texto: `- ${mudancas.join('\n- ')}`, sim: 'Salvar e aplicar' }))) return
    try {
      await chamarRpc('definir_config_comercial_admin', { p_paywall_ativo: rascunho.paywall_ativo, p_limite: rascunho.limite_diario_gratis, p_pagamentos_ativos: rascunho.pagamentos_ativos })
      definirMensagem('Configuração comercial salva.'); await carregar()
    } catch { definirFalha('Não foi possível salvar a configuração comercial.') }
  }

  async function publicarAviso() {
    if (novo.texto.trim().length < 3) return
    const fim = novo.dias === 'sem' ? null : new Date(Date.now() + Number(novo.dias) * 86_400_000).toISOString()
    try {
      await chamarRpc('salvar_aviso_admin', { p_texto: novo.texto.trim(), p_link: novo.link.trim() || null, p_rotulo_link: novo.rotulo.trim() || null, p_tom: novo.tom, p_fim: fim })
      definirNovo({ texto: '', link: '', rotulo: '', tom: 'destaque', dias: '7' }); definirMensagem('Aviso publicado: já aparece no topo do site.'); await carregar()
    } catch { definirFalha('Não foi possível publicar o aviso. O link precisa começar com https:// ou #/.') }
  }
  async function encerrarAviso() {
    try { await chamarRpc('encerrar_aviso_admin', {}); definirMensagem('Aviso retirado do site.'); await carregar() } catch { definirFalha('Não foi possível retirar o aviso.') }
  }

  if (erro) return <section className="adm-secao"><p role="alert" className="adm-alerta">{erro}</p></section>
  if (!rascunho || !avisos) return <section className="adm-secao"><p role="status">Carregando…</p></section>
  const ativo = avisos.find(a => a.ativo)

  return <div className="empilha-2">
    {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (mensagem.erro ? ' adm-mensagem--erro' : '')}>{mensagem.texto}</p>}

    <AdminRecursosPagos />

    <section className="empilha adm-secao" aria-labelledby="adm-titulo-comercial">
      <div><h2 id="adm-titulo-comercial">Limite gratuito e pagamentos</h2><p>Vale na hora para todo mundo. Última mudança em {dataHora(comercial?.atualizado_em)}.</p></div>
      <label className="ct-interruptor"><input type="checkbox" checked={rascunho.paywall_ativo} onChange={e => definirRascunho({ ...rascunho, paywall_ativo: e.target.checked })} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span><strong>Limite diário gratuito ligado</strong><br /><small>Desligado, todo mundo responde sem limite (como hoje, na fase gratuita).</small></span></label>
      <label className="campo adm-campo-curto">Questões grátis a cada 24 h<input className="entrada" type="number" min={0} max={10000} value={rascunho.limite_diario_gratis} onChange={e => definirRascunho({ ...rascunho, limite_diario_gratis: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })} /></label>
      <label className="ct-interruptor"><input type="checkbox" checked={rascunho.pagamentos_ativos} onChange={e => definirRascunho({ ...rascunho, pagamentos_ativos: e.target.checked })} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span><strong>Pagamentos ligados</strong><br /><small>Controle do banco. O checkout também depende dos segredos da Function criar-checkout.</small></span></label>
      <div className="linha">
        <button type="button" className="botao botao--principal" onClick={() => void salvarComercial()} disabled={JSON.stringify(rascunho) === JSON.stringify(comercial)}>Salvar</button>
        <button type="button" className="botao botao--fantasma" onClick={() => definirRascunho(comercial)} disabled={JSON.stringify(rascunho) === JSON.stringify(comercial)}>Desfazer</button>
      </div>
    </section>

    <section className="empilha adm-secao" aria-labelledby="adm-titulo-aviso">
      <div><h2 id="adm-titulo-aviso">Aviso no topo do site</h2><p>Uma faixa para todos, com ou sem conta. Quem fecha não vê mais aquele aviso; um aviso novo substitui o anterior.</p></div>
      {ativo ? <div className={`aviso-site aviso-site--${ativo.tom} adm-aviso-previa`}>
        <div className="aviso-site__interno"><p>{ativo.texto}{ativo.link && <> <a href={ativo.link}>{ativo.rotulo_link || 'Saiba mais'}</a></>}</p></div>
      </div> : <p className="adm-vazio">Nenhum aviso no ar agora.</p>}
      {ativo && <p className="adm-nota">No ar desde {dataHora(ativo.criado_em)}{ativo.fim ? `, sai sozinho em ${dataHora(ativo.fim)}` : ', sem data para sair'}. <button type="button" className="adm-link" onClick={() => void encerrarAviso()}>Tirar do ar agora</button></p>}
      <label className="campo">Texto do aviso <span className="meta">({novo.texto.length}/240)</span><textarea className="entrada" rows={2} maxLength={240} value={novo.texto} onChange={e => definirNovo({ ...novo, texto: e.target.value })} placeholder="Ex.: Simulado TEOT 2027 disponível. Treine no formato da prova." /></label>
      <div className="adm-busca adm-busca--tres">
        <label className="campo">Link (opcional)<input className="entrada" value={novo.link} onChange={e => definirNovo({ ...novo, link: e.target.value })} placeholder="#/treinar ou https://…" /></label>
        <label className="campo">Texto do link<input className="entrada" maxLength={40} value={novo.rotulo} onChange={e => definirNovo({ ...novo, rotulo: e.target.value })} placeholder="Ver agora" /></label>
        <label className="campo">Cor<select className="entrada" value={novo.tom} onChange={e => definirNovo({ ...novo, tom: e.target.value as Aviso['tom'] })}>{Object.entries(TOM).map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></label>
      </div>
      <label className="campo adm-campo-curto">Fica no ar por<select className="entrada" value={novo.dias} onChange={e => definirNovo({ ...novo, dias: e.target.value })}>
        <option value="1">1 dia</option><option value="3">3 dias</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="sem">Até eu tirar</option>
      </select></label>
      <div className="linha"><button type="button" className="botao botao--principal" disabled={novo.texto.trim().length < 3} onClick={() => void publicarAviso()}>Publicar aviso</button></div>
    </section>

  </div>
}
