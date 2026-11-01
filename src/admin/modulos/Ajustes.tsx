import { useCallback, useEffect, useState } from 'react'
import { atualizarPremium } from '../../conta/premium'
import { chamarRpc } from '../../servicos/supabase'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { dataHora } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Interruptor, Painel, Selo } from '../ui/kit'
import { avisoRapido, confirmar } from '../ui/sobreposicoes'

interface ConfigComercial { paywall_ativo: boolean; limite_diario_gratis: number; pagamentos_ativos: boolean; atualizado_em: string }

/**
 * Configurações › Ajustes: recursos do plano pago, limite gratuito e pagamentos. Tudo vale na hora para todos,
 * então cada mudança mostra o antes e o depois e pede confirmação; nada é salvo sozinho.
 */
export default function Ajustes() {
  const parte = defParte('ajustes')
  const [comercial, definirComercial] = useState<ConfigComercial | null>(null)
  const [rascunho, definirRascunho] = useState<ConfigComercial | null>(null)
  const [exclusivos, definirExclusivos] = useState<boolean | null>(null)
  const [erro, definirErro] = useState('')
  const [erroPremium, definirErroPremium] = useState('')
  const [salvando, definirSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try { const c = await chamarRpc<ConfigComercial[]>('obter_config_comercial_admin', {}); definirComercial(c[0] ?? null); definirRascunho(c[0] ?? null); definirErro('') }
    catch (f) { definirErro(erroDoPainel(f, '202609290200_painel_admin_2.sql')) }
    try { const c = await chamarRpc<Array<{ recursos_exclusivos: boolean }>>('obter_config_premium_admin', {}); definirExclusivos(c[0]?.recursos_exclusivos ?? true); definirErroPremium('') }
    catch (f) { definirErroPremium(erroDoPainel(f, '202609300100_recursos_pagos.sql')) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function trocarExclusivos(valor: boolean) {
    if (!(await confirmar(valor
      ? { titulo: 'Deixar os recursos do plano pago só para assinantes?', texto: 'Vale na hora para todas as contas.', sim: 'Só para assinantes' }
      : { titulo: 'Liberar os recursos do plano pago para todas as contas?', texto: 'Promoção: vale na hora, para todo mundo, até você desligar.', sim: 'Liberar para todos', perigo: true }))) return
    try { await chamarRpc('definir_config_premium_admin', { p_exclusivos: valor }); definirExclusivos(valor); atualizarPremium(); avisoRapido(valor ? 'Recursos pagos só para assinantes.' : 'Recursos pagos liberados para todos.') }
    catch { avisoRapido('Não foi possível salvar. Nada mudou.', 'erro') }
  }

  const mudancas: string[] = []
  if (rascunho && comercial) {
    if (rascunho.paywall_ativo !== comercial.paywall_ativo) mudancas.push(rascunho.paywall_ativo ? 'Ligar o limite diário gratuito' : 'Desligar o limite diário gratuito')
    if (rascunho.limite_diario_gratis !== comercial.limite_diario_gratis) mudancas.push(`Limite de ${comercial.limite_diario_gratis} para ${rascunho.limite_diario_gratis} questões por dia`)
    if (rascunho.pagamentos_ativos !== comercial.pagamentos_ativos) mudancas.push(rascunho.pagamentos_ativos ? 'Ligar os pagamentos' : 'Desligar os pagamentos')
  }
  async function salvar() {
    if (!rascunho || !mudancas.length) return
    if (!(await confirmar({ titulo: 'Vale na hora para todos os usuários', texto: <ul className="a3-lista-nomes">{mudancas.map(m => <li key={m}>{m}</li>)}</ul>, sim: 'Salvar e aplicar', perigo: !rascunho.pagamentos_ativos }))) return
    definirSalvando(true)
    try {
      await chamarRpc('definir_config_comercial_admin', { p_paywall_ativo: rascunho.paywall_ativo, p_limite: rascunho.limite_diario_gratis, p_pagamentos_ativos: rascunho.pagamentos_ativos })
      avisoRapido('Configuração comercial salva.'); await carregar()
    } catch { avisoRapido('Não foi possível salvar a configuração comercial. Nada mudou.', 'erro') } finally { definirSalvando(false) }
  }

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Configurações" titulo={parte.rotulo} pergunta={`${parte.pergunta} Tudo aqui vale na hora para todo mundo.`} />
    {erro && <Faixa tom="erro" titulo="A configuração comercial não carregou">{erro}</Faixa>}
    <div className="a3-grade a3-grade--2" style={{ alignItems: 'start' }}>
      <Painel titulo="Limite gratuito e pagamentos" descricao={comercial ? `Última mudança em ${dataHora(comercial.atualizado_em)}.` : undefined}>
        {!rascunho ? (erro ? <Estado compacto tipo="erro" titulo="Indisponível" /> : <Carregando linhas={3} />) : <div className="a3-pilha">
          <div className="a3-chave-estado">
            <Interruptor marcado={rascunho.paywall_ativo} aoMudar={v => definirRascunho({ ...rascunho, paywall_ativo: v })} titulo="Limite diário gratuito" descricao="Desligado, todo mundo responde sem limite (fase gratuita)." />
            <Selo tom={comercial!.paywall_ativo ? 'ok' : undefined} contorno={!comercial!.paywall_ativo}>{comercial!.paywall_ativo ? 'ligado agora' : 'desligado agora'}</Selo>
          </div>
          <label className="a3-campo" style={{ maxWidth: 240 }}><span>Questões grátis a cada 24 h</span>
            <input className="a3-entrada num" type="number" min={0} max={10000} value={rascunho.limite_diario_gratis} onChange={e => definirRascunho({ ...rascunho, limite_diario_gratis: Math.max(0, Math.min(10000, Number(e.target.value) || 0)) })} /></label>
          <div className="a3-chave-estado">
            <Interruptor marcado={rascunho.pagamentos_ativos} aoMudar={v => definirRascunho({ ...rascunho, pagamentos_ativos: v })} titulo="Pagamentos" descricao="Controle do banco. O checkout também depende dos segredos da Function criar-checkout." />
            <Selo tom={comercial!.pagamentos_ativos ? 'ok' : 'erro'}>{comercial!.pagamentos_ativos ? 'ligados agora' : 'desligados agora'}</Selo>
          </div>
          {mudancas.length > 0 && <div className="a3-diferenca" aria-live="polite"><span className="a3-rotulo">O que muda ao salvar</span><ul>{mudancas.map(m => <li key={m}><Icone nome="seta" tamanho={13} />{m}</li>)}</ul></div>}
          <div className="a3-acoes-linha">
            <button type="button" className="a3-botao" disabled={!mudancas.length || salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Revisar e salvar'}</button>
            <button type="button" className="a3-botao a3-botao--fantasma" disabled={!mudancas.length} onClick={() => definirRascunho(comercial)}>Desfazer</button>
          </div>
        </div>}
      </Painel>
      <Painel titulo="Recursos do plano pago" descricao="Como a turma respondeu, Simulado Nacional, cronograma, temas que mais caem, liga da residência e relatório mensal.">
        {erroPremium ? <Faixa tom="erro">{erroPremium}</Faixa> : exclusivos === null ? <Carregando linhas={2} /> : <div className="a3-pilha">
          <div className="a3-chave-estado">
            <Interruptor marcado={exclusivos} aoMudar={v => void trocarExclusivos(v)} titulo="Só para assinantes" descricao="Desligado, libera tudo para todas as contas (promoção). O relatório mensal continua só para quem tem plano, cortesia ou é administrador." />
            <Selo tom={exclusivos ? undefined : 'aviso'} contorno={exclusivos}>{exclusivos ? 'exclusivos' : 'liberados para todos'}</Selo>
          </div>
          <p className="a3-mudo a3-pequeno">Esta chave salva na hora em que você confirma.</p>
        </div>}
      </Painel>
    </div>
  </div>
}
